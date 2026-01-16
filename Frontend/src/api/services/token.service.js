// Token management service
const TOKEN_KEY = 'authToken';
const REFRESH_TOKEN_KEY = 'refreshToken';
const USER_KEY = 'user';

export const TokenService = {
  getStoredTokensSync() {
    try {
      const accessToken = localStorage.getItem(TOKEN_KEY);
      const refreshToken = localStorage.getItem(REFRESH_TOKEN_KEY);
      if (accessToken && refreshToken) {
        return { accessToken, refreshToken };
      }
      return null;
    } catch (error) {
      console.error('Error:', error);
      return null;
    }
  },

  saveTokens(accessToken, refreshToken) {
    localStorage.setItem(TOKEN_KEY, accessToken);
    localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
  },

  removeTokens() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
  },

  saveUser(user) {
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  },

  getUserSync() {
    const userStr = localStorage.getItem(USER_KEY);
    if (!userStr || userStr === 'undefined') return null;
    try {
      return JSON.parse(userStr);
    } catch (e) {
      console.error('TokenService: Failed to parse user', e);
      return null;
    }
  },

  removeUser() {
    localStorage.removeItem(USER_KEY);
  },

  clearAll() {
    this.removeTokens();
    this.removeUser();
  }
};

export default TokenService;
