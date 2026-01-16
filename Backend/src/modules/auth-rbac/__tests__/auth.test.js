const request = require('supertest');
const app = require('../../../app');
const { User, sequelize } = require('../../../models');

describe('Auth Module', () => {
    const uniqueId = Date.now() + Math.random().toString(36).substring(7);
    const testUser = {
        username: 'test_user_' + uniqueId,
        email: `test_user_${uniqueId}@example.com`,
        password: 'Password123!',
        full_name: 'Test User',
        role: 'user'
    };

    let authToken = '';
    let refreshToken = '';

    afterAll(async () => {
        // Cleanup
        try {
            await User.destroy({ where: { email: testUser.email } });
        } catch (e) { console.error('Cleanup failed', e); }
    });

    describe('POST /api/modules/auth/register', () => {
        it('should register a new user', async () => {
            const res = await request(app)
                .post('/api/modules/auth/register')
                .send(testUser);

            if (res.statusCode !== 201) {
                console.error('Register failed:', JSON.stringify(res.body, null, 2));
            }
            expect(res.statusCode).toEqual(201);
            expect(res.body.success).toBe(true);
            expect(res.body.data.user).toHaveProperty('id');
            expect(res.body.data.user.email).toBe(testUser.email);
        });

        it('should fail to register with existing email', async () => {
            const res = await request(app)
                .post('/api/modules/auth/register')
                .send(testUser);

            expect(res.statusCode).toEqual(400); // Or 409 depending on implementation, controller says 400
            expect(res.body.success).toBe(false);
        });
    });

    describe('POST /api/modules/auth/login', () => {
        it('should login with valid credentials', async () => {
            const res = await request(app)
                .post('/api/modules/auth/login')
                .send({
                    email: testUser.email,
                    password: testUser.password
                });

            expect(res.statusCode).toEqual(200);
            expect(res.body.success).toBe(true);
            expect(res.body.data).toHaveProperty('token');
            expect(res.body.data).toHaveProperty('refreshToken');

            authToken = res.body.data.token;
            refreshToken = res.body.data.refreshToken;
        });

        it('should fail with invalid password', async () => {
            const res = await request(app)
                .post('/api/modules/auth/login')
                .send({
                    email: testUser.email,
                    password: 'WrongPassword'
                });

            expect(res.statusCode).toEqual(401);
        });
    });

    describe('Protected Routes & Token Refresh', () => {
        it('should access profile with valid token', async () => {
            const res = await request(app)
                .get('/api/modules/auth/profile')
                .set('Authorization', `Bearer ${authToken}`);

            expect(res.statusCode).toEqual(200);
            expect(res.body.success).toBe(true);
            expect(res.body.data.user.email).toBe(testUser.email);
        });

        it('should fail accessing profile without token', async () => {
            const res = await request(app)
                .get('/api/modules/auth/profile');

            expect(res.statusCode).toEqual(401);
        });

        it('should refresh token', async () => {
            const res = await request(app)
                .post('/api/modules/auth/refresh')
                .send({ refreshToken });

            expect(res.statusCode).toEqual(200);
            expect(res.body.success).toBe(true);
            expect(res.body.data).toHaveProperty('token');
        });
    });
});
