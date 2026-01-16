const request = require('supertest');
const app = require('../../../app');
const { User, Workspace, sequelize } = require('../../../models');
const jwt = require('jsonwebtoken');
const fs = require('fs');

describe('Workspace Module', () => {
    let authToken = '';
    let userId = '';
    let workspaceId = '';
    const uniqueId = Date.now() + Math.random().toString(36).substring(7);

    beforeAll(async () => {
        // Mock IO
        app.set('io', { emit: jest.fn() });

        // Direct Create User
        const user = await User.create({
            username: 'creator_' + uniqueId,
            email: `creator_${uniqueId}@example.com`,
            password: '$2b$10$YourHashedPasswordHere...',
            full_name: 'Test Creator',
            role: 'creator' // Using creator role
        });

        userId = user.id;

        // Generate Token
        authToken = jwt.sign(
            { id: user.id, username: user.username, role: user.role },
            process.env.JWT_SECRET || 'llm_survey_secret_2024',
            { expiresIn: '1h' }
        );
    });

    afterAll(async () => {
        try {
            if (workspaceId) await Workspace.destroy({ where: { id: workspaceId } });
            if (userId) await User.destroy({ where: { id: userId } });
        } catch (e) { console.error('Cleanup failed', e); }
    });

    describe('POST /api/modules/workspaces', () => {
        it('should create a new workspace', async () => {
            const res = await request(app)
                .post('/api/modules/workspaces')
                .set('Authorization', `Bearer ${authToken}`)
                .send({
                    name: 'Test Workspace ' + uniqueId,
                    description: 'Automated Test Workspace'
                });

            if (res.statusCode !== 201) {
                console.log('Writing error to test_error.json');
                fs.writeFileSync('test_error.json', JSON.stringify({
                    status: res.statusCode,
                    body: res.body
                }, null, 2));
            }

            expect(res.statusCode).toEqual(201);
            expect(res.body.ok).toBe(true);
            expect(res.body.workspace).toHaveProperty('id');
            expect(res.body.workspace.name).toContain('Test Workspace');

            workspaceId = res.body.workspace.id;
        });

        it('should fail to create workspace without name', async () => {
            const res = await request(app)
                .post('/api/modules/workspaces')
                .set('Authorization', `Bearer ${authToken}`)
                .send({
                    description: 'No Name'
                });

            expect(res.statusCode).toEqual(400);
        });
    });

    describe('GET /api/modules/workspaces/my', () => {
        it('should return list of workspaces', async () => {
            const res = await request(app)
                .get('/api/modules/workspaces/my')
                .set('Authorization', `Bearer ${authToken}`);

            expect(res.statusCode).toEqual(200);
            expect(res.body.ok).toBe(true);
            // If workspace creation failed, this might fail or just return empty list
            if (workspaceId) {
                const found = res.body.workspaces.find(w => w.id === workspaceId);
                expect(found).toBeTruthy();
            }
        });
    });

    // Validating other endpoints skipped if creation fails, but keeping structure
    describe('DELETE /api/modules/workspaces/:id', () => {
        it('should delete workspace', async () => {
            if (!workspaceId) return; // Skip if create failed
            const res = await request(app)
                .delete(`/api/modules/workspaces/${workspaceId}`)
                .set('Authorization', `Bearer ${authToken}`);

            expect(res.statusCode).toEqual(200);
        });
    });
});
