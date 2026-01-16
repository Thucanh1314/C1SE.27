// src/api/services/response.service.js - Response API service
import http from '../http';

const ResponseService = {
  /**
   * Submit response (authenticated user)
   */
  async submitResponse(responseData) {
    const response = await http.post('/responses', responseData);
    return response.data;
  },

  /**
   * Submit public response (anonymous - no auth)
   * Uses collector token instead of authentication
   */
  async submitPublicResponse(token, responseData) {
    const response = await http.post(`/responses/public/${token}`, responseData);
    return response.data;
  },

  /**
   * Start a new survey session (for Drop-off tracking)
   */
  async startSession(surveyId, collectorToken = null, sessionId = null, clientResponseId = null) {
    const response = await http.post(`/responses/start/${surveyId}`, {
      collector_token: collectorToken,
      session_id: sessionId,
      client_response_id: clientResponseId
    });
    return response.data;
  },

  /**
   * Get survey by public token (anonymous - no auth)
   */
  async getSurveyByToken(token) {
    const response = await http.get(`/collectors/token/${token}`);
    return response.data;
  },

  /**
   * Get user's own responses with enhanced filtering
   */
  async getUserResponses(params = {}) {
    const response = await http.get('/responses/my-responses', { params });
    return response.data;
  },

  /**
   * Get detailed user response with all answers
   */
  async getUserResponseDetail(id) {
    const response = await http.get(`/responses/my-responses/${id}`);
    return response.data;
  },

  /**
   * Get response by ID
   */
  async getResponseById(id) {
    const response = await http.get(`/responses/${id}`);
    return response.data;
  },

  /**
   * Get all responses for a survey (creator/admin only)
   */
  async getResponsesBySurvey(surveyId, params = {}) {
    const response = await http.get(`/responses/survey/${surveyId}`, { params });
    return response.data?.data || response.data;
  },

  /**
   * Delete response
   */
  async deleteResponse(id) {
    const response = await http.delete(`/responses/${id}`);
    return response.data;
  },

  /**
   * Check if user already submitted response to survey
   */
  async checkExistingResponse(surveyId) {
    const response = await http.get(`/responses/check/${surveyId}`);
    return response.data;
  },
};

export default ResponseService;
