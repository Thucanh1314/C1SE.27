require('dotenv').config();
const { SurveyCollector, Survey } = require('../src/models');

const checkCollectors = async () => {
    try {
        const collectors = await SurveyCollector.findAll({
            include: [{ model: Survey, as: 'Survey', attributes: ['title'] }]
        });

        console.log(`Found ${collectors.length} collectors.`);
        collectors.forEach(c => {
            console.log(`- ID: ${c.id}, Type: ${c.type}, Link: ${c.collector_link}, Survey: ${c.Survey ? c.Survey.title : 'N/A'}`);
        });
    } catch (error) {
        console.error('Error:', error);
    }
};

checkCollectors();
