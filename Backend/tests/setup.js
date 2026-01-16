// tests/setup.js
// This file is run before each test file if configured in jest.config.js
// or can be imported manually.

require('dotenv').config();
const { sequelize } = require('../src/models');

beforeAll(async () => {
    // Connect to DB?
    // Since we are running in parallel or band, we might want to connect once.
    // But usually models/index.js handles connection automatically.
});

afterAll(async () => {
    // Close DB connection to allow Jest to exit
    if (sequelize) {
        await sequelize.close();
    }
});
