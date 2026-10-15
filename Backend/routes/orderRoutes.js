const express = require('express');
const {
  checkout,
  getMyOrders,
  getOrderById,
  getAllOrders,
  updateOrderStatus
} = require('../controllers/orderController');
const { protect, adminOnly } = require('../middleware/authMiddleware');

const router = express.Router();

router.use(protect);

router.post('/checkout', checkout);
router.get('/my-orders', getMyOrders);
router.get('/', adminOnly, getAllOrders);
router.get('/:id', getOrderById);
router.patch('/:id/status', adminOnly, updateOrderStatus);

module.exports = router;
