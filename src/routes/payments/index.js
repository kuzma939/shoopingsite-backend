import express from 'express';

import stripeRoutes from './stripe.js';
import liqpayRoutes from './liqpay.js';
import fondyRoutes from './fondy.js';
import wayforpayRoutes from './wayforpay.js';

const router = express.Router();

router.use('/stripe', stripeRoutes);
router.use('/liqpay', liqpayRoutes);
router.use('/fondy', fondyRoutes);
router.use('/wayforpay', wayforpayRoutes);

export default router;
