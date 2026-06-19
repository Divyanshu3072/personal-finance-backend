import { Router } from 'express';
import { authenticateJWT, AuthRequest } from '../middleware/auth';
import { getPrismaClient } from '../prisma';

const router = Router();

router.use(authenticateJWT);

router.get('/', async (req: AuthRequest, res) => {
  const prisma = getPrismaClient(req.user!.id);
  const categories = await prisma.category.findMany({
    where: { userId: req.user!.id }
  });
  res.json(categories);
});

router.post('/', async (req: AuthRequest, res) => {
  const { name } = req.body;
  const prisma = getPrismaClient(req.user!.id);
  
  if (!name || typeof name !== 'string') {
    return res.status(400).json({ error: 'Category name is required' });
  }

  const normalizedName = name.trim();

  const existingCategory = await prisma.category.findFirst({
    where: {
      userId: req.user!.id,
      name: { equals: normalizedName, mode: 'insensitive' }
    }
  });

  if (existingCategory) {
    return res.status(400).json({ error: 'Category already exists' });
  }

  try {
    const category = await prisma.category.create({
      data: {
        name: normalizedName,
        userId: req.user!.id
      }
    });
    
    res.status(201).json(category);
  } catch (err: any) {
    if (err.code === 'P2002') {
      return res.status(400).json({ error: 'Category already exists' });
    }
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.put('/:id', async (req: AuthRequest, res) => {
  const { id } = req.params;
  const { name } = req.body;
  const prisma = getPrismaClient(req.user!.id);

  if (!name || typeof name !== 'string') {
    return res.status(400).json({ error: 'Category name is required' });
  }

  const category = await prisma.category.findFirst({
    where: { id: String(id), userId: req.user!.id }
  });

  if (!category) {
    return res.status(404).json({ error: 'Category not found' });
  }

  const normalizedName = name.trim();

  try {
    const updatedCategory = await prisma.category.update({
      where: { id: String(id) },
      data: { name: normalizedName }
    });
    res.json(updatedCategory);
  } catch (err: any) {
    if (err.code === 'P2002') {
      return res.status(400).json({ error: 'Category already exists' });
    }
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.delete('/:id', async (req: AuthRequest, res) => {
  const { id } = req.params;
  const prisma = getPrismaClient(req.user!.id);

  const category = await prisma.category.findFirst({
    where: { id: String(id), userId: req.user!.id }
  });

  if (!category) {
    return res.status(404).json({ error: 'Category not found' });
  }

  await prisma.category.delete({
    where: { id: String(id) }
  });

  res.status(204).send();
});

export default router;
