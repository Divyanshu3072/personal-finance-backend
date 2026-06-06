import { Router } from 'express';
import authRoutes from './routes/auth';
import accountRoutes from './routes/accounts';
import categoryRoutes from './routes/categories';
import transactionRoutes from './routes/transactions';

const router = Router();

router.use('/auth', authRoutes);
router.use('/accounts', accountRoutes);
router.use('/categories', categoryRoutes);
router.use('/transactions', transactionRoutes);

export default router;
