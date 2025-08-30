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
import DeliveryChargeModel from '../models/deliveryCharge.model.js';

// Razorpay instance
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

const router = Router();
router.use(auth);

// Store's state (set this to your actual store state)
const STORE_STATE = 'Tamil Nadu'; // Change as needed

// ✅ Send Razorpay Key to Frontend
router.get('/razorpay/get-key', (req, res) => {
  res.json({ key: process.env.RAZORPAY_KEY_ID });
});

// ✅ Create Order in DB
router.post(
  '/create',
  handler(async (req, res) => {
    const order = req.body;

    // Validate address object
    if (!order.address || !order.address.state || !order.address.pincode) {
      return res.status(400).send('Address, state, and pincode are required');
    }

    if (isNaN(order.totalPrice)) {
      return res.status(400).send('Invalid total price');
    }

    // Delivery charge logic
    const customerState = (order.state || order.address.state || '').trim().toLowerCase();
    const storeState = STORE_STATE.trim().toLowerCase();

    const normalizedCustomerState = customerState.replace(/\s+/g, '').toLowerCase();
    const normalizedStoreState = storeState.replace(/\s+/g, '').toLowerCase();

    let deliveryCharge = 0;
    if (normalizedCustomerState && normalizedCustomerState !== normalizedStoreState) {
      const chargeDoc = await DeliveryChargeModel.findOne({
        fromState: STORE_STATE,
        toState: { $regex: `^${normalizedCustomerState}$`, $options: 'i' },
      });
      deliveryCharge = chargeDoc ? chargeDoc.charge : 200;
    } else if (normalizedCustomerState === normalizedStoreState) {
      deliveryCharge = 0;
    } else {
      deliveryCharge = 200;
    }

    order.deliveryCharge = deliveryCharge;
    order.totalPrice = order.totalPrice + deliveryCharge;
    order.user = req.user.id;
    order.status = OrderStatus.NEW;

    const createdOrder = await OrderModel.create(order);
    res.send(createdOrder);
  })
);

// ✅ Create Razorpay Payment Order
router.post(
  '/razorpay/create-order',
  handler(async (req, res) => {
    try {
      const order = await getNewOrderForCurrentUser(req);
      if (!order) return res.status(BAD_REQUEST).json({ error: 'Order Not Found!' });

      const amountInPaise = Math.round(order.totalPrice * 100);

      const options = {
        amount: amountInPaise,
        currency: 'INR',
        receipt: `order_rcptid_${order._id}`,
        payment_capture: 1,
      };

      const razorpayOrder = await razorpay.orders.create(options);

      res.json({
        success: true,
        orderId: razorpayOrder.id,
        amount: razorpayOrder.amount,
        currency: razorpayOrder.currency,
        receipt: razorpayOrder.receipt,
      });
    } catch (err) {
      console.error('❌ Razorpay Create Order Error:', err);
      res.status(500).json({ error: 'Failed to create Razorpay order', message: err.message });
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
        return res.status(BAD_REQUEST).json({ error: 'Missing required fields' });
      }

      const body = razorpay_order_id + '|' + razorpay_payment_id;
      const expectedSignature = crypto
        .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
        .update(body.toString())
        .digest('hex');

      if (expectedSignature !== razorpay_signature) {
        return res.status(BAD_REQUEST).json({ error: 'Invalid Signature!' });
      }

      const order = await getNewOrderForCurrentUser(req);
      if (!order) return res.status(BAD_REQUEST).json({ error: 'Order Not Found!' });

      const payment = new PaymentModel({
        order: order._id,
        user: req.user.id,
        paymentId: razorpay_payment_id,
        method: 'Razorpay',
        amount: order.totalPrice,
        status: 'COMPLETED',
      });
      await payment.save();

      order.paymentId = razorpay_payment_id;
      order.status = OrderStatus.PAYED;
      await order.save();

      sendEmailReceipt(order);

      res.json({
        success: true,
        orderId: order._id,
        paymentId: payment._id,
        paymentStatus: 'COMPLETED',
      });
    } catch (err) {
      console.error('❌ Razorpay Verify Payment Error:', err);
      res.status(500).json({ error: 'Failed to verify Razorpay payment', message: err.message });
    }
  })
);

// ✅ Verify PayPal Payment
router.post(
  '/paypal/verify-payment',
  handler(async (req, res) => {
    try {
      const { paymentId } = req.body;
      if (!paymentId) return res.status(BAD_REQUEST).json({ error: 'Missing PayPal paymentId' });

      const order = await getNewOrderForCurrentUser(req);
      if (!order) return res.status(BAD_REQUEST).json({ error: 'Order Not Found!' });

      const payment = new PaymentModel({
        order: order._id,
        user: req.user.id,
        paymentId,
        method: 'PayPal',
        amount: order.totalPrice,
        status: 'COMPLETED',
      });
      await payment.save();

      order.paymentId = paymentId;
      order.status = OrderStatus.PAYED;
      await order.save();

      sendEmailReceipt(order);

      res.json({
        success: true,
        orderId: order._id,
        paymentId: payment._id,
        paymentStatus: 'COMPLETED',
      });
    } catch (err) {
      console.error('❌ PayPal Verify Error:', err);
      res.status(500).json({ error: 'Failed to verify PayPal payment', message: err.message });
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
    if (!deletedOrder) return res.status(404).json({ message: 'Order not found' });
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
      .populate({ path: 'items.product', select: 'name images quantities' });

    if (!order) return res.status(404).send({ message: 'No active order found' });
    res.send(order);
  } catch (err) {
    res.status(500).send({ error: err.message });
  }
});

// ✅ Get All Status
router.get('/allstatus', (req, res) => {
  res.send(Object.values(OrderStatus));
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
      .populate({ path: 'items.product', select: 'name images quantities' })
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

const getNewOrderForCurrentUser = async (req) =>
  await OrderModel.findOne({ user: req.user.id, status: OrderStatus.NEW })
    .sort({ createdAt: -1 })
    .populate('user');

export default router;
