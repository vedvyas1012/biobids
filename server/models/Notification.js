const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const Notification = sequelize.define('Notification', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  user_id: { type: DataTypes.INTEGER, allowNull: false },
  title: { type: DataTypes.STRING(200), allowNull: false },
  message: { type: DataTypes.TEXT, allowNull: false },
  type: {
    type: DataTypes.ENUM('bid_received', 'bid_accepted', 'bid_rejected', 'payment_escrowed', 'order_dispatched', 'payment_released', 'dispute_raised', 'dispute_resolved', 'general'),
    defaultValue: 'general',
  },
  is_read: { type: DataTypes.BOOLEAN, defaultValue: false },
  reference_id: { type: DataTypes.INTEGER, allowNull: true, comment: 'order_id or bid_id or listing_id' },
}, {
  tableName: 'notifications',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: false,
});

module.exports = Notification;
