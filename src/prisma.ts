import { PrismaClient } from '@prisma/client';

export function getPrismaClient(userId?: string) {
  const prisma = new PrismaClient();

  if (!userId) {
    return prisma;
  }

  // Use Prisma client extension to set the user_id session variable for RLS
  return prisma.$extends({
    query: {
      $allModels: {
        async $allOperations({ args, query }) {
          const [, result] = await prisma.$transaction([
            prisma.$executeRaw`SELECT set_config('app.current_user_id', ${userId}, true)`,
            query(args),
          ]);
          return result;
        },
      },
    },
  });
}

// A global instance for non-authenticated queries (like user registration)
export const prisma = getPrismaClient();
