import request from 'supertest';
import app from '../src/index';
import { prisma } from '../src/prisma';

let user1Token: string;
let user2Token: string;

let user1Id: string;
let user2Id: string;

beforeAll(async () => {
  await prisma.transaction.deleteMany();
  await prisma.category.deleteMany();
  await prisma.bankAccount.deleteMany();
  await prisma.user.deleteMany();

  // Register user 1
  const res1 = await request(app)
    .post('/auth/register')
    .send({ email: 'user1@test.com', password: 'password123' });
  user1Token = res1.body.token;
  user1Id = res1.body.userId;

  // Register user 2
  const res2 = await request(app)
    .post('/auth/register')
    .send({ email: 'user2@test.com', password: 'password123' });
  user2Token = res2.body.token;
  user2Id = res2.body.userId;
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe('Authentication', () => {
  it('should register a new user and create default categories', async () => {
    const res = await request(app)
      .get('/categories')
      .set('Authorization', `Bearer ${user1Token}`);

    expect(res.status).toBe(200);
    expect(res.body.length).toBe(8); // Default categories
    expect(res.body[0].userId).toBe(user1Id);
  });

  it('should login an existing user', async () => {
    const res = await request(app)
      .post('/auth/login')
      .send({ email: 'user1@test.com', password: 'password123' });

    expect(res.status).toBe(200);
    expect(res.body.token).toBeDefined();
  });
});

describe('Row Level Security (RLS)', () => {
  let user1AccountId: string;

  it('user 1 can create an account', async () => {
    const res = await request(app)
      .post('/accounts')
      .set('Authorization', `Bearer ${user1Token}`)
      .send({ name: 'User 1 Checking', startingBalance: 1000 });

    expect(res.status).toBe(201);
    user1AccountId = res.body.id;
  });

  it('user 1 can view their own accounts', async () => {
    const res = await request(app)
      .get('/accounts')
      .set('Authorization', `Bearer ${user1Token}`);

    expect(res.status).toBe(200);
    expect(res.body.length).toBe(1);
    expect(res.body[0].id).toBe(user1AccountId);
  });

  it('user 2 CANNOT view user 1 accounts', async () => {
    const res = await request(app)
      .get('/accounts')
      .set('Authorization', `Bearer ${user2Token}`);

    expect(res.status).toBe(200);
    expect(res.body.length).toBe(0); // Should be empty for user 2
  });

  it('user 2 CANNOT modify user 1 accounts', async () => {
    const res = await request(app)
      .put(`/accounts/${user1AccountId}`)
      .set('Authorization', `Bearer ${user2Token}`)
      .send({ name: 'Hacked Checking', startingBalance: 9999 });

    expect(res.body.error).toBe('Access denied by row-level security or record not found');
  });
});
