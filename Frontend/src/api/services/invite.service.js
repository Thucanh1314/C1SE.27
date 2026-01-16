// src/api/services/invite.service.js
import http from '../http';

class InviteService {
    /**
     * Create invites for a survey
     */
    async createInvites(surveyId, emails) {
        try {
            const response = await http.post(`/surveys/${surveyId}/invites`, {
                emails
            });
            return response.data;
        } catch (error) {
            console.error('[InviteService] Create invites error:', error);
            throw error;
        }
    }

    /**
     * Get all invites for a survey
     */
    async getInvites(surveyId) {
        try {
            const response = await http.get(`/surveys/${surveyId}/invites`);
            return response.data?.data?.invites || [];
        } catch (error) {
            console.error('[InviteService] Get invites error:', error);
            throw error;
        }
    }

    /**
     * Validate invite token (public endpoint)
     */
    async validateToken(token) {
        try {
            const response = await http.get(`/surveys/invites/${token}/validate`);
            return response.data?.data || null;
        } catch (error) {
            console.error('[InviteService] Validate token error:', error);
            throw error; // Propagate error to caller
        }
    }

    /**
     * Accept invite (public endpoint)
     */
    async acceptInvite(token) {
        try {
            const response = await http.post(`/surveys/invites/${token}/accept`);
            return response.data?.data || {};
        } catch (error) {
            console.error('[InviteService] Accept invite error:', error);
            throw error;
        }
    }

    /**
     * Revoke/delete invite
     */
    async revokeInvite(inviteId) {
        try {
            const response = await http.delete(`/invites/${inviteId}`);
            return response.data;
        } catch (error) {
            console.error('[InviteService] Revoke invite error:', error);
            throw error;
        }
    }

    /**
     * Get invite statistics
     */
    async getInviteStats(surveyId) {
        try {
            const response = await http.get(`/surveys/${surveyId}/invites/stats`);
            return response.data?.data || {};
        } catch (error) {
            console.error('[InviteService] Get stats error:', error);
            throw error;
        }
    }
}

const inviteService = new InviteService();
export default inviteService;
