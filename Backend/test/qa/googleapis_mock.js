const mOAuth2Client = {
    getToken: jest.fn().mockResolvedValue({ tokens: {} }),
    setCredentials: jest.fn(),
    generateAuthUrl: jest.fn()
};

module.exports = {
    google: {
        auth: {
            OAuth2: jest.fn(() => mOAuth2Client)
        },
        oauth2: jest.fn(() => ({
            userinfo: {
                get: jest.fn().mockResolvedValue({ data: { email: 'g@test.com', sub: '123' } })
            }
        })),
        gmail: jest.fn(() => ({
            users: {
                messages: {
                    send: jest.fn().mockResolvedValue({ data: { id: '123' } })
                }
            }
        }))
    }
};
