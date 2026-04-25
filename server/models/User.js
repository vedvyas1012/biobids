const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const User = sequelize.define('User', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  name: { type: DataTypes.STRING(100), allowNull: false },
  email: { type: DataTypes.STRING(150), allowNull: false, unique: true },
  phone: { type: DataTypes.STRING(15), allowNull: true },
  password: { type: DataTypes.STRING(255), allowNull: false },
  role: { type: DataTypes.ENUM('supplier', 'buyer', 'admin'), allowNull: false, defaultValue: 'buyer' },
  gst_number: { type: DataTypes.STRING(20), allowNull: true },
  location_state: { type: DataTypes.STRING(100), allowNull: true },
  location_district: { type: DataTypes.STRING(100), allowNull: true },
  is_verified: { type: DataTypes.BOOLEAN, defaultValue: false },
  is_active:   { type: DataTypes.BOOLEAN, defaultValue: true },
  refresh_token: { type: DataTypes.TEXT, allowNull: true },
}, {
  tableName: 'users',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
});

module.exports = User;
