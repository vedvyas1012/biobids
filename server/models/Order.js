const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const Order = sequelize.define('Order', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  bid_id: { type: DataTypes.INTEGER, allowNull: false },
  listing_id: { type: DataTypes.INTEGER, allowNull: false },
  supplier_id: { type: DataTypes.INTEGER, allowNull: false },
  buyer_id: { type: DataTypes.INTEGER, allowNull: false },
  quantity: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
  total_amount: { type: DataTypes.BIGINT, allowNull: false, comment: 'In paise' },
  status: {
    type: DataTypes.ENUM('AWAITING_PAYMENT', 'PAYMENT_ESCROWED', 'IN_TRANSIT', 'DELIVERED', 'COMPLETED', 'DISPUTED', 'CANCELLED', 'REFUNDED'),
    defaultValue: 'AWAITING_PAYMENT',
  },
  escrow_transaction_id: { type: DataTypes.STRING(100), allowNull: true },
  escrow_payment_url: { type: DataTypes.STRING(500), allowNull: true },
  dispatch_date: { type: DataTypes.DATEONLY, allowNull: true },
  vehicle_number: { type: DataTypes.STRING(20), allowNull: true },
  driver_contact: { type: DataTypes.STRING(15), allowNull: true },
  estimated_delivery: { type: DataTypes.DATEONLY, allowNull: true },
  dispatch_proof_url: { type: DataTypes.STRING(500), allowNull: true },
  delivery_confirmed_at: { type: DataTypes.DATE, allowNull: true },
  auto_release_at: { type: DataTypes.DATE, allowNull: true, comment: '7 days after dispatch' },
}, {
  tableName: 'orders',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  indexes: [
    // Fast webhook lookup by escrow transaction ID
    { fields: ['escrow_transaction_id'] },
  ],
});

module.exports = Order;
