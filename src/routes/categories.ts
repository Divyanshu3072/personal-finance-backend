import { Router } from 'express';
import { authenticateJWT, AuthRequest } from '../middleware/auth';
import { getPrismaClient } from '../prisma';

const router = Router();

router.use(authenticateJWT);

router.get('/', async (req: AuthRequest, res) => {
  const prisma = getPrismaClient(req.user!.id);
  const categories = await prisma.category.findMany();
  res.json(categories);
});

router.post('/', async (req: AuthRequest, res) => {
  const { name } = req.body;
  const prisma = getPrismaClient(req.user!.id);
  
  const category = await prisma.category.create({
    data: {
      name,
      userId: req.user!.id
    }
  });
  
  res.status(201).json(category);
});

router.put('/:id', async (req: AuthRequest, res) => {
  const { id } = req.params;
  const { name } = req.body;
  const prisma = getPrismaClient(req.user!.id);

  const category = await prisma.category.update({
    where: { id: String(id) },
    data: { name }
  });

  res.json(category);
});

router.delete('/:id', async (req: AuthRequest, res) => {
  const { id } = req.params;
  const prisma = getPrismaClient(req.user!.id);

  await prisma.category.delete({
    where: { id: String(id) }
  });

  res.status(204).send();
});

export default router;
