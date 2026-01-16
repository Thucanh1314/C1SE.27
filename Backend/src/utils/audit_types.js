require('dotenv').config({ path: '../../.env' });
const { QuestionType, Question } = require('../models');

async function audit() {
    console.log('🔍 Auditing Question Types...');
    try {
        const types = await QuestionType.findAll();
        console.log('--- Question Types ---');
        types.forEach(t => {
            console.log(`ID: ${t.id} | Name: ${t.type_name} | Desc: ${t.description}`);
        });

        console.log('\n--- Sample Questions ---');
        const questions = await Question.findAll({ limit: 5 });
        questions.forEach(q => {
            console.log(`ID: ${q.id} | Text: ${q.question_text.substring(0, 20)}... | TypeID: ${q.question_type_id}`);
        });

    } catch (err) {
        console.error(err);
    }
    process.exit(0);
}

audit();
