require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });
const bcrypt = require('bcryptjs');
const { sequelize, User, Listing, Bid, Order, Transaction, Notification } = require('../models');

const seed = async () => {
  await sequelize.authenticate();
  await sequelize.sync({ force: true });
  console.log('DB synced');

  // Users
  const hash = await bcrypt.hash('password123', 12);

  const admin = await User.create({ name: 'Admin User', email: 'admin@biobids.com', phone: '9000000000', password: hash, role: 'admin', is_verified: true, location_state: 'Madhya Pradesh', location_district: 'Indore' });

  const suppliers = await User.bulkCreate([
    { name: 'Ravi Kumar', email: 'ravi@supplier.com', phone: '9111111111', password: hash, role: 'supplier', is_verified: true, location_state: 'Punjab', location_district: 'Ludhiana' },
    { name: 'Priya Patel', email: 'priya@supplier.com', phone: '9222222222', password: hash, role: 'supplier', is_verified: true, location_state: 'Gujarat', location_district: 'Surat' },
    { name: 'Suresh Yadav', email: 'suresh@supplier.com', phone: '9333333333', password: hash, role: 'supplier', is_verified: true, location_state: 'Uttar Pradesh', location_district: 'Lucknow' },
  ]);

  const buyers = await User.bulkCreate([
    { name: 'GreenPower Industries', email: 'buyer1@biobids.com', phone: '9444444444', password: hash, role: 'buyer', gst_number: '24AAAAA0000A1Z5', is_verified: true, location_state: 'Maharashtra', location_district: 'Pune' },
    { name: 'EcoEnergy Ltd', email: 'buyer2@biobids.com', phone: '9555555555', password: hash, role: 'buyer', gst_number: '27BBBBB0000B2Z6', is_verified: true, location_state: 'Karnataka', location_district: 'Bangalore' },
    { name: 'AgriPower MSME', email: 'buyer3@biobids.com', phone: '9666666666', password: hash, role: 'buyer', gst_number: '07CCCCC0000C3Z7', is_verified: true, location_state: 'Delhi', location_district: 'New Delhi' },
  ]);

  // Listings
  const listings = await Listing.bulkCreate([
    { supplier_id: suppliers[0].id, biomass_type: 'rice_husk', quantity: 100, available_quantity: 100, location_state: 'Punjab', location_district: 'Ludhiana', pincode: '141001', moisture_content: 10.5, calorific_value: 3200, min_price: 350000, availability_date: '2026-05-01', status: 'ACTIVE', description: 'Premium quality rice husk, low moisture, available in 25kg bags.' },
    { supplier_id: suppliers[0].id, biomass_type: 'wheat_straw', quantity: 50, available_quantity: 50, location_state: 'Punjab', location_district: 'Amritsar', pincode: '143001', moisture_content: 12, calorific_value: 3800, min_price: 280000, availability_date: '2026-04-25', status: 'ACTIVE' },
    { supplier_id: suppliers[1].id, biomass_type: 'sugarcane_bagasse', quantity: 200, available_quantity: 200, location_state: 'Gujarat', location_district: 'Surat', pincode: '395001', moisture_content: 48, calorific_value: 2100, min_price: 180000, availability_date: '2026-05-10', status: 'ACTIVE', description: 'Fresh bagasse from sugar mill, bulk quantity available.' },
    { supplier_id: suppliers[2].id, biomass_type: 'wood_chips', quantity: 75, available_quantity: 75, location_state: 'Uttar Pradesh', location_district: 'Lucknow', pincode: '226001', moisture_content: 20, calorific_value: 4200, min_price: 420000, availability_date: '2026-04-30', status: 'BIDDING' },
    { supplier_id: suppliers[2].id, biomass_type: 'cotton_stalks', quantity: 120, available_quantity: 120, location_state: 'Madhya Pradesh', location_district: 'Indore', pincode: '452001', moisture_content: 15, calorific_value: 3600, min_price: 310000, availability_date: '2026-05-15', status: 'ACTIVE' },
    { supplier_id: suppliers[1].id, biomass_type: 'bamboo', quantity: 30, available_quantity: 30, location_state: 'Gujarat', location_district: 'Vadodara', pincode: '390001', moisture_content: 18, calorific_value: 4500, min_price: 500000, availability_date: '2026-05-05', status: 'ACTIVE' },
    { supplier_id: suppliers[0].id, biomass_type: 'mustard_husk', quantity: 80, available_quantity: 80, location_state: 'Haryana', location_district: 'Hisar', pincode: '125001', moisture_content: 9, calorific_value: 3400, min_price: 260000, availability_date: '2026-05-12', status: 'ACTIVE', description: 'Mustard husk from oil extraction, clean and dry, suitable for boilers.' },
    { supplier_id: suppliers[2].id, biomass_type: 'sugarcane_husk', quantity: 150, available_quantity: 150, location_state: 'Uttar Pradesh', location_district: 'Gorakhpur', pincode: '273001', moisture_content: 45, calorific_value: 2300, min_price: 190000, availability_date: '2026-05-20', status: 'ACTIVE', description: 'Sugarcane husk (outer dry leaf), baled and ready for transport.' },
    { supplier_id: suppliers[1].id, biomass_type: 'peanut_husk', quantity: 60, available_quantity: 60, location_state: 'Gujarat', location_district: 'Rajkot', pincode: '360001', moisture_content: 8, calorific_value: 3700, min_price: 300000, availability_date: '2026-05-08', status: 'ACTIVE', description: 'Groundnut shells from oil mill, high calorific value, low ash content.' },
  ]);

  // Sample bids on listing[3] (wood chips in BIDDING)
  const bid1 = await Bid.create({
    listing_id: listings[3].id, buyer_id: buyers[0].id,
    quantity_requested: 30, price_per_tonne: 450000, total_amount: 30 * 450000,
    status: 'PENDING', expires_at: new Date(Date.now() + 48 * 3600000),
  });
  const bid2 = await Bid.create({
    listing_id: listings[3].id, buyer_id: buyers[1].id,
    quantity_requested: 45, price_per_tonne: 460000, total_amount: 45 * 460000,
    status: 'PENDING', expires_at: new Date(Date.now() + 48 * 3600000),
  });

  // Completed order (for analytics)
  const completedBid = await Bid.create({
    listing_id: listings[0].id, buyer_id: buyers[2].id,
    quantity_requested: 20, price_per_tonne: 380000, total_amount: 20 * 380000,
    status: 'ACCEPTED',
  });
  const completedOrder = await Order.create({
    bid_id: completedBid.id, listing_id: listings[0].id,
    supplier_id: suppliers[0].id, buyer_id: buyers[2].id,
    quantity: 20, total_amount: 20 * 380000,
    status: 'COMPLETED', escrow_transaction_id: 'escrow_test_completed',
  });
  await Transaction.create({ order_id: completedOrder.id, escrow_transaction_id: 'escrow_test_completed', escrow_event: 'buyer_paid', amount: completedOrder.total_amount, type: 'ESCROW', status: 'SUCCESS' });
  await Transaction.create({ order_id: completedOrder.id, amount: completedOrder.total_amount, type: 'RELEASE', status: 'SUCCESS' });

  // Sample notification
  await Notification.create({ user_id: suppliers[0].id, title: 'Welcome to BioBids!', message: 'Start by creating your first biomass listing.', type: 'general' });

  console.log('\n✅ Seed complete!\n');
  console.log('Test accounts (all passwords: password123):');
  console.log('  Admin:    admin@biobids.com');
  console.log('  Supplier: ravi@supplier.com');
  console.log('  Buyer:    buyer1@biobids.com');

  process.exit(0);
};

seed().catch((err) => { console.error('Seed failed:', err); process.exit(1); });
