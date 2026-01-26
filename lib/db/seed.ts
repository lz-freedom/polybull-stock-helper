import { stripe } from '../payments/stripe';
import { db } from './drizzle';
import { users, teams, teamMembers } from './schema';
import { hashPassword } from '@/lib/auth/session';

async function createStripeProducts() {
  console.log('Creating Stripe products and prices...');

  const baseProduct = await stripe.products.create({
    name: 'Base',
    description: 'Base subscription plan',
  });

  await stripe.prices.create({
    product: baseProduct.id,
    unit_amount: 800, // $8 in cents
    currency: 'usd',
    recurring: {
      interval: 'month',
      trial_period_days: 7,
    },
  });

  const plusProduct = await stripe.products.create({
    name: 'Plus',
    description: 'Plus subscription plan',
  });

  await stripe.prices.create({
    product: plusProduct.id,
    unit_amount: 1200, // $12 in cents
    currency: 'usd',
    recurring: {
      interval: 'month',
      trial_period_days: 7,
    },
  });

  console.log('Stripe products and prices created successfully.');
}

async function seed() {
  // 创建超级管理员
  const adminEmail = 'admin@admin.com';
  const adminPassword = 'admin123';
  const adminPasswordHash = await hashPassword(adminPassword);

  const [adminUser] = await db
    .insert(users)
    .values([
      {
        email: adminEmail,
        name: 'Super Admin',
        passwordHash: adminPasswordHash,
        role: 'super_admin', // 超级管理员角色
      },
    ])
    .returning();

  console.log('Super admin created:', adminEmail);

  // 创建普通管理员
  const moderatorEmail = 'moderator@test.com';
  const moderatorPassword = 'admin123';
  const moderatorPasswordHash = await hashPassword(moderatorPassword);

  const [moderatorUser] = await db
    .insert(users)
    .values([
      {
        email: moderatorEmail,
        name: 'Moderator',
        passwordHash: moderatorPasswordHash,
        role: 'admin', // 管理员角色
      },
    ])
    .returning();

  console.log('Moderator created:', moderatorEmail);

  // 创建普通测试用户
  const testEmail = 'test@test.com';
  const testPassword = 'admin123';
  const testPasswordHash = await hashPassword(testPassword);

  const [testUser] = await db
    .insert(users)
    .values([
      {
        email: testEmail,
        name: 'Test User',
        passwordHash: testPasswordHash,
        role: 'member', // 普通成员角色
      },
    ])
    .returning();

  console.log('Test user created:', testEmail);

  // 创建团队
  const [team] = await db
    .insert(teams)
    .values({
      name: 'Polybull Team',
    })
    .returning();

  // 添加团队成员
  await db.insert(teamMembers).values([
    {
      teamId: team.id,
      userId: adminUser.id,
      role: 'owner',
    },
    {
      teamId: team.id,
      userId: moderatorUser.id,
      role: 'member',
    },
    {
      teamId: team.id,
      userId: testUser.id,
      role: 'member',
    },
  ]);

  console.log('Team and members created.');

  // 创建 Stripe 产品
  await createStripeProducts();

  console.log('\n=================================');
  console.log('Seed completed! Test accounts:');
  console.log('=================================');
  console.log('Super Admin: admin@admin.com / admin123');
  console.log('Admin:       moderator@test.com / admin123');
  console.log('Member:      test@test.com / admin123');
  console.log('=================================\n');
}

seed()
  .catch((error) => {
    console.error('Seed process failed:', error);
    process.exit(1);
  })
  .finally(() => {
    console.log('Seed process finished. Exiting...');
    process.exit(0);
  });
