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

  try {
    const oldTransaction = await prisma.transaction.findFirst({
      where: { id: String(id), userId: req.user!.id }
    });

    if (!oldTransaction) {
      return res.status(404).json({ error: 'Transaction not found' });
    }

    // Determine final values
    const newAmount = amount !== undefined ? Number(amount) : Number(oldTransaction.amount);
    const newType = type !== undefined ? type : oldTransaction.type;
    const newAccountId = accountId !== undefined ? accountId : oldTransaction.accountId;
    const newCategoryId = categoryId !== undefined ? categoryId : oldTransaction.categoryId;
    const newReason = reason !== undefined ? reason : oldTransaction.reason;
    const newTimestamp = timestamp !== undefined ? new Date(timestamp) : oldTransaction.timestamp;

    // Validations
    if (isNaN(newAmount) || newAmount <= 0) {
      return res.status(400).json({ error: 'Amount must be a positive number' });
    }
    if (newType !== 'INCOMING' && newType !== 'OUTGOING') {
      return res.status(400).json({ error: 'Type must be INCOMING or OUTGOING' });
    }
    if (!newReason || typeof newReason !== 'string' || !newReason.trim()) {
      return res.status(400).json({ error: 'Reason is required' });
    }

    // Fetch accounts to calculate new balances beforehand
    const oldAccount = await prisma.bankAccount.findFirst({
      where: { id: oldTransaction.accountId, userId: req.user!.id }
    });
    if (!oldAccount) return res.status(404).json({ error: 'Old account not found' });

    let newAccount = oldAccount;
    // Verify account ownership if it changed
    if (newAccountId !== oldTransaction.accountId) {
      const fetchedAccount = await prisma.bankAccount.findFirst({
        where: { id: newAccountId, userId: req.user!.id }
      });
      if (!fetchedAccount) return res.status(403).json({ error: 'Invalid account' });
      newAccount = fetchedAccount;
    }

    // Verify category ownership if it changed
    if (newCategoryId !== oldTransaction.categoryId) {
      const fetchedCategory = await prisma.category.findFirst({
        where: { id: newCategoryId, userId: req.user!.id }
      });
      if (!fetchedCategory) return res.status(403).json({ error: 'Invalid category' });
    }

    // Build the array of Prisma Promise operations
    const operations: any[] = [];

    if (oldTransaction.accountId === newAccountId) {
      // Updating same account: compute net balance
      let balance = Number(oldAccount.startingBalance);
      // 1. Reverse old
      balance = oldTransaction.type === 'INCOMING' ? balance - Number(oldTransaction.amount) : balance + Number(oldTransaction.amount);
      // 2. Apply new
      balance = newType === 'INCOMING' ? balance + newAmount : balance - newAmount;

      operations.push(
        prisma.bankAccount.update({
          where: { id: oldAccount.id },
          data: { startingBalance: balance }
        })
      );
    } else {
      // Moving to different account: compute balances separately
      // 1. Reverse old
      let oldBalance = Number(oldAccount.startingBalance);
      oldBalance = oldTransaction.type === 'INCOMING' ? oldBalance - Number(oldTransaction.amount) : oldBalance + Number(oldTransaction.amount);
      operations.push(
        prisma.bankAccount.update({
          where: { id: oldAccount.id },
          data: { startingBalance: oldBalance }
        })
      );

      // 2. Apply new
      let targetBalance = Number(newAccount.startingBalance);
      targetBalance = newType === 'INCOMING' ? targetBalance + newAmount : targetBalance - newAmount;
      operations.push(
        prisma.bankAccount.update({
          where: { id: newAccount.id },
          data: { startingBalance: targetBalance }
        })
      );
    }

    // 3. Update transaction record
    operations.push(
      prisma.transaction.update({
        where: { id: oldTransaction.id },
        data: {
          accountId: newAccountId,
          categoryId: newCategoryId,
          amount: newAmount,
          reason: newReason,
          type: newType,
          timestamp: newTimestamp
        }
      })
    );

    // Perform atomic transaction
    const results = await prisma.$transaction(operations);
    
    // Return the updated transaction (the last operation in the array)
    res.json(results[results.length - 1]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.delete('/:id', async (req: AuthRequest, res) => {
  const { id } = req.params;
  const prisma = getPrismaClient(req.user!.id);

  try {
    const transaction = await prisma.transaction.findFirst({
      where: { id: String(id), userId: req.user!.id }
    });

    if (!transaction) {
      return res.status(404).json({ error: 'Transaction not found' });
    }

    const account = await prisma.bankAccount.findFirst({
      where: { id: transaction.accountId, userId: req.user!.id }
    });
    
    if (!account) {
      return res.status(404).json({ error: 'Associated account not found' });
    }

    // 1. Reverse balance effect
    const newBalance = transaction.type === 'INCOMING'
      ? Number(account.startingBalance) - Number(transaction.amount)
      : Number(account.startingBalance) + Number(transaction.amount);

    // Perform atomic transaction array
    await prisma.$transaction([
      prisma.bankAccount.update({
        where: { id: transaction.accountId },
        data: { startingBalance: newBalance }
      }),
      prisma.transaction.delete({
        where: { id: transaction.id }
      })
    ]);

    res.status(204).send();
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
