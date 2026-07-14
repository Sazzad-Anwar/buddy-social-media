import { PrismaClient } from '../generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

// NeonDB provides a built-in connection pooler (PgBouncer)
// Use DATABASE_URL for pooled connections (regular queries)
// Use DATABASE_URL_DIRECT for direct connections (migrations, transactions)
const poolConfig = {
  connectionString: process.env.DATABASE_URL,
  max: 20,                    // Max connections in pool
  idleTimeoutMillis: 30000,   // Close idle connections after 30s
  connectionTimeoutMillis: 5000, // Timeout when acquiring connection
};

const adapter = new PrismaPg(poolConfig);

export const prismaClientOptions = { adapter };

export function createPrismaClient() {
  return new PrismaClient(prismaClientOptions);
}
