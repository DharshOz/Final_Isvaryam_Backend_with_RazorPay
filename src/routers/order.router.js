import { Router } from 'express';
import handler from 'express-async-handler';
import auth from '../middleware/auth.mid.js';
import { BAD_REQUEST, UNAUTHORIZED } from '../constants/httpStatus.js';
import { OrderModel } from '../models/order.model.js';
import { PaymentModel } from '../models/payment.model.js';
import { OrderStatus } from '../constants/orderStatus.js';
import { UserModel } from '../models/user.model.js';
import { sendEmailReceipt } from '../helpers/mail.helper.js';
import { FoodModel } from '../models/food.model.js';
import admin from '../middleware/admin.mid.js';
import Razorpay from 'razorpay';
import crypto from 'crypto';

// Razorpay instance
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

const router = Router();
router.use(auth);

// ✅ Create Order in DB
router.post(
  '/create',
  handler(async (req, res) => {
    const order = req.body;

    if (order.items.length <= 0)
      return res.status(BAD_REQUEST).send('Cart Is Empty!');

    for (const item of order.items) {
      const product = await FoodModel.findById(item.product);
      if (!product) return res.status(BAD_REQUEST).send('Invalid product in cart!');
      const quantityObj = product.quantities.find(q => q.size === item.size);
      if (!quantityObj) return res.status(BAD_REQUEST).send('Invalid size for product!');
      if (quantityObj.price !== item.price) return res.status(BAD_REQUEST).send('Price mismatch!');
    }

    order.items = order.items.filter(item => item.product);
    if (order.items.length === 0) {
      return res.status(BAD_REQUEST).send('No valid products in cart!');
    }

    const newOrder = new OrderModel({ ...order, user: req.user.id });
    await newOrder.save();

    res.send(newOrder);
  })
);

// ✅ Create Razorpay Payment Order
router.post(
  '/razorpay/create-order',
  handler(async (req, res) => {
    try {
      const order = await getNewOrderForCurrentUser(req);
      if (!order) {
        return res.status(BAD_REQUEST).json({ error: 'Order Not Found!' });
      }

      // Ensure amount is in paise
      const amountInPaise = Math.round(order.totalPrice * 100);

      const options = {
        amount: amountInPaise,
        currency: 'INR',
        receipt: `order_rcptid_${order._id}`,
        payment_capture: 1 // Auto capture payment
      };

      const razorpayOrder = await razorpay.orders.create(options);

      res.json({
        success: true,
        orderId: razorpayOrder.id,
        amount: razorpayOrder.amount,
        currency: razorpayOrder.currency,
        receipt: razorpayOrder.receipt
      });

    } catch (err) {
      console.error('❌ Razorpay Create Order Error:', err);
      res.status(500).json({
        error: 'Failed to create Razorpay order',
        message: err.message
      });
    }
  })
);

// ✅ Verify Razorpay Payment
router.post(
  '/razorpay/verify-payment',
  handler(async (req, res) => {
    try {
      const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

      if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
        return res.status(BAD_REQUEST).json({ error: 'Missing required payment verification fields' });
      }

      // Generate expected signature
      const body = razorpay_order_id + '|' + razorpay_payment_id;
      const expectedSignature = crypto
        .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
        .update(body.toString())
        .digest('hex');

      console.log('🔍 Signature Check:', {
        expected: expectedSignature,
        received: razorpay_signature
      });

      if (expectedSignature !== razorpay_signature) {
        return res.status(BAD_REQUEST).json({ error: 'Invalid Signature!' });
      }

      const order = await getNewOrderForCurrentUser(req);
      if (!order) {
        return res.status(BAD_REQUEST).json({ error: 'Order Not Found!' });
      }

      // Save payment details
      const payment = new PaymentModel({
        order: order._id,
        user: req.user.id,
        paymentId: razorpay_payment_id,
        method: 'Razorpay',
        amount: order.totalPrice,
        status: 'COMPLETED'
      });
      await payment.save();

      // Update order status
      order.paymentId = razorpay_payment_id;
      order.status = OrderStatus.PAYED;
      await order.save();

      // Send email receipt
      sendEmailReceipt(order);

      res.json({
        success: true,
        orderId: order._id,
        paymentId: payment._id,
        paymentStatus: 'COMPLETED'
      });

    } catch (err) {
      console.error('❌ Razorpay Verify Payment Error:', err);
      res.status(500).json({
        error: 'Failed to verify Razorpay payment',
        message: err.message
      });
    }
  })
);

