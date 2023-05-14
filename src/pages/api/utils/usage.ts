import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export const getCurrentMonthUsage = async (
  endUser: string
): Promise<number> => {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  const aggregations = await prisma.usage.aggregate({
    _sum: {
      count: true,
    },
    where: {
      endUser: endUser,
      createdAt: {
        gte: start,
        lt: end,
      },
    },
  });

  return aggregations._sum.count || 0;
};

// We group usage by day for each user
export const addUsage = async (endUser: string): Promise<number> => {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDay());
  const usage = await prisma.usage.findFirst({
    where: {
      endUser: endUser,
      createdAt: today,
    },
  });

  let newUsage = 0;
  if (usage) {
    newUsage = usage.count + 1;
    await prisma.usage.update({
      where: {
        endUser: endUser,
        createdAt: today,
      },
      data: {
        count: newUsage,
      },
    });
  } else {
    newUsage = 1;
    await prisma.usage.create({
      data: {
        endUser: endUser,
        createdAt: today,
        count: 1,
      },
    });
  }

  return newUsage;
};
