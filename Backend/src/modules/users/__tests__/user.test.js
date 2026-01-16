const request = require('supertest');
const app = require('../../../app');
const { User, sequelize } = require('../../../models');
const jwt = require('jsonwebtoken');

describe('User Module', () => {
    let adminToken, creatorToken, userToken, otherUserToken;
    let adminId, creatorId, userId, otherUserId;
    const uniqueSuffix = Date.now().toString();

    beforeAll(async () => {
        // Create 4 users
        const admin = await User.create({
            username: 'admin_Users' + uniqueSuffix,
            email: `admin_Users_${uniqueSuffix}@example.com`,
            password: 'hash',
            full_name: 'Admin User',
            role: 'admin'
        });
        adminId = admin.id;

        const creator = await User.create({
            username: 'creator_Users' + uniqueSuffix,
            email: `creator_Users_${uniqueSuffix}@example.com`,
            password: 'hash',
            full_name: 'Creator User',
            role: 'creator'
        });
        creatorId = creator.id;

        const user = await User.create({
            username: 'user_Users' + uniqueSuffix,
            email: `user_Users_${uniqueSuffix}@example.com`,
            password: 'hash',
            full_name: 'Regular User',
            role: 'user'
        });
        userId = user.id;

        const otherUser = await User.create({
            username: 'other_Users' + uniqueSuffix,
            email: `other_Users_${uniqueSuffix}@example.com`,
            password: 'hash',
            full_name: 'Other User',
            role: 'user'
        });
        otherUserId = otherUser.id;

        // Generate Tokens
        const secret = process.env.JWT_SECRET || 'llm_survey_secret_2024';
        adminToken = jwt.sign({ id: adminId, role: 'admin' }, secret, { expiresIn: '1h' });
        creatorToken = jwt.sign({ id: creatorId, role: 'creator' }, secret, { expiresIn: '1h' });
        userToken = jwt.sign({ id: userId, role: 'user' }, secret, { expiresIn: '1h' });
        otherUserToken = jwt.sign({ id: otherUserId, role: 'user' }, secret, { expiresIn: '1h' });
    });

    afterAll(async () => {
        try {
            await User.destroy({ where: { id: [adminId, creatorId, userId, otherUserId] } });
        } catch (e) { console.error('Cleanup failed', e); }
    });

    describe('GET /api/modules/users', () => {
        it('should allow admin to list users', async () => {
            const res = await request(app)
                .get('/api/modules/users')
                .set('Authorization', `Bearer ${adminToken}`);
            expect(res.statusCode).toEqual(200);
            expect(Array.isArray(res.body.data.users)).toBe(true);
        });

        it('should allow creator to list users', async () => {
            const res = await request(app)
                .get('/api/modules/users')
                .set('Authorization', `Bearer ${creatorToken}`);
            expect(res.statusCode).toEqual(200);
        });

        it('should deny regular user from listing users', async () => {
            const res = await request(app)
                .get('/api/modules/users')
                .set('Authorization', `Bearer ${userToken}`);
            expect(res.statusCode).toEqual(403);
        });
    });

    describe('GET /api/modules/users/:id', () => {
        it('should allow user to view own profile', async () => {
            const res = await request(app)
                .get(`/api/modules/users/${userId}`)
                .set('Authorization', `Bearer ${userToken}`);
            expect(res.statusCode).toEqual(200);
            expect(res.body.data.user.id).toEqual(userId);
        });

        it('should allow admin to view any profile', async () => {
            const res = await request(app)
                .get(`/api/modules/users/${userId}`)
                .set('Authorization', `Bearer ${adminToken}`);
            expect(res.statusCode).toEqual(200);
            expect(res.body.data.user.id).toEqual(userId);
        });

        it('should deny user from viewing other profile', async () => {
            const res = await request(app)
                .get(`/api/modules/users/${otherUserId}`)
                .set('Authorization', `Bearer ${userToken}`);
            expect(res.statusCode).toEqual(403);
        });

        // Note: Service says Creator CAN view others. Let's verify.
        it('should allow creator to view other profile', async () => {
            const res = await request(app)
                .get(`/api/modules/users/${userId}`)
                .set('Authorization', `Bearer ${creatorToken}`);
            expect(res.statusCode).toEqual(200);
        });
    });

    describe('PUT /api/modules/users/:id', () => {
        it('should allow user to update own name', async () => {
            const res = await request(app)
                .put(`/api/modules/users/${userId}`)
                .set('Authorization', `Bearer ${userToken}`)
                .send({ full_name: 'Updated Name' });

            expect(res.statusCode).toEqual(200);
            expect(res.body.data.user.full_name).toEqual('Updated Name');
        });

        it('should deny user from updating role', async () => {
            const res = await request(app)
                .put(`/api/modules/users/${userId}`)
                .set('Authorization', `Bearer ${userToken}`)
                .send({ role: 'admin' });

            expect(res.statusCode).toEqual(403);
        });

        it('should allow admin to update user role', async () => {
            const res = await request(app)
                .put(`/api/modules/users/${userId}`)
                .set('Authorization', `Bearer ${adminToken}`)
                .send({ role: 'creator' });

            expect(res.statusCode).toEqual(200);
            expect(res.body.data.user.role).toEqual('creator');
        });

        it('should deny user from updating other profile', async () => {
            const res = await request(app)
                .put(`/api/modules/users/${otherUserId}`)
                .set('Authorization', `Bearer ${userToken}`)
                .send({ full_name: 'Hacked' });

            expect(res.statusCode).toEqual(403);
        });
    });

    describe('DELETE /api/modules/users/:id', () => {
        it('should deny user from deleting user', async () => {
            const res = await request(app)
                .delete(`/api/modules/users/${otherUserId}`)
                .set('Authorization', `Bearer ${userToken}`);
            expect(res.statusCode).toEqual(403);
        });

        it('should allow admin to delete user', async () => {
            const res = await request(app)
                .delete(`/api/modules/users/${otherUserId}`)
                .set('Authorization', `Bearer ${adminToken}`);
            expect(res.statusCode).toEqual(200);

            // Verify deleted
            const lookup = await User.findByPk(otherUserId);
            expect(lookup).toBeNull();
        });
    });
});
