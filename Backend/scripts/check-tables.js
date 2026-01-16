const { sequelize } = require('../src/models');

async function run() {
    try {
        await sequelize.authenticate();
        console.log('DB connected');
        const [results] = await sequelize.query('SHOW TABLES');
        console.log('Tables:', results.map(r => Object.values(r)[0]));
    } catch (e) {
        console.error(e);
    } finally {
        await sequelize.close();
    }
}
run();
