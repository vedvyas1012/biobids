const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const Listing = sequelize.define('Listing', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  supplier_id: { type: DataTypes.INTEGER, allowNull: false },
  biomass_type: {
    type: DataTypes.ENUM('rice_husk', 'sugarcane_bagasse', 'wood_chips', 'cotton_stalks', 'wheat_straw', 'corn_cobs', 'bamboo', 'other'),
    allowNull: false,
  },
  quantity: { type: DataTypes.DECIMAL(10, 2), allowNull: false, comment: 'Total quantity in tonnes' },
  available_quantity: { type: DataTypes.DECIMAL(10, 2), allowNull: false, comment: 'Remaining quantity available' },
  location_state: { type: DataTypes.STRING(100), allowNull: false },
  location_district: { type: DataTypes.STRING(100), allowNull: false },
  pincode: { type: DataTypes.STRING(10), allowNull: false },
  moisture_content: { type: DataTypes.DECIMAL(5, 2), allowNull: false, comment: 'Moisture % (lower is better)' },
  calorific_value: { type: DataTypes.DECIMAL(8, 2), allowNull: false, comment: 'kcal/kg (higher is better)' },
  min_price: { type: DataTypes.BIGINT, allowNull: false, comment: 'Minimum price per tonne in paise' },
  availability_date: { type: DataTypes.DATEONLY, allowNull: false },
  status: {
    type: DataTypes.ENUM('ACTIVE', 'BIDDING', 'AWARDED', 'IN_TRANSIT', 'DELIVERED', 'COMPLETED', 'CANCELLED'),
    defaultValue: 'ACTIVE',
  },
  description: { type: DataTypes.TEXT, allowNull: true },
}, {
  tableName: 'listings',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
});

module.exports = Listing;
