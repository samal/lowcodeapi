require('dotenv').config();

const bcrypt = require('bcrypt');
const crypto = require('crypto');
const { PrismaClient } = require('@prisma/client');

const generate = (prefix, num = 6, type = 'r') => {
  const prefixLocal = (prefix || 'usr').toString().toLowerCase();
  const gen_id = crypto.randomBytes(num).toString('hex')
    .toString()
    .replace('-', 'lx')
    .replace('_', 'ly')
    .toUpperCase();

  return `${prefixLocal}_${type}${gen_id}`;
};

/**
 * Detects database provider from DATABASE_URL
 * @returns {string} 'mysql' or 'postgresql'
 */
function getDatabaseProvider() {
  const databaseUrl = process.env.DATABASE_URL || '';
  if (databaseUrl.startsWith('postgresql://') || databaseUrl.startsWith('postgres://')) {
    return 'postgresql';
  }
  return 'mysql';
}

const bcryptSaltRounds = 10;
const createUser = async () => {
  const {
    EMAIL, FIRST_NAME = 'User', LAST_NAME, PASSWORD,
  } = process.env;
  if (!EMAIL || !PASSWORD) {
    console.log('Error, EMAIL= and PASSWORD= is required to create user.\n\n`EMAIL=<YOUR_EMAIL> PASSWORD=<YOUR_PASSWORD> node setup/create-user.js`\n');
    process.exit(1);
  }

  // Check if DATABASE_URL is set
  if (!process.env.DATABASE_URL) {
    console.error('❌ Error: DATABASE_URL environment variable is required.');
    console.error('   Please set DATABASE_URL in your .env file or as an environment variable.');
    console.error('   Example: DATABASE_URL=mysql://user:password@localhost:3306/database');
    console.error('   Or: DATABASE_URL=postgresql://user:password@localhost:5432/database\n');
    process.exit(1);
  }

  const provider = getDatabaseProvider();
  console.log(`Connecting to ${provider} database...`);

  // Initialize Prisma Client
  // Prisma automatically reads DATABASE_URL from environment
  const prisma = new PrismaClient({
    log: ['error', 'warn'],
  });

  try {
    // Check if user already exists using Prisma's type-safe method
    const existingUser = await prisma.users.findUnique({
      where: { email: EMAIL },
    });

    if (existingUser) {
      console.log(`❌ Account with email '${EMAIL}' already exists, use different email\n`);
      await prisma.$disconnect();
      process.exit(1);
    }

    // Generate password hash
    const salt = await bcrypt.genSalt(bcryptSaltRounds);
    const password_hash = await bcrypt.hash(PASSWORD, salt);
    const ref_id = generate('fe_usr');

    // Create new user using Prisma's type-safe method
    const newUser = await prisma.users.create({
      data: {
        ref_id,
        email: EMAIL,
        username: EMAIL,
        password_hash,
        first_name: FIRST_NAME || '',
        last_name: LAST_NAME || '',
        created_at: new Date(),
        updated_at: new Date(),
      },
    });

    console.log(`\n\n✅ New account created successfully!`);
    console.log(`   Email: ${EMAIL}`);
    console.log(`   Password: ${PASSWORD}`);
    console.log(`   User ID: ${newUser.id}`);
    console.log(`   Ref ID: ${newUser.ref_id}\n\n`);
  } catch (error) {
    console.error('\n❌ Error creating user:', error.message);
    if (error.code) {
      console.error(`   Error code: ${error.code}`);
    }
    throw error;
  } finally {
    await prisma.$disconnect();
  }
};

(async () => {
  try {
    await createUser();
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Failed to create user:', error.message);
    process.exit(1);
  }
})();
