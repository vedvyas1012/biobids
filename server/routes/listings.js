const router = require('express').Router();
const { authenticate, requireRole } = require('../middleware/auth');
const upload = require('../middleware/upload');
const {
  getListings, getListingById, createListing,
  updateListing, deleteListing, getMyListings,
} = require('../controllers/listingController');

// Public
router.get('/', getListings);

// /supplier/my MUST be before /:id — otherwise Express matches 'supplier' as an id param
router.get('/supplier/my', authenticate, requireRole('supplier'), getMyListings);

router.get('/:id', getListingById);

// Supplier-only mutations
router.post('/', authenticate, requireRole('supplier'), (req, res, next) => {
  req.uploadDir = 'listings';
  next();
}, upload.array('files', 5), createListing);
router.put('/:id', authenticate, requireRole('supplier'), updateListing);
router.delete('/:id', authenticate, requireRole('supplier'), deleteListing);

module.exports = router;
