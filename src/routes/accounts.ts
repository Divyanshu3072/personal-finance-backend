import { Router } from 'express';
import { authenticateJWT, AuthRequest } from '../middleware/auth';
import { getPrismaClient } from '../prisma';

const router = Router();

router.use(authenticateJWT);

router.get('/', async (req: AuthRequest, res) => {
  const prisma = getPrismaClient(req.user!.id);
  const accounts = await prisma.bankAccount.findMany({
    where: { userId: req.user!.id }
  });
  res.json(accounts);
});

router.post('/', async (req: AuthRequest, res) => {
  const { name, startingBalance } = req.body;
  const prisma = getPrismaClient(req.user!.id);
  
  const account = await prisma.bankAccount.create({
    data: {
      name,
      startingBalance,
      userId: req.user!.id
    }
  });
  
  res.status(201).json(account);
});

router.put('/:id', async (req: AuthRequest, res) => {
  const { id } = req.params;
  const { name, startingBalance } = req.body;
  const prisma = getPrismaClient(req.user!.id);

  const account = await prisma.bankAccount.findFirst({
    where: { id: String(id), userId: req.user!.id }
  });

  if (!account) {
    return res.status(404).json({ error: 'Account not found' });
  }

  const updatedAccount = await prisma.bankAccount.update({
    where: { id: String(id) },
    data: { name, startingBalance }
  });

  res.json(updatedAccount);
});

router.delete('/:id', async (req: AuthRequest, res) => {
  const { id } = req.params;
  const prisma = getPrismaClient(req.user!.id);

  const account = await prisma.bankAccount.findFirst({
    where: { id: String(id), userId: req.user!.id }
  });

  if (!account) {
    return res.status(404).json({ error: 'Account not found' });
  }

  await prisma.bankAccount.delete({
    where: { id: String(id) }
  });

  res.status(204).send();
});

export default router;
