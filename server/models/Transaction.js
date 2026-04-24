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
});

module.exports = Transaction;
