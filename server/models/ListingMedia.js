const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const ListingMedia = sequelize.define('ListingMedia', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  listing_id: { type: DataTypes.INTEGER, allowNull: false },
  file_url: { type: DataTypes.STRING(500), allowNull: false },
  file_type: { type: DataTypes.ENUM('image', 'certificate', 'document'), defaultValue: 'image' },
}, {
  tableName: 'listing_media',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: false,
});

module.exports = ListingMedia;
