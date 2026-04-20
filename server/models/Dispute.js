const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const Dispute = sequelize.define('Dispute', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  order_id: { type: DataTypes.INTEGER, allowNull: false },
  raised_by: { type: DataTypes.INTEGER, allowNull: false },
  reason: { type: DataTypes.TEXT, allowNull: false },
  evidence_url: { type: DataTypes.STRING(500), allowNull: true },
  status: { type: DataTypes.ENUM('OPEN', 'UNDER_REVIEW', 'RESOLVED'), defaultValue: 'OPEN' },
  resolution: { type: DataTypes.TEXT, allowNull: true },
  admin_id: { type: DataTypes.INTEGER, allowNull: true },
}, {
  tableName: 'disputes',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
});

module.exports = Dispute;
