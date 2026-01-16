module.exports = {
    testEnvironment: 'node',
    verbose: true,
    setupFilesAfterEnv: [], // Disable setup.js to avoid DB connection
    testMatch: [
        '**/test/integration/*.test.js',
        '**/test/qa/*.test.js'
    ],
    moduleNameMapper: {
        '^googleapis$': '<rootDir>/test/qa/googleapis_mock.js'
    }
};
