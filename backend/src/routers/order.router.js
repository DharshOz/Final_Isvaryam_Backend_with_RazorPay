import { Router } from 'express';
import handler from 'express-async-handler';
import auth from '../middleware/auth.mid.js';
import { BAD_REQUEST, UNAUTHORIZED } from '../constants/httpStatus.js';
import { OrderModel } from '../models/order.model.js';
import { OrderStatus } from '../constants/orderStatus.js';
import { UserModel } from '../models/user.model.js';
import { sendEmailReceipt } from '../helpers/mail.helper.js';
import { FoodModel } from '../models/food.model.js';
import admin from '../middleware/admin.mid.js';

const router = Router();
router.use(auth);

router.post(
  '/create',
  handler(async (req, res) => {
    const order = req.body;

    if (order.items.length <= 0)
      return res.status(BAD_REQUEST).send('Cart Is Empty!');

    // Validate prices and sizes
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

router.put(
  '/pay',
  handler(async (req, res) => {
    const { paymentId } = req.body;
    const order = await getNewOrderForCurrentUser(req);
    if (!order) {
      res.status(BAD_REQUEST).send('Order Not Found!');
      return;
    }

    order.paymentId = paymentId;
    order.status = OrderStatus.PAYED;
    await order.save();

    sendEmailReceipt(order);

    res.send(order._id);
  })
);

router.get(
  '/track/:orderId',
  handler(async (req, res) => {
    const { orderId } = req.params;
    const user = await UserModel.findById(req.user.id);

    const filter = {
      _id: orderId,
    };

    if (!user.isAdmin) {
      filter.user = user._id;
    }

    const order = await OrderModel.findOne(filter).populate('items.product');


    if (!order) return res.send(UNAUTHORIZED);

    return res.send(order);
  })
);

router.get(
  '/newOrderForCurrentUser',
  auth,
  async (req, res) => {
    try {
      const order = await OrderModel.findOne({
        user: req.user.id,
        status: OrderStatus.NEW,
      })
      .populate('user')
      .populate({
        path: 'items.product',
        select: 'name images quantities'
      });

      if (!order) return res.status(404).send({ message: 'No active order found' });

      res.send(order);
    } catch (err) {
      console.error('Error in newOrderForCurrentUser:', err);
      res.status(500).send({ error: err.message });
    }
  }
);


router.get('/allstatus', (req, res) => {
  const allStatus = Object.values(OrderStatus);
  res.send(allStatus);
});

router.get(
  '/:status?',
  handler(async (req, res) => {
    const status = req.params.status;
    const user = await UserModel.findById(req.user.id);
    const filter = {};

    if (!user.isAdmin) filter.user = user._id;
    if (status) filter.status = status;

    const orders = await OrderModel.find(filter)
      .populate('items.product')  // ✅ Populates product details
      .sort('-createdAt');

    res.send(orders);
  })
);


router.get(
  '/orders', admin,
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
    const orders = await OrderModel.find(filter).populate('user').populate('items.product');
    res.json(orders);
  })
);

router.patch(
  '/order/:id/status', admin,
  handler(async (req, res) => {
    const { id } = req.params;
    const { status } = req.body;
    const order = await OrderModel.findByIdAndUpdate(id, { status }, { new: true });
    if (!order) return res.status(404).json({ message: 'Order not found' });
    res.json(order);
  })
);

router.get('/user-purchase-count', auth, async (req, res) => {
  try {
    console.log('user:', req.user); // Add this
    const count = await OrderModel.countDocuments({ user: req.user.id, status: 'PAYED' });
    res.json({ count });
  } catch (err) {
    console.error('Error in user-purchase-count:', err); // Add this
    res.status(500).json({ message: 'Internal server error' });
  }
});

const getNewOrderForCurrentUser = async req =>
  await OrderModel.findOne({
    user: req.user.id,
    status: OrderStatus.NEW,
  }).populate('user');
export default router;
