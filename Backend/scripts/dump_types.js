require('dotenv').config();
const { QuestionType } = require('./src/models');
const fs = require('fs');

async function dump() {
    try {
        const types = await QuestionType.findAll();
        const data = types.map(t => ({ id: t.id, name: t.type_name }));
        fs.writeFileSync('types.json', JSON.stringify(data, null, 2));
        console.log('Done');
    } catch (err) {
        console.error(err);
    }
    process.exit(0);
}
dump();
