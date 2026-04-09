import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import * as bcrypt from 'bcrypt';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

async function main() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const prisma = app.get(PrismaService);

  const passwordHash = await bcrypt.hash('ChangeMe123!', 10);

  await prisma.adminUser.upsert({
    where: { email: 'admin@somame.com' },
    update: {
      username: 'admin',
      firstName: 'Super',
      lastName: 'Admin',
      role: 'SUPER_ADMIN',
      isActive: true,
      passwordHash,
    },
    create: {
      email: 'admin@somame.com',
      username: 'admin',
      passwordHash,
      firstName: 'Super',
      lastName: 'Admin',
      role: 'SUPER_ADMIN',
      isActive: true,
    },
  });

  console.log('Super admin seeded');

  await app.close();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});