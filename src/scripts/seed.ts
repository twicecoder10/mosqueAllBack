import { PrismaClient } from '@prisma/client';
import { hashPassword } from '../utils/auth';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seeding...');

  // Create admin user
  const adminPassword = await hashPassword('admin123');
  const admin = await prisma.user.upsert({
    where: { email: 'admin@islamicassociation.com' },
    update: {},
    create: {
      email: 'admin@islamicassociation.com',
      firstName: 'Admin',
      lastName: 'User',
      gender: 'MALE',
      password: adminPassword,
      role: 'ADMIN',
      isVerified: true,
      phone: '+1234567890'
    },
  });

  // Create subadmin user
  const subadminPassword = await hashPassword('subadmin123');
  const subadmin = await prisma.user.upsert({
    where: { email: 'subadmin@islamicassociation.com' },
    update: {},
    create: {
      email: 'subadmin@islamicassociation.com',
      firstName: 'Sub',
      lastName: 'Admin',
      gender: 'FEMALE',
      password: subadminPassword,
      role: 'SUBADMIN',
      isVerified: true,
      phone: '+1234567891'
    },
  });

  // Create regular user
  const userPassword = await hashPassword('user123');
  const user = await prisma.user.upsert({
    where: { email: 'user@islamicassociation.com' },
    update: {},
    create: {
      email: 'user@islamicassociation.com',
      firstName: 'Regular',
      lastName: 'User',
      gender: 'MALE',
      password: userPassword,
      role: 'USER',
      isVerified: true,
      phone: '+1234567892'
    },
  });

  // Create sample events
  const events = await Promise.all([
    prisma.event.upsert({
      where: { id: 'sample-event-1' },
      update: {},
      create: {
        id: 'sample-event-1',
        title: 'Friday Prayer',
        description: 'Weekly Friday prayer at the main mosque',
        startDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // Next week
        endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000 + 60 * 60 * 1000), // 1 hour later
        location: 'Main Mosque',
        maxAttendees: 100,
        category: 'PRAYER',
        registrationRequired: true,
        registrationDeadline: new Date(Date.now() + 6 * 24 * 60 * 60 * 1000), // 6 days from now
        createdById: admin.id,
        isActive: true
      },
    }),
    prisma.event.upsert({
      where: { id: 'sample-event-2' },
      update: {},
      create: {
        id: 'sample-event-2',
        title: 'Islamic Lecture Series',
        description: 'Weekly Islamic lecture on various topics',
        startDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 2 weeks from now
        endDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000 + 2 * 60 * 60 * 1000), // 2 hours later
        location: 'Community Center',
        maxAttendees: 50,
        category: 'LECTURE',
        registrationRequired: true,
        registrationDeadline: new Date(Date.now() + 13 * 24 * 60 * 60 * 1000), // 13 days from now
        createdById: subadmin.id,
        isActive: true
      },
    }),
    prisma.event.upsert({
      where: { id: 'sample-event-3' },
      update: {},
      create: {
        id: 'sample-event-3',
        title: 'Community Iftar',
        description: 'Community iftar during Ramadan',
        startDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
        endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000 + 3 * 60 * 60 * 1000), // 3 hours later
        location: 'Community Hall',
        maxAttendees: 200,
        category: 'COMMUNITY',
        registrationRequired: true,
        registrationDeadline: new Date(Date.now() + 28 * 24 * 60 * 60 * 1000), // 28 days from now
        createdById: admin.id,
        isActive: true
      },
    }),
  ]);

  // Create sample registrations
  await Promise.all([
    prisma.eventRegistration.upsert({
      where: {
        eventId_userId: {
          eventId: events[0].id,
          userId: user.id
        }
      },
      update: {},
      create: {
        eventId: events[0].id,
        userId: user.id,
        status: 'CONFIRMED'
      },
    }),
    prisma.eventRegistration.upsert({
      where: {
        eventId_userId: {
          eventId: events[1].id,
          userId: user.id
        }
      },
      update: {},
      create: {
        eventId: events[1].id,
        userId: user.id,
        status: 'CONFIRMED'
      },
    }),
  ]);

  console.log('✅ Database seeded successfully!');
  console.log('👥 Created users:');
  console.log(`   Admin: ${admin.email} (password: admin123)`);
  console.log(`   Subadmin: ${subadmin.email} (password: subadmin123)`);
  console.log(`   User: ${user.email} (password: user123)`);
  console.log('📅 Created sample events and registrations');
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
