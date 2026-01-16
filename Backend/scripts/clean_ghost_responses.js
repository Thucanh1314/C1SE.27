require('dotenv').config();
const { Sequelize, QueryTypes } = require('sequelize');

const config = {
    username: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'llm_survey_db',
    host: process.env.DB_HOST || '127.0.0.1',
    port: process.env.DB_PORT || 3306,
    dialect: 'mysql',
    logging: false
};

const sequelize = new Sequelize(config.database, config.username, config.password, {
    host: config.host,
    dialect: config.dialect,
    port: config.port
});

async function cleanGhosts() {
    try {
        console.log('Starting ghost response cleanup...');

        // Count before
        const countQuery = `
      SELECT COUNT(*) as count 
      FROM survey_responses sr
      WHERE sr.status != 'completed' 
      AND NOT EXISTS (
        SELECT 1 FROM answers a 
        WHERE a.survey_response_id = sr.id
      )
    `;

        const [before] = await sequelize.query(countQuery, { type: QueryTypes.SELECT });
        console.log(`Found ${before.count} ghost responses.`);

        if (before.count > 0) {
            const deleteQuery = `
          DELETE FROM survey_responses 
          WHERE status != 'completed' 
          AND NOT EXISTS (
            SELECT 1 FROM answers a 
            WHERE a.survey_response_id = survey_responses.id
          )
       `;

            await sequelize.query(deleteQuery, { type: QueryTypes.DELETE });
            console.log('Deleted ghost responses.');
        } else {
            console.log('No ghost responses to delete.');
        }

    } catch (error) {
        console.error('Cleanup failed:', error);
    } finally {
        await sequelize.close();
    }
}

cleanGhosts();
