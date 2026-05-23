const { Bid, Listing, Order, User } = require('../models');
const { notifyBidReceived, notifyBidAccepted, notifyBidRejected } = require('../utils/notifications');

// io instance will be set via setIo
let io;
const setIo = (socketIo) => { io = socketIo; };

const placeBid = async (req, res) => {
  try {
    const { id: listingId } = req.params;
    const { quantity_requested, price_per_tonne, delivery_deadline, notes } = req.body;
    const buyerId = req.user.id;

    const listing = await Listing.findByPk(listingId, {
      include: [{ model: User, as: 'supplier' }],
    });
    if (!listing) return res.status(404).json({ message: 'Listing not found' });
    if (!['ACTIVE', 'BIDDING'].includes(listing.status)) {
      return res.status(400).json({ message: 'Listing is not open for bidding' });
    }
    if (listing.supplier_id === buyerId) {
      return res.status(400).json({ message: 'Cannot bid on your own listing' });
    }
    if (parseFloat(quantity_requested) > parseFloat(listing.available_quantity)) {
      return res.status(400).json({ message: `Only ${listing.available_quantity} tonnes available` });
    }

    // Check active bid limit (max 5 PENDING bids across all listings)
    const activeBidCount = await Bid.count({ where: { buyer_id: buyerId, status: 'PENDING' } });

    // Check if buyer already has a PENDING bid on this listing
    const existingBid = await Bid.findOne({ where: { listing_id: listingId, buyer_id: buyerId, status: 'PENDING' } });
    if (!existingBid && activeBidCount >= 5) {
      return res.status(400).json({ message: 'You can have maximum 5 active bids at a time. Please wait for existing bids to be resolved.' });
    }

    if (existingBid) {
      // Update existing bid
      const priceInPaise = Math.round(price_per_tonne * 100);
      const total = Math.round(quantity_requested * priceInPaise);
      await existingBid.update({
        quantity_requested, price_per_tonne: priceInPaise,
        total_amount: total, delivery_deadline, notes,
        expires_at: new Date(Date.now() + 48 * 60 * 60 * 1000),
      });

      if (io) io.to(`listing_${listingId}`).emit('bid_updated', { listingId, bid: existingBid });
      return res.json({ message: 'Bid updated', bid: existingBid });
    }

    const priceInPaise = Math.round(price_per_tonne * 100);
    const total = Math.round(quantity_requested * priceInPaise);
    const bid = await Bid.create({
      listing_id: listingId, buyer_id: buyerId,
      quantity_requested, price_per_tonne: priceInPaise, total_amount: total,
      delivery_deadline, notes,
      expires_at: new Date(Date.now() + 48 * 60 * 60 * 1000),
    });

    if (listing.status === 'ACTIVE') await listing.update({ status: 'BIDDING' });

    // Notify supplier
    await notifyBidReceived(listing.supplier_id, req.user.name, listingId, priceInPaise);

    // Emit to socket room
    const bidWithBuyer = await Bid.findByPk(bid.id, {
      include: [{ model: User, as: 'buyer', attributes: ['id', 'name'] }],
    });
    if (io) io.to(`listing_${listingId}`).emit('new_bid', { listingId, bid: bidWithBuyer });

    res.status(201).json(bid);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const getBids = async (req, res) => {
  try {
    const { id: listingId } = req.params;
    const listing = await Listing.findByPk(listingId);
    if (!listing) return res.status(404).json({ message: 'Listing not found' });

    const where = { listing_id: listingId };
    // Buyers only see their own bids; unauthenticated visitors see nothing (empty array)
    if (req.user?.role === 'buyer') where.buyer_id = req.user.id;
    else if (!req.user) return res.json([]);

    const bids = await Bid.findAll({
      where,
      include: [{ model: User, as: 'buyer', attributes: ['id', 'name'] }],
      order: [['price_per_tonne', 'DESC']],
    });

    // Anonymize buyer names for non-supplier/non-admin viewing others' bids
    const result = bids.map((b, idx) => {
      const plain = b.toJSON();
      if (req.user?.role === 'buyer' && plain.buyer_id !== req.user.id) {
        plain.buyer = { id: null, name: `Buyer ${idx + 1}` };
      }
      return plain;
    });

    res.json(result);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const acceptBid = async (req, res) => {
  try {
    const { id: bidId } = req.params;
    const bid = await Bid.findByPk(bidId, {
      include: [{ model: Listing, as: 'listing' }],
    });
    if (!bid) return res.status(404).json({ message: 'Bid not found' });
    if (bid.listing.supplier_id !== req.user.id) return res.status(403).json({ message: 'Unauthorized' });
    if (bid.status !== 'PENDING') return res.status(400).json({ message: 'Bid is not pending' });

    // Deduct from available quantity (partial bidding support)
    const newAvail = parseFloat(bid.listing.available_quantity) - parseFloat(bid.quantity_requested);
    const listingStatus = newAvail <= 0 ? 'AWARDED' : 'BIDDING';
    await bid.listing.update({ available_quantity: Math.max(0, newAvail), status: listingStatus });

    await bid.update({ status: 'ACCEPTED' });

    // Create order
    const order = await Order.create({
      bid_id: bid.id, listing_id: bid.listing_id,
      supplier_id: req.user.id, buyer_id: bid.buyer_id,
      quantity: bid.quantity_requested, total_amount: bid.total_amount,
    });

    await notifyBidAccepted(bid.buyer_id, bid.listing.biomass_type, order.id);

    if (io) {
      io.to(`listing_${bid.listing_id}`).emit('bid_accepted', { listingId: bid.listing_id, bidId, orderId: order.id });
    }

    res.json({ message: 'Bid accepted', order });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const rejectBid = async (req, res) => {
  try {
    const { id: bidId } = req.params;
    const bid = await Bid.findByPk(bidId, { include: [{ model: Listing, as: 'listing' }] });
    if (!bid) return res.status(404).json({ message: 'Bid not found' });
    if (bid.listing.supplier_id !== req.user.id) return res.status(403).json({ message: 'Unauthorized' });
    if (bid.status !== 'PENDING') return res.status(400).json({ message: 'Bid is not pending' });

    await bid.update({ status: 'REJECTED' });
    await notifyBidRejected(bid.buyer_id, bid.listing_id);

    res.json({ message: 'Bid rejected' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const getMyBids = async (req, res) => {
  try {
    const bids = await Bid.findAll({
      where: { buyer_id: req.user.id },
      include: [{ model: Listing, as: 'listing', include: [{ model: User, as: 'supplier', attributes: ['name'] }] }],
      order: [['created_at', 'DESC']],
    });
    res.json(bids);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = { placeBid, getBids, acceptBid, rejectBid, getMyBids, setIo };
