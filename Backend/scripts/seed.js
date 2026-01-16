#!/usr/bin/env node
/**
 * Database seeding script - creates initial data for development/testing
 * Run: npm run seed
 */

require('dotenv').config();
const bcrypt = require('bcrypt');
const { sequelize, User, QuestionType } = require('../src/models');

const logger = console;

async function seed() {
  try {
    logger.log('\n🌱 Starting database seed...\n');

    // Initialize database
    logger.log('📍 Initializing database...');
    await sequelize.sync();

    // Seed question types
    logger.log('📍 Seeding question types...');
    const questionTypes = [
      { type_name: 'multiple_choice', description: 'Single select (Radio button)' },
      { type_name: 'checkbox', description: 'Multiple select (Checkbox)' },
      { type_name: 'open_ended', description: 'Text input (Open-ended question)' },
      { type_name: 'likert', description: 'Likert scale (e.g., 1-5)' },
      { type_name: 'rating', description: 'Rating scale (e.g., 1-10 stars)' },
      { type_name: 'matrix', description: 'Matrix/Grid question' },
      { type_name: 'ranking', description: 'Ranking question' },
      { type_name: 'dropdown', description: 'Dropdown selection' }
    ];

    for (const qType of questionTypes) {
      const [existing] = await QuestionType.findOrCreate({
        where: { type_name: qType.type_name },
        defaults: qType
      });
      logger.log(`  ✓ ${qType.type_name}`);
    }

    // Seed users
    logger.log('\n📍 Seeding users...');
    const users = [
      { username: 'admin', email: 'admin@test.com', password: 'test123', full_name: 'Admin User', role: 'admin' },
      { username: 'creator1', email: 'creator1@test.com', password: 'test123', full_name: 'Creator One', role: 'creator' },
      { username: 'creator2', email: 'creator2@test.com', password: 'test123', full_name: 'Creator Two', role: 'creator' },
      { username: 'user1', email: 'user1@test.com', password: 'test123', full_name: 'Regular User One', role: 'user' },
      { username: 'user2', email: 'user2@test.com', password: 'test123', full_name: 'Regular User Two', role: 'user' }
    ];

    for (const userData of users) {
      const hashedPassword = await bcrypt.hash(userData.password, 10);
      const [user] = await User.findOrCreate({
        where: { username: userData.username },
        defaults: {
          ...userData,
          password: hashedPassword
        }
      });
      logger.log(`  ✓ ${userData.username} (${userData.role})`);
    }

    logger.log('\n✅ Seeding completed successfully!\n');
    logger.log('📝 Test credentials:');
    logger.log('   Admin:    admin / test123');
    logger.log('   Creator:  creator1 / test123');
    logger.log('   User:     user1 / test123\n');

    process.exit(0);
  } catch (error) {
    logger.error('❌ Seeding failed:', error.message);
    logger.error(error);
    process.exit(1);
  }
}

seed();
