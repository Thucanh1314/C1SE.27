const request = require('supertest');
const app = require('../../../app');

describe('Health Module', () => {
    it('GET /api/modules/health should return 200 and status ok', async () => {
        const res = await request(app).get('/api/modules/health');
        expect(res.statusCode).toEqual(200);
        expect(res.body).toHaveProperty('ok', true);
    });
});
