const request = require('supertest');
const { generateToken } = require('../../src/utils/token.utils'); // mocked implicitly or ignored

// Mock models with factory to prevent loading real module
jest.mock('../../src/models', () => ({
    User: {
        findOne: jest.fn(),
        create: jest.fn(),
        findByPk: jest.fn(),
    }
}));

jest.mock('../../src/utils/email.service', () => ({
    sendWelcomeEmail: jest.fn().mockResolvedValue(true)
}));

jest.mock('sequelize', () => ({
    Op: { or: 'or' }
}));

jest.mock('../../src/modules/auth-rbac/controller/auth.controller', () => ({}));

// Import AFTER mocking
const { User } = require('../../src/models');
const authService = require('../../src/modules/auth-rbac/service/auth.service');

describe('Google OAuth Integration Logic', () => {

    beforeEach(() => {
        jest.clearAllMocks();
    });

    // TC-G01: New Google user -> auto-register
    test('TC-G01: Should create new user if email does not exist', async () => {
        // Setup Mocks
        User.findOne.mockResolvedValue(null); // No existing user
        User.create.mockResolvedValue({
            id: 1,
            email: 'new@example.com',
            username: 'new',
            role: 'user',
            auth_provider: 'google',
            provider_id: '12345',
            toJSON: () => ({ id: 1, email: 'new@example.com', role: 'user' })
        });

        const profile = {
            email: 'new@example.com',
            name: 'New User',
            sub: '12345'
        };

        const result = await authService.handleGoogleAuth(profile);

        expect(User.findOne).toHaveBeenCalledWith({ where: { email: 'new@example.com' } });
        expect(User.create).toHaveBeenCalledWith(expect.objectContaining({
            email: 'new@example.com',
            auth_provider: 'google',
            provider_id: '12345'
        }));
        expect(result).toHaveProperty('token');
        expect(result.user.role).toBe('user');
    });

    // TC-G02: Existing Google user -> login
    test('TC-G02: Should match existing user and NOT create new one', async () => {
        const existingUser = {
            id: 2,
            email: 'existing@example.com',
            role: 'user',
            provider_id: 'existing_sub',
            auth_provider: 'google',
            save: jest.fn(),
            toJSON: () => ({ id: 2, email: 'existing@example.com', role: 'user' })
        };
        User.findOne.mockResolvedValue(existingUser);

        const profile = {
            email: 'existing@example.com',
            sub: 'existing_sub'
        };

        const result = await authService.handleGoogleAuth(profile);

        expect(User.create).not.toHaveBeenCalled();
        expect(User.findOne).toHaveBeenCalled();
        expect(result.user.email).toBe('existing@example.com');
    });

    // TC-G03: Link local user
    test('TC-G03: Should link existing local user to Google', async () => {
        const localUser = {
            id: 3,
            email: 'local@example.com',
            role: 'user',
            auth_provider: 'local',
            provider_id: null,
            save: jest.fn().mockResolvedValue(true),
            toJSON: () => ({ id: 3, email: 'local@example.com', role: 'user' })
        };
        User.findOne.mockResolvedValue(localUser);

        const profile = {
            email: 'local@example.com',
            sub: 'google_Link_ID'
        };

        await authService.handleGoogleAuth(profile);

        expect(localUser.provider_id).toBe('google_Link_ID');
        expect(localUser.auth_provider).toBe('google');
        expect(localUser.save).toHaveBeenCalled();
    });

});
