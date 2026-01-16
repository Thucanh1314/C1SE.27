const request = require('supertest');

// MOCKS
jest.mock('../../src/models', () => ({
    User: { findOne: jest.fn() },
    Workspace: { create: jest.fn() },
    WorkspaceMember: { create: jest.fn() }
}));

jest.mock('../../src/utils/email.service', () => ({
    sendWelcomeEmail: jest.fn().mockResolvedValue(true)
}));

// Import Service ONLY
const authService = require('../../src/modules/auth-rbac/service/auth.service');
const authController = require('../../src/modules/auth-rbac/controller/auth.controller');


describe('Progressive Test', () => {
    test('Service Loaded', () => {
        expect(authService).toBeDefined();
    });
});
