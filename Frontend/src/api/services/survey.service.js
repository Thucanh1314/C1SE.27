// src/api/services/survey.service.js - Survey API service
import http from '../http';

const SurveyService = {
  /**
   * Get all surveys with filters
   */
  async getAll(params = {}) {
    try {
      const response = await http.get('/surveys', { params });
      // Backend returns { success: true, data: { surveys: [...], pagination: {...} } }
      const data = response.data.data || response.data || {};
      return {
        surveys: data.surveys || [],
        pagination: data.pagination || null
      };
    } catch (error) {
      console.error('Error in SurveyService.getAll:', error);
      return { surveys: [], pagination: null };
    }
  },

  /**
   * Get surveys assigned to current user
   */
  async getAssigned(params = {}) {
    try {
      const response = await http.get('/surveys/assigned', { params });
      const data = response.data.data || response.data || {};
      return {
        surveys: data.surveys || [],
        pagination: data.pagination || null
      };
    } catch (error) {
      console.error('Error in SurveyService.getAssigned:', error);
      return { surveys: [], pagination: null };
    }
  },

  async getAllSurveys(params = {}) {
    return this.getAll(params);
  },

  /**
   * Get survey by ID
   */
  async getById(id) {
    const response = await http.get(`/surveys/${id}`);
    // Backend returns { success: true, data: { survey: {...} } }
    return response.data.data?.survey || null;
  },

  async getSurveyById(id) {
    return this.getById(id);
  },

  /**
   * Create new survey
   */
  async create(surveyData) {
    const response = await http.post('/surveys', surveyData);
    // Backend returns { success: true, data: { survey } }
    return response.data.data?.survey || response.data.data;
  },

  async createSurvey(surveyData) {
    return this.create(surveyData);
  },

  /**
   * Update survey
   */
  async update(id, surveyData) {
    const response = await http.put(`/surveys/${id}`, surveyData);
    // Backend returns { success: true, data: { survey } }  
    return response.data.data?.survey || response.data.data;
  },

  async updateSurvey(id, surveyData) {
    return this.update(id, surveyData);
  },

  /**
   * Delete survey
   */
  async delete(id) {
    const response = await http.delete(`/surveys/${id}`);
    return response.data;
  },

  /**
   * Bulk delete surveys
   */
  async deleteMany(ids) {
    const response = await http.delete('/surveys/bulk', { data: { ids } });
    return response.data;
  },

  async deleteSurvey(id) {
    return this.delete(id);
  },

  /**
   * Publish survey (draft -> active)
   */
  async publishSurvey(id) {
    const response = await http.post(`/surveys/${id}/publish`);
    return response.data;
  },

  /**
   * Close survey (active -> closed)
   */
  async closeSurvey(id) {
    const response = await http.post(`/surveys/${id}/close`);
    return response.data;
  },

  /**
   * Update survey status
   */
  async updateStatus(id, status) {
    const response = await http.patch(`/surveys/${id}/status`, { status });
    return response.data;
  },

  /**
   * Restore archived survey
   */
  async restore(id) {
    const response = await http.patch(`/surveys/${id}/restore`);
    return response.data;
  },

  /**
   * Get survey statistics
   */
  async getSurveyStats(id) {
    const response = await http.get(`/surveys/${id}/stats`);
    return response.data;
  },

  /**
   * Get current user's surveys (for creator dashboard)
   */
  async getMySurveys(params = {}) {
    return this.getAll(params);
  },
};

export default SurveyService;
