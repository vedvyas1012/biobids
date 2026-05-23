const { Op } = require('sequelize');
const { Listing, ListingMedia, User, Bid } = require('../models');
const { paginate } = require('../utils/helpers');
const path = require('path');

const getListings = async (req, res) => {
  try {
    const {
      type, location_state, quantity_min, quantity_max,
      moisture_max, calorific_min, price_max, page = 1, limit = 12,
    } = req.query;

    const where = { status: ['ACTIVE', 'BIDDING'] };
    if (type) where.biomass_type = type;
    if (location_state) where.location_state = location_state;
    if (quantity_min || quantity_max) {
      where.available_quantity = {};
      if (quantity_min) where.available_quantity[Op.gte] = quantity_min;
      if (quantity_max) where.available_quantity[Op.lte] = quantity_max;
    }
    if (moisture_max) where.moisture_content = { [Op.lte]: moisture_max };
    if (calorific_min) where.calorific_value = { [Op.gte]: calorific_min };
    if (price_max) where.min_price = { [Op.lte]: price_max * 100 }; // convert rupees to paise

    const { count, rows } = await Listing.findAndCountAll({
      where,
      include: [
        { model: User, as: 'supplier', attributes: ['id', 'name', 'location_state', 'location_district'] },
        { model: ListingMedia, as: 'media', limit: 1 },
      ],
      ...paginate(page, limit),
      order: [['created_at', 'DESC']],
    });

    res.json({ listings: rows, total: count, page: parseInt(page), pages: Math.ceil(count / limit) });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const getListingById = async (req, res) => {
  try {
    const listing = await Listing.findByPk(req.params.id, {
      include: [
        { model: User, as: 'supplier', attributes: ['id', 'name', 'location_state', 'location_district'] },
        { model: ListingMedia, as: 'media' },
        {
          model: Bid, as: 'bids',
          where: { status: 'PENDING' },
          required: false,
          include: [{ model: User, as: 'buyer', attributes: ['id', 'name'] }],
          order: [['price_per_tonne', 'DESC']],
        },
        {
          model: Bid, as: 'bidHistory',
          required: false,
          include: [{ model: User, as: 'buyer', attributes: ['id'] }],
          order: [['created_at', 'DESC']],
        },
      ],
    });
    if (!listing) return res.status(404).json({ message: 'Listing not found' });
    res.json(listing);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const createListing = async (req, res) => {
  try {
    const {
      biomass_type, quantity, location_state, location_district,
      pincode, moisture_content, calorific_value, min_price,
      availability_date, description,
    } = req.body;

    const listing = await Listing.create({
      supplier_id: req.user.id,
      biomass_type, quantity,
      available_quantity: quantity,
      location_state, location_district, pincode,
      moisture_content, calorific_value,
      min_price: Math.round(min_price * 100), // store in paise
      availability_date, description,
    });

    // Handle uploaded files
    if (req.files && req.files.length > 0) {
      const mediaRecords = req.files.map((f) => ({
        listing_id: listing.id,
        file_url: `/uploads/listings/${f.filename}`,
        file_type: f.mimetype.startsWith('image') ? 'image' : 'certificate',
      }));
      await ListingMedia.bulkCreate(mediaRecords);
    }

    res.status(201).json(listing);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const updateListing = async (req, res) => {
  try {
    const listing = await Listing.findByPk(req.params.id);
    if (!listing) return res.status(404).json({ message: 'Listing not found' });
    if (listing.supplier_id !== req.user.id) return res.status(403).json({ message: 'Unauthorized' });
    if (!['ACTIVE'].includes(listing.status)) {
      return res.status(400).json({ message: 'Cannot edit a listing that is in progress' });
    }
    const allowed = ['biomass_type', 'quantity', 'location_state', 'location_district', 'pincode', 'moisture_content', 'calorific_value', 'min_price', 'availability_date', 'description'];
    const updates = {};
    allowed.forEach((k) => { if (req.body[k] !== undefined) updates[k] = req.body[k]; });
    if (updates.min_price) updates.min_price = Math.round(updates.min_price * 100);
    await listing.update(updates);
    res.json(listing);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const deleteListing = async (req, res) => {
  try {
    const listing = await Listing.findByPk(req.params.id);
    if (!listing) return res.status(404).json({ message: 'Listing not found' });
    if (listing.supplier_id !== req.user.id) return res.status(403).json({ message: 'Unauthorized' });
    if (!['ACTIVE'].includes(listing.status)) {
      return res.status(400).json({ message: 'Cannot delete an active/awarded listing' });
    }
    await listing.update({ status: 'CANCELLED' });
    res.json({ message: 'Listing cancelled' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const getMyListings = async (req, res) => {
  try {
    const listings = await Listing.findAll({
      where: { supplier_id: req.user.id },
      include: [
        { model: ListingMedia, as: 'media', limit: 1 },
        { model: Bid, as: 'bids', where: { status: 'PENDING' }, required: false },
      ],
      order: [['created_at', 'DESC']],
    });
    res.json(listings);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = { getListings, getListingById, createListing, updateListing, deleteListing, getMyListings };
