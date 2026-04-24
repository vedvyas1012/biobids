import React from 'react';

const colorMap = {
  ACTIVE:           'badge-green',
  BIDDING:          'badge-blue',
  AWARDED:          'badge-yellow',
  AWAITING_PAYMENT: 'badge-yellow',
  PAYMENT_ESCROWED: 'badge-blue',
  IN_TRANSIT:       'badge-blue',
  DELIVERED:        'badge-yellow',
  COMPLETED:        'badge-green',
  DISPUTED:         'badge-red',
  CANCELLED:        'badge-gray',
  REFUNDED:         'badge-gray',
  PENDING:          'badge-yellow',
  ACCEPTED:         'badge-green',
  REJECTED:         'badge-red',
  EXPIRED:          'badge-gray',
};

const labelMap = {
  AWAITING_PAYMENT: 'Awaiting Payment (Escrow)',
  PAYMENT_ESCROWED: 'Payment Secured in Escrow',
  IN_TRANSIT:       'Biomass in Transit',
  DELIVERED:        'Delivered — Pending Verification',
  COMPLETED:        'Completed — Payment Released',
  DISPUTED:         'Under Dispute — Admin Review',
};

export default function StatusBadge({ status }) {
  const label = labelMap[status] || status?.replace(/_/g, ' ');
  return <span className={colorMap[status] || 'badge-gray'}>{label}</span>;
}
