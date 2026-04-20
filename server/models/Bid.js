const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const Bid = sequelize.define('Bid', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  listing_id: { type: DataTypes.INTEGER, allowNull: false },
  buyer_id: { type: DataTypes.INTEGER, allowNull: false },
  quantity_requested: { type: DataTypes.DECIMAL(10, 2), allowNull: false, comment: 'Tonnes requested (fractional bidding)' },
  price_per_tonne: { type: DataTypes.BIGINT, allowNull: false, comment: 'Offered price per tonne in paise' },
  total_amount: { type: DataTypes.BIGINT, allowNull: false, comment: 'Total in paise' },
  delivery_deadline: { type: DataTypes.DATEONLY, allowNull: true },
  status: {
    type: DataTypes.ENUM('PENDING', 'ACCEPTED', 'REJECTED', 'EXPIRED', 'WITHDRAWN'),
    defaultValue: 'PENDING',
  },
  expires_at: { type: DataTypes.DATE, allowNull: true },
  notes: { type: DataTypes.TEXT, allowNull: true },
}, {
  tableName: 'bids',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
});

module.exports = Bid;
