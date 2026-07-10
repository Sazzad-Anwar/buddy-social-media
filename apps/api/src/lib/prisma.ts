import { PrismaClient } from '../generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import fs from 'fs'
import path from 'path'

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
  ssl: { ca: fs.readFileSync(path.join(__dirname,'../../certs','ca.pem'),'utf-8'), rejectUnauthorized:true},
  min: 1,
  max: 15,
});

export const prismaClientOptions = { adapter };

export function createPrismaClient() {
  return new PrismaClient(prismaClientOptions);
}
