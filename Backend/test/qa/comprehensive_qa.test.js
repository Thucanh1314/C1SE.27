const request = require('supertest');

// Google Mock handled by moduleNameMapper and test/qa/googleapis_mock.js


jest.mock('../../src/models', () => ({
    User: {
        findOne: jest.fn(),
        create: jest.fn(),
        findByPk: jest.fn(),
    },
    Workspace: {
        create: jest.fn(),
        findByPk: jest.fn(),
        findOne: jest.fn() // Add findOne for duplicate checks
    },
    WorkspaceMember: {
        create: jest.fn(),
        findOne: jest.fn()
    }
}));

jest.mock('../../src/utils/email.service', () => ({
    sendWelcomeEmail: jest.fn().mockResolvedValue(true)
}));

jest.mock('../../src/utils/logger', () => ({
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn()
}));

jest.mock('../../src/modules/auth-rbac/service/auth.service', () => ({
    register: jest.fn(),
    login: jest.fn(),
    handleGoogleAuth: jest.fn(),
    refreshToken: jest.fn(),
    getProfile: jest.fn()
}));

// Import Controller to test Logic flow (Input -> Service Call -> Response)
// Import Service ONLY
const authService = require('../../src/modules/auth-rbac/service/auth.service');
const authController = require('../../src/modules/auth-rbac/controller/auth.controller');
const authMiddleware = require('../../src/modules/auth-rbac/middleware/auth.middleware');
const workspaceController = require('../../src/modules/workspaces/controller/workspace.controller');
const workspaceService = require('../../src/modules/workspaces/service/workspace.service');
const surveyController = require('../../src/modules/surveys/controller/survey.controller');
const surveyService = require('../../src/modules/surveys/service/survey.service');

jest.mock('../../src/modules/workspaces/service/workspace.service', () => ({
    createWorkspace: jest.fn(),
    getMyWorkspaces: jest.fn()
}));

jest.mock('../../src/modules/surveys/service/survey.service', () => ({
    createSurvey: jest.fn(),
    getSurveyById: jest.fn()
}));



// We also need to test Redirect logic which is in Controller
// We also need to test Workspace Service logic for Onboarding if possible, or Mock it?
// Let's stick to Auth flows as primary.

