import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly pool: Pool;

  constructor() {
    const url = process.env.DATABASE_URL ?? process.env.DIRECT_URL;

    if (!url) {
      throw new Error('DATABASE_URL (or DIRECT_URL) missing in services/api/.env');
    }

    const pool = new Pool({
      connectionString: url,
      ssl: { rejectUnauthorized: false },
    });

    super({ adapter: new PrismaPg(pool) });
    this.pool = pool;
  }

  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
    await this.pool.end();
  }
}
