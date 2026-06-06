import { Router } from 'express';
import { authenticateJWT, AuthRequest } from '../middleware/auth';
import { getPrismaClient } from '../prisma';

const router = Router();

router.use(authenticateJWT);

router.get('/', async (req: AuthRequest, res) => {
  const prisma = getPrismaClient(req.user!.id);
  const transactions = await prisma.transaction.findMany();
  res.json(transactions);
});

router.post('/', async (req: AuthRequest, res) => {
  const { accountId, categoryId, amount, reason, type, timestamp } = req.body;
  const prisma = getPrismaClient(req.user!.id);
  
  const transaction = await prisma.transaction.create({
    data: {
      accountId,
      categoryId,
      amount,
      reason,
      type,
      timestamp: timestamp ? new Date(timestamp) : new Date(),
      userId: req.user!.id
    }
  });

  const account = await prisma.bankAccount.findUnique({ where: { id: accountId } });
  if (account) {
    const numericAmount = Number(amount);
    const newBalance = type === 'INCOMING' 
      ? Number(account.startingBalance) + numericAmount
      : Number(account.startingBalance) - numericAmount;

    await prisma.bankAccount.update({
      where: { id: accountId },
      data: { startingBalance: newBalance }
    });
  }
  
  res.status(201).json(transaction);
});

router.put('/:id', async (req: AuthRequest, res) => {
  const { id } = req.params;
  const { accountId, categoryId, amount, reason, type, timestamp } = req.body;
  const prisma = getPrismaClient(req.user!.id);

  const transaction = await prisma.transaction.update({
    where: { id: String(id) },
    data: {
      accountId,
      categoryId,
      amount,
      reason,
      type,
      timestamp: timestamp ? new Date(timestamp) : undefined
    }
  });

  res.json(transaction);
});

router.delete('/:id', async (req: AuthRequest, res) => {
  const { id } = req.params;
  const prisma = getPrismaClient(req.user!.id);

  await prisma.transaction.delete({
    where: { id: String(id) }
  });

  res.status(204).send();
});

export default router;
