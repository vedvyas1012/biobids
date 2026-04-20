const router = require('express').Router();
const { authenticate, requireRole } = require('../middleware/auth');
const upload = require('../middleware/upload');
const {
  getListings, getListingById, createListing,
  updateListing, deleteListing, getMyListings,
} = require('../controllers/listingController');

// Public
router.get('/', getListings);
router.get('/:id', getListingById);

// Supplier only
router.use(authenticate);
router.get('/supplier/my', requireRole('supplier'), getMyListings);
router.post('/', requireRole('supplier'), (req, res, next) => {
  req.uploadDir = 'listings';
  next();
}, upload.array('files', 5), createListing);
router.put('/:id', requireRole('supplier'), updateListing);
router.delete('/:id', requireRole('supplier'), deleteListing);

module.exports = router;
