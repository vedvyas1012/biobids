import React from 'react';

const statusMap = {
  ACTIVE: 'badge-green', BIDDING: 'badge-blue', AWARDED: 'badge-yellow',
  IN_TRANSIT: 'badge-blue', DELIVERED: 'badge-green', COMPLETED: 'badge-green',
  CANCELLED: 'badge-gray', DISPUTED: 'badge-red', REFUNDED: 'badge-gray',
  PENDING: 'badge-yellow', ACCEPTED: 'badge-green', REJECTED: 'badge-red',
  EXPIRED: 'badge-gray', AWAITING_PAYMENT: 'badge-yellow', PAYMENT_ESCROWED: 'badge-blue',
};

export default function StatusBadge({ status }) {
  return <span className={statusMap[status] || 'badge-gray'}>{status?.replace(/_/g, ' ')}</span>;
}
