import http from '../http';

const UpgradeService = {
    createRequest: async (data) => {
        const response = await http.post('/users/upgrade-request', data);
        return response.data;
    },

    getMyRequest: async () => {
        const response = await http.get('/users/upgrade-request/me');
        return response.data; // { success: true, data: request }
    },

    getAllRequests: async (params = {}) => {
        const response = await http.get('/users/admin/upgrade-requests', { params });
        return response.data; // { success: true, data: { requests, total, ... } }
    },

    approveRequest: async (id, adminComment) => {
        const response = await http.post(`/users/admin/upgrade-requests/${id}/approve`, { admin_comment: adminComment });
        return response.data;
    },

    rejectRequest: async (id, adminComment) => {
        const response = await http.post(`/users/admin/upgrade-requests/${id}/reject`, { admin_comment: adminComment });
        return response.data;
    }
};

export default UpgradeService;