// ✅ Track Order
router.get(
  '/track/:orderId',
  handler(async (req, res) => {
    const { orderId } = req.params;
    const user = await UserModel.findById(req.user.id);

    const filter = { _id: orderId };
    if (!user.isAdmin) filter.user = user._id;

    const order = await OrderModel.findOne(filter).populate('items.product');
    if (!order) return res.send(UNAUTHORIZED);

    return res.send(order);
  })
);

// ✅ Delete Order
router.delete('/:id', async (req, res) => {
  try {
    const deletedOrder = await OrderModel.findByIdAndDelete(req.params.id);
    if (!deletedOrder) {
      return res.status(404).json({ message: 'Order not found' });
    }
    res.json({ message: 'Order deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// ✅ Get New Order for Current User
router.get('/newOrderForCurrentUser', auth, async (req, res) => {
  try {
    const order = await OrderModel.findOne({
      user: req.user.id,
      status: OrderStatus.NEW,
    })
      .populate('user')
      .populate({
        path: 'items.product',
        select: 'name images quantities',
      });

    if (!order) return res.status(404).send({ message: 'No active order found' });

    res.send(order);
  } catch (err) {
    console.error('Error in newOrderForCurrentUser:', err);
    res.status(500).send({ error: err.message });
  }
});

// ✅ Get All Status
router.get('/allstatus', (req, res) => {
  const allStatus = Object.values(OrderStatus);
  res.send(allStatus);
});

// ✅ Get Orders by Status
router.get(
  '/:status?',
  handler(async (req, res) => {
    const status = req.params.status;
    const user = await UserModel.findById(req.user.id);
    const filter = {};

    if (!user.isAdmin) filter.user = user._id;
    if (status) filter.status = status;

    const orders = await OrderModel.find(filter)
      .populate('items.product')
      .sort('-createdAt');

    res.send(orders);
  })
);

// ✅ Get All Orders (Admin)
router.get(
  '/orders',
  admin,
  handler(async (req, res) => {
    const { user, status, from, to } = req.query;
    const filter = {};
    if (user) filter.user = user;
    if (status) filter.status = status;
    if (from || to) {
      filter.createdAt = {};
      if (from) filter.createdAt.$gte = new Date(from);
      if (to) filter.createdAt.$lte = new Date(to);
    }
    const orders = await OrderModel.find(filter)
      .populate('items.product')
      .populate('user')
      .populate({ path: 'payment', select: 'status' })
      .sort('-createdAt');

    res.json(orders);
  })
);

// ✅ Update Order Status (Admin)
router.patch(
  '/order/:id/status',
  admin,
  handler(async (req, res) => {
    const { id } = req.params;
    const { status } = req.body;
    const order = await OrderModel.findByIdAndUpdate(id, { status }, { new: true });
    if (!order) return res.status(404).json({ message: 'Order not found' });
    res.json(order);
  })
);

// ✅ Update Payment Status (Admin)
router.patch(
  '/payment/:id/status',
  admin,
  handler(async (req, res) => {
    const { id } = req.params;
    const { status } = req.body;

    const payment = await PaymentModel.findByIdAndUpdate(id, { status }, { new: true });
    if (!payment) return res.status(404).json({ message: 'Payment not found' });

    if (status === 'COMPLETED') {
      const order = await OrderModel.findById(payment.order);
      if (order && order.status !== OrderStatus.PAYED) {
        order.status = OrderStatus.PAYED;
        order.paymentId = payment.paymentId;
        await order.save();
      }
    }

    res.json(payment);
  })
);

// ✅ User Purchase Count
router.get('/user-purchase-count', auth, async (req, res) => {
  try {
    const count = await OrderModel.countDocuments({ user: req.user.id, status: 'PAYED' });
    res.json({ count });
  } catch (err) {
    console.error('Error in user-purchase-count:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// ✅ Get Order by ID
router.get(
  '/order/:id',
  handler(async (req, res) => {
    const order = await OrderModel.findById(req.params.id).populate('items.product');
    if (!order) return res.status(404).json({ message: 'Order not found' });
    res.json(order);
  })
);

const getNewOrderForCurrentUser = async req =>
  await OrderModel.findOne({
    user: req.user.id,
    status: OrderStatus.NEW,
  })
    .sort({ createdAt: -1 })
    .populate('user');

export default router;
