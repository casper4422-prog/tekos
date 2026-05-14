import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

export const db = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db;

if (process.env.NODE_ENV === 'production') {
	process.on('SIGTERM', async () => { await db.$disconnect(); process.exit(0); });
	process.on('SIGINT',  async () => { await db.$disconnect(); process.exit(0); });
}
