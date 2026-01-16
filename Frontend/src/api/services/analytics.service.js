import http from '../http';

const AnalyticsService = {
    getQualityScore: async (surveyId) => {
        const response = await http.get(`/analytics/survey/${surveyId}/quality`);
        return response.data?.data || response.data;
    },

    getDropOffAnalysis: async (surveyId, filters = {}) => {
        const queryParams = new URLSearchParams();
        if (filters.identityType) queryParams.append('identityType', filters.identityType);
        if (filters.questionFilter) {
            queryParams.append('questionId', filters.questionFilter.questionId);
            queryParams.append('optionId', filters.questionFilter.optionId);
        }
        const response = await http.get(`/analytics/survey/${surveyId}/drop-off?${queryParams.toString()}`);
        return response.data?.data || response.data;
    },

    getCrossTabAnalysis: async (surveyId, breakdownQuestionId, targetQuestionId) => {
        const response = await http.post(`/analytics/survey/${surveyId}/cross-tab`, {
            breakdownQuestionId,
            targetQuestionId
        });
        return response.data?.data || response.data;
    },

    getCreatorDashboard: async () => {
        const response = await http.get('/analytics/creator/dashboard');
        return response.data?.data || response.data;
    },

    getAdminDashboard: async () => {
        const response = await http.get('/analytics/admin/dashboard');
        return response.data?.data || response.data;
    },

    getOverview: async (surveyId, filters = {}) => {
        // Convert filters object to query params if needed, or send as body if POST
        // For GET with complex filters, simple query params are best, or switch to POST
        // Assuming backend accepts query params or we send body.
        // Let's use POST for complex filtering to be safe with long params, OR verify backend route.
        // Backend route: router.get('/survey/:surveyId/overview', ...)
        // We need to change backend to accept query params or body?
        // Actually, backend controller usually takes req.query. Use query string.
        const queryParams = new URLSearchParams();
        if (filters.identityType) queryParams.append('identityType', filters.identityType);
        if (filters.questionFilter) {
            queryParams.append('questionId', filters.questionFilter.questionId);
            queryParams.append('optionId', filters.questionFilter.optionId);
        }

        const response = await http.get(`/analytics/survey/${surveyId}/overview?${queryParams.toString()}`);
        return response.data?.data || response.data;
    },

    getQuestionAnalysis: async (surveyId, filters = {}) => {
        const queryParams = new URLSearchParams();
        if (filters.identityType) queryParams.append('identityType', filters.identityType);
        if (filters.questionFilter) {
            queryParams.append('questionId', filters.questionFilter.questionId);
            queryParams.append('optionId', filters.questionFilter.optionId);
        }

        const response = await http.get(`/analytics/survey/${surveyId}/questions?${queryParams.toString()}`);
        return response.data?.data || response.data;
    },

    getSegments: async (surveyId) => {
        const response = await http.get(`/analytics/survey/${surveyId}/segments`);
        return response.data?.data || response.data;
    },

    getAiInsights: async (surveyId) => {
        const response = await http.post(`/analytics/survey/${surveyId}/ai-insights`);
        return response.data?.data || response.data;
    },

    chatWithData: async (surveyId, messages, provider = 'gemini') => {
        const response = await http.post(`/analytics/survey/${surveyId}/chat`, {
            messages,
            provider
        });
        return response.data?.data || response.data;
    },
};

export default AnalyticsService;
