import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import * as bcrypt from 'bcrypt';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

async function main() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const prisma = app.get(PrismaService);

  const passwordHash = await bcrypt.hash('ChangeMe123!', 10);

  const existingAdmin = await prisma.adminUser.findUnique({
    where: { username: 'admin' },
  });

  if (existingAdmin) {
    await prisma.adminUser.update({
      where: { id: existingAdmin.id },
      data: {
        email: 'samuelfkwakye@gmail.com',
        username: 'admin',
        firstName: 'Samuel',
        lastName: 'Forson',
        role: 'GLOBAL_SUPER_ADMIN',
        townId: null,
        isActive: true,
        passwordHash,
      },
    });
  } else {
    await prisma.adminUser.create({
      data: {
        email: 'samuelfkwakye@gmail.com',
        username: 'admin',
        passwordHash,
        firstName: 'Samuel',
        lastName: 'Forson',
        role: 'GLOBAL_SUPER_ADMIN',
        townId: null,
        isActive: true,
      },
    });
  }

  console.log('Global super admin seeded/updated');

  await app.close();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});