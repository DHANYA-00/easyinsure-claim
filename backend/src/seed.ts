import { NestFactory } from '@nestjs/core';
import { getModelToken } from '@nestjs/mongoose';
import * as bcrypt from 'bcrypt';
import { Model } from 'mongoose';

import { AppModule } from './app.module';
import { User, UserDocument, UserRole } from './users/schemas/user.schema';

async function seed() {
  const app = await NestFactory.createApplicationContext(AppModule);

  const userModel = app.get<Model<UserDocument>>(
    getModelToken(User.name),
  );

  const users = [
    {
      name: 'Patient User',
      email: 'patient@example.com',
      password: 'patient123',
      role: UserRole.PATIENT,
    },
    {
      name: 'Insurer User',
      email: 'insurer@example.com',
      password: 'insurer123',
      role: UserRole.INSURER,
    },
  ];

  for (const user of users) {
    const existingUser = await userModel.findOne({
      email: user.email,
    });

    if (existingUser) {
      console.log(`User already exists: ${user.email}`);
      continue;
    }

    const hashedPassword = await bcrypt.hash(user.password, 10);

    await userModel.create({
      ...user,
      password: hashedPassword,
    });

    console.log(`Created user: ${user.email}`);
  }

  await app.close();
}

seed();
