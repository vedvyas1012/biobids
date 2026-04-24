const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const Transaction = sequelize.define('Transaction', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  order_id: { type: DataTypes.INTEGER, allowNull: false },
  escrow_transaction_id: { type: DataTypes.STRING(100), allowNull: true },
  escrow_event: { type: DataTypes.STRING(100), allowNull: true },
  amount: { type: DataTypes.BIGINT, allowNull: false, comment: 'In paise' },
  type: { type: DataTypes.ENUM('ESCROW', 'RELEASE', 'REFUND'), allowNull: false },
  status: { type: DataTypes.ENUM('PENDING', 'SUCCESS', 'FAILED'), defaultValue: 'PENDING' },
}, {
  tableName: 'transactions',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: false,
  indexes: [
    // Prevent duplicate webhook events from creating duplicate transaction rows.
    // NULL values in escrow_event/escrow_transaction_id don't violate uniqueness in MySQL.
    {
      unique: true,
      fields: ['order_id', 'escrow_transaction_id', 'escrow_event'],
      name: 'uq_transaction_order_escrow_event',
    },
  ],
});

module.exports = Transaction;
