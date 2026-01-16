// Script to add is_archived column to survey_templates
// Set environment variables for database connection
process.env.DB_HOST = '127.0.0.1';
process.env.DB_PORT = '3307';
process.env.DB_NAME = 'llm_survey_db';
process.env.DB_USER = 'root';
process.env.DB_PASSWORD = 'rootpassword';

const sequelize = require('../src/config/database');

async function addArchivedColumn() {
  try {
    console.log('Connecting to database...');
    await sequelize.authenticate();
    console.log(' Connected successfully\n');

    console.log('Adding is_archived column to survey_templates...');

    await sequelize.query(`
      ALTER TABLE survey_templates 
      ADD COLUMN is_archived TINYINT(1) DEFAULT 0 AFTER status;
    `);

    console.log(' Column added successfully\n');

    console.log('Creating index for performance...');
    await sequelize.query(`
      CREATE INDEX idx_templates_archived ON survey_templates(is_archived);
    `);
    console.log(' Index created successfully\n');

    // Verify the column was added
    console.log('Verifying column structure:');
    const [results] = await sequelize.query(`
      SELECT 
          COLUMN_NAME,
          DATA_TYPE,
          COLUMN_DEFAULT,
          IS_NULLABLE
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = 'llm_survey_db'
        AND TABLE_NAME = 'survey_templates'
        AND COLUMN_NAME = 'is_archived';
    `);

    console.table(results);

    console.log('\n✅ Migration completed successfully!');
    process.exit(0);
  } catch (error) {
    if (error.message.includes('Duplicate column name')) {
      console.log('⚠️  Column is_archived already exists. Skipping...');
      process.exit(0);
    } else if (error.message.includes('Duplicate key name')) {
      console.log('⚠️  Index idx_templates_archived already exists. Skipping...');
      process.exit(0);
    } else {
      console.error('❌ Error adding column:', error.message);
      process.exit(1);
    }
  }
}

addArchivedColumn();
