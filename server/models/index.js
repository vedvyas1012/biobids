const sequelize = require('../config/db');
const User = require('./User');
const Listing = require('./Listing');
const ListingMedia = require('./ListingMedia');
const Bid = require('./Bid');
const Order = require('./Order');
const Transaction = require('./Transaction');
const Dispute = require('./Dispute');
const Notification = require('./Notification');

// User associations
User.hasMany(Listing, { foreignKey: 'supplier_id', as: 'listings' });
User.hasMany(Bid, { foreignKey: 'buyer_id', as: 'bids' });
User.hasMany(Order, { foreignKey: 'supplier_id', as: 'supply_orders' });
User.hasMany(Order, { foreignKey: 'buyer_id', as: 'purchase_orders' });
User.hasMany(Notification, { foreignKey: 'user_id', as: 'notifications' });

// Listing associations
Listing.belongsTo(User, { foreignKey: 'supplier_id', as: 'supplier' });
Listing.hasMany(Bid, { foreignKey: 'listing_id', as: 'bids' });
Listing.hasMany(ListingMedia, { foreignKey: 'listing_id', as: 'media' });
Listing.hasMany(Order, { foreignKey: 'listing_id', as: 'orders' });

// Bid associations
Bid.belongsTo(User, { foreignKey: 'buyer_id', as: 'buyer' });
Bid.belongsTo(Listing, { foreignKey: 'listing_id', as: 'listing' });
Bid.hasOne(Order, { foreignKey: 'bid_id', as: 'order' });

// Order associations
Order.belongsTo(Bid, { foreignKey: 'bid_id', as: 'bid' });
Order.belongsTo(Listing, { foreignKey: 'listing_id', as: 'listing' });
Order.belongsTo(User, { foreignKey: 'supplier_id', as: 'supplier' });
Order.belongsTo(User, { foreignKey: 'buyer_id', as: 'buyer' });
Order.hasMany(Transaction, { foreignKey: 'order_id', as: 'transactions' });
Order.hasOne(Dispute, { foreignKey: 'order_id', as: 'dispute' });

// Transaction associations
Transaction.belongsTo(Order, { foreignKey: 'order_id', as: 'order' });

// Dispute associations
Dispute.belongsTo(Order, { foreignKey: 'order_id', as: 'order' });
Dispute.belongsTo(User, { foreignKey: 'raised_by', as: 'raisedBy' });
Dispute.belongsTo(User, { foreignKey: 'admin_id', as: 'admin' });

module.exports = { sequelize, User, Listing, ListingMedia, Bid, Order, Transaction, Dispute, Notification };
