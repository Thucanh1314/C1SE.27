const request = require('supertest');

// Mocks
const authService = require('../../src/modules/auth-rbac/service/auth.service');
const authController = require('../../src/modules/auth-rbac/controller/auth.controller');
const { User } = require('../../src/models');

// We need to mock googleapis at the module level
jest.mock('googleapis', () => {
    const mOAuth2Client = {
        getToken: jest.fn(),
        setCredentials: jest.fn(),
        generateAuthUrl: jest.fn()
    };
    return {
        google: {
            auth: {
                OAuth2: jest.fn(() => mOAuth2Client)
            },
            oauth2: jest.fn(() => ({
                userinfo: {
                    get: jest.fn()
                }
            }))
        }
    };
});

// Import ACTUAL controller but mock its dependencies? 
// No, we want to unit test the controller's ERROR HANDLING logic primarily.
// But `auth.controller.js` imports `authService`. We can mock `authService`.

jest.mock('../../src/modules/auth-rbac/service/auth.service');

describe('OAuth Detailed Logic', () => {
    let req, res;

    beforeEach(() => {
        req = { query: { code: 'valid_code' } };
        res = {
            redirect: jest.fn(),
            status: jest.fn().mockReturnThis(),
            send: jest.fn()
        };
        jest.clearAllMocks();

        // Setup successful google mocks by default
        const { google } = require('googleapis');
        google.auth.OAuth2.mockImplementation(() => ({
            getToken: jest.fn().mockResolvedValue({ tokens: {} }),
            setCredentials: jest.fn()
        }));
        google.oauth2.mockImplementation(() => ({
            userinfo: {
                get: jest.fn().mockResolvedValue({
                    data: { email: 'test@gmail.com', id: '123', name: 'Test User' }
                })
            }
        }));
    });

    test('Success Path -> Redirects with Token', async () => {
        authService.handleGoogleAuth.mockResolvedValue({
            user: { role: 'user', id: 1 },
            token: 'TOKEN',
            refreshToken: 'REFRESH'
        });

        await authController.googleCallback(req, res);

        const redirectUrl = res.redirect.mock.calls[0][0];
        expect(redirectUrl).toContain('/auth/callback');
        expect(redirectUrl).toContain('token=TOKEN');
        expect(redirectUrl).toContain('redirect=%2Fdashboard');
    });

    test('Service Throws MissingEmail -> Redirects with reason=MissingEmail', async () => {
        authService.handleGoogleAuth.mockRejectedValue(new Error('MissingEmail'));

        await authController.googleCallback(req, res);

        const redirectUrl = res.redirect.mock.calls[0][0];
        expect(redirectUrl).toContain('/login?error=GoogleAuthFailed');
        expect(redirectUrl).toContain('reason=MissingEmail');
    });

    test('Service Throws DbCreateFailed -> Redirects with reason=DbCreateFailed', async () => {
        authService.handleGoogleAuth.mockRejectedValue(new Error('DbCreateFailed'));

        await authController.googleCallback(req, res);

        const redirectUrl = res.redirect.mock.calls[0][0];
        expect(redirectUrl).toContain('reason=DbCreateFailed');
    });

    test('Google Token Exchange Fails -> Redirects with reason=TokenExchangeFailed', async () => {
        const { google } = require('googleapis');
        google.auth.OAuth2.mockImplementation(() => ({
            getToken: jest.fn().mockRejectedValue(new Error('invalid_grant'))
        }));

        await authController.googleCallback(req, res);

        const redirectUrl = res.redirect.mock.calls[0][0];
        expect(redirectUrl).toContain('reason=TokenExchangeFailed');
    });
});
