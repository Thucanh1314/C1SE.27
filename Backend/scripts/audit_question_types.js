require('dotenv').config();
const { Sequelize, DataTypes } = require('sequelize');
const config = require('../src/config/config.js');

const env = process.env.NODE_ENV || 'development';
const dbConfig = config[env];

async function audit() {
    const sequelize = new Sequelize(dbConfig.database, dbConfig.username, dbConfig.password, {
        host: dbConfig.host,
        dialect: dbConfig.dialect,
        logging: false
    });

    try {
        await sequelize.authenticate();
        console.log('Connection has been established successfully.');

        // Check question_types table
        console.log('\n--- Table: question_types ---');
        try {
            const dbTypes = await sequelize.query('SELECT * FROM question_types ORDER BY id', { type: Sequelize.QueryTypes.SELECT });
            console.table(dbTypes);
        } catch (e) {
            console.log('Error reading question_types (might not exist):', e.message);
        }

        // Check questions usage
        console.log('\n--- Usage in: questions table ---');
        try {
            const counts = await sequelize.query(`
            SELECT question_type_id, COUNT(*) as count 
            FROM questions 
            GROUP BY question_type_id
            ORDER BY count DESC
        `, { type: Sequelize.QueryTypes.SELECT });
            console.table(counts);
        } catch (e) {
            console.log('Error reading questions:', e.message);
        }

        // Check current questions with types to sample
        console.log('\n--- Sample questions and their types ---');
        try {
            const samples = await sequelize.query(`
            SELECT id, question_text, question_type_id 
            FROM questions 
            LIMIT 10
        `, { type: Sequelize.QueryTypes.SELECT });
            console.table(samples);
        } catch (e) {
            console.log('Error reading samples:', e.message);
        }

    } catch (error) {
        console.error('Unable to connect to the database:', error);
    } finally {
        await sequelize.close();
    }
}

audit();
