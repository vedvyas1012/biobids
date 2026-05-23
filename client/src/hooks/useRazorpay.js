import { useEffect, useRef } from 'react';

const SCRIPT_URL = 'https://checkout.razorpay.com/v1/checkout.js';

/**
 * Loads the Razorpay checkout script and returns an openCheckout function.
 * Safe to call multiple times — script is only injected once.
 */
export function useRazorpay() {
  const loadedRef = useRef(false);

  useEffect(() => {
    if (loadedRef.current || window.Razorpay) { loadedRef.current = true; return; }
    const script = document.createElement('script');
    script.src = SCRIPT_URL;
    script.async = true;
    script.onload = () => { loadedRef.current = true; };
    document.head.appendChild(script);
  }, []);

  /**
   * Opens the Razorpay payment modal.
   * Returns a Promise that resolves with payment details on success,
   * or rejects with Error('cancelled') if the user closes the modal.
   *
   * @param {object} options  - Razorpay options (key, amount, order_id, prefill, etc.)
   */
  const openCheckout = (options) =>
    new Promise((resolve, reject) => {
      if (!window.Razorpay) {
        reject(new Error('Razorpay SDK not loaded yet. Please try again.'));
        return;
      }
      const rzp = new window.Razorpay({
        ...options,
        handler:  resolve,
        modal: { ondismiss: () => reject(new Error('cancelled')) },
      });
      rzp.on('payment.failed', (response) => reject(new Error(response.error?.description || 'Payment failed')));
      rzp.open();
    });

  return { openCheckout };
}
