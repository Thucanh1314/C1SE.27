module.exports = {
    testEnvironment: 'node',
    verbose: true,
    setupFilesAfterEnv: ['./tests/setup.js'],
    coveragePathIgnorePatterns: [
        '/node_modules/'
    ],
    testMatch: [
        '**/__tests__/**/*.js',
        '**/?(*.)+(spec|test).js'
    ],
    // Force exit after tests to prevent hanging handles
    forceExit: true,
    testTimeout: 30000
};
