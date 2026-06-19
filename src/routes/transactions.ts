import { Router } from 'express';
import { authenticateJWT, AuthRequest } from '../middleware/auth';
import { getPrismaClient } from '../prisma';

const router = Router();

router.use(authenticateJWT);

router.get('/', async (req: AuthRequest, res) => {
  const prisma = getPrismaClient(req.user!.id);
  const transactions = await prisma.transaction.findMany({
    where: { userId: req.user!.id }
  });
  res.json(transactions);
});

router.post('/', async (req: AuthRequest, res) => {
  const { accountId, categoryId, amount, reason, type, timestamp } = req.body;
  const prisma = getPrismaClient(req.user!.id);

  const numericAmount = Number(amount);
  if (isNaN(numericAmount) || numericAmount <= 0) {
    return res.status(400).json({ error: 'Amount must be a positive number' });
  }

  if (type !== 'INCOMING' && type !== 'OUTGOING') {
    return res.status(400).json({ error: 'Type must be INCOMING or OUTGOING' });
  }

  const account = await prisma.bankAccount.findFirst({
    where: { id: accountId, userId: req.user!.id }
  });
  if (!account) {
    return res.status(403).json({ error: 'Invalid account' });
  }

  const category = await prisma.category.findFirst({
    where: { id: categoryId, userId: req.user!.id }
  });
  if (!category) {
    return res.status(403).json({ error: 'Invalid category' });
  }
  
  const transaction = await prisma.transaction.create({
    data: {
      accountId,
      categoryId,
      amount: numericAmount,
      reason,
      type,
      timestamp: timestamp ? new Date(timestamp) : new Date(),
      userId: req.user!.id
    }
  });

  const newBalance = type === 'INCOMING' 
    ? Number(account.startingBalance) + numericAmount
    : Number(account.startingBalance) - numericAmount;

  await prisma.bankAccount.update({
    where: { id: accountId },
    data: { startingBalance: newBalance }
  });
  
  res.status(201).json(transaction);
});

router.put('/:id', async (req: AuthRequest, res) => {
  const { id } = req.params;
  const { accountId, categoryId, amount, reason, type, timestamp } = req.body;
  const prisma = getPrismaClient(req.user!.id);

  const transaction = await prisma.transaction.findFirst({
    where: { id: String(id), userId: req.user!.id }
  });

  if (!transaction) {
    return res.status(404).json({ error: 'Transaction not found' });
  }

  if (accountId) {
    const account = await prisma.bankAccount.findFirst({
      where: { id: accountId, userId: req.user!.id }
    });
    if (!account) return res.status(403).json({ error: 'Invalid account' });
  }
  
  if (categoryId) {
    const category = await prisma.category.findFirst({
      where: { id: categoryId, userId: req.user!.id }
    });
    if (!category) return res.status(403).json({ error: 'Invalid category' });
  }

  const updatedTransaction = await prisma.transaction.update({
    where: { id: String(id) },
    data: {
      accountId,
      categoryId,
      amount: amount ? Number(amount) : undefined,
      reason,
      type,
      timestamp: timestamp ? new Date(timestamp) : undefined
    }
  });

  res.json(updatedTransaction);
});

router.delete('/:id', async (req: AuthRequest, res) => {
  const { id } = req.params;
  const prisma = getPrismaClient(req.user!.id);

  const transaction = await prisma.transaction.findFirst({
    where: { id: String(id), userId: req.user!.id }
  });

  if (!transaction) {
    return res.status(404).json({ error: 'Transaction not found' });
  }

  await prisma.transaction.delete({
    where: { id: String(id) }
  });

  res.status(204).send();
});

export default router;