describe('QA Checklist Verification', () => {
    let req, res;

    beforeEach(() => {
        req = { body: {}, query: {} };
        res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn(),
            redirect: jest.fn(),
            send: jest.fn()
        };
        jest.clearAllMocks();
    });

    // A. Auth – Email/Password Signup
    test('A1/A2: Signup Success -> Force role user', async () => {
        req.body = { username: 'qa1', email: 'qa1@test.com', password: 'password123', role: 'admin' };
        authService.register.mockResolvedValue({ id: 1, role: 'user' });

        await authController.register(req, res);

        expect(authService.register).toHaveBeenCalledWith(expect.objectContaining({ role: 'user' }));
        expect(res.status).toHaveBeenCalledWith(201);
    });

    test('A5: Missing Fields -> Error', async () => {
        req.body = { email: 'qa1@test.com' }; // Missing password/username
        await authController.register(req, res);
        expect(res.status).toHaveBeenCalledWith(400);
        expect(authService.register).not.toHaveBeenCalled();
    });

    // B. Auth - Signin
    test('B1: Login Success -> Login params passed', async () => {
        req.body = { email: 'qa1@test.com', password: 'password123' };
        authService.login.mockResolvedValue({ user: { role: 'user' }, token: 'abc' });

        await authController.login(req, res);

        expect(authService.login).toHaveBeenCalledWith('qa1@test.com', 'password123');
        expect(res.status).toHaveBeenCalledWith(200);
    });

    // C. Google OAuth
    // C1/C2: Google Login -> Service called, Redirect constructed
    test('C1/C2: Google Callback -> Redirects based on role (User -> /dashboard)', async () => {
        req.query = { code: 'fake_code' };
        process.env.FRONTEND_URL = 'http://localhost:3000';

        authService.handleGoogleAuth.mockResolvedValue({
            user: { role: 'user' },
            token: 't',
            refreshToken: 'rt'
        });

        await authController.googleCallback(req, res);

        expect(authService.handleGoogleAuth).toHaveBeenCalled();
        // Verify Redirect URL contains token, refreshToken, and redirect=/dashboard
        const redirectUrl = res.redirect.mock.calls[0][0];
        expect(redirectUrl).toContain('token=t');
        expect(redirectUrl).toContain('redirect=%2Fdashboard');
    });

    test('D1: Admin Login -> Redirects to /admin/dashboard', async () => {
        req.query = { code: 'fake_code' };

        authService.handleGoogleAuth.mockResolvedValue({
            user: { role: 'admin' },
            token: 't',
            refreshToken: 'rt'
        });

        await authController.googleCallback(req, res);

        const redirectUrl = res.redirect.mock.calls[0][0];
        expect(redirectUrl).toContain('redirect=%2Fadmin%2Fdashboard');
    });

    test('H1: Google Auth Error -> Redirects to Login with error', async () => {
        req.query = { code: 'fake_code' };
        authService.handleGoogleAuth.mockRejectedValue(new Error('Google Fail'));

        await authController.googleCallback(req, res);

        expect(res.redirect).toHaveBeenCalledWith(expect.stringContaining('/login?error=GoogleAuthFailed'));
    });

    // B2. Auth Failure
    test('B2: Login Failure -> 401', async () => {
        req.body = { email: 'qa1@test.com', password: 'wrong' };
        authService.login.mockRejectedValue(new Error('Invalid credentials'));

        await authController.login(req, res);

        expect(res.status).toHaveBeenCalledWith(401);
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: false }));
    });

    // D2/F. RBAC Middleware
    test('D2: Admin Middleware -> User rejected', () => {
        req.user = { role: 'user' };
        const next = jest.fn();

        authMiddleware.isAdmin(req, res, next);

        expect(res.status).toHaveBeenCalledWith(403);
        expect(next).not.toHaveBeenCalled();
    });

    test('D2: Admin Middleware -> Admin accepted', () => {
        req.user = { role: 'admin' };
        const next = jest.fn();

        authMiddleware.isAdmin(req, res, next);

        expect(next).toHaveBeenCalled();
    });

    // E. Workspace Onboarding
    test('E1: Create Workspace -> Success', async () => {
        req.body = { name: 'My Workspace' };
        req.user = { id: 1 };
        req.app = { get: jest.fn().mockReturnValue({}) }; // Mock io

        workspaceService.createWorkspace.mockResolvedValue({ id: 100, name: 'My Workspace' });

        await workspaceController.createWorkspace(req, res);

        expect(workspaceService.createWorkspace).toHaveBeenCalled();
        expect(res.status).toHaveBeenCalledWith(201);
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ ok: true, workspace: expect.any(Object) }));
    });

    test('E2: Create Workspace -> Empty Name Error', async () => {
        req.body = { name: '' };
        await workspaceController.createWorkspace(req, res);
        expect(res.status).toHaveBeenCalledWith(400);
    });

    // F. RBAC - Survey Creation
    test('F1: Create Survey -> Success', async () => {
        req.body = { template_id: 1, title: 'New Survey' };
        req.user = { id: 1 };
        surveyService.createSurvey.mockResolvedValue({ id: 10, title: 'New Survey' });

        await surveyController.createSurvey(req, res);

        expect(surveyService.createSurvey).toHaveBeenCalled();
        expect(res.status).toHaveBeenCalledWith(201);
    });

    test('F2: Create Survey -> Missing Fields Error', async () => {
        req.body = { title: 'No Template' };
        await surveyController.createSurvey(req, res);
        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: false }));
    });
});


