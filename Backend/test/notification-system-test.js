// Test notification system for survey lifecycle events
const request = require('supertest');
const app = require('../src/app');
const jwt = require('jsonwebtoken');

describe('Notification System Tests', () => {
  let creatorToken, userToken;
  let workspaceId, surveyId;

  beforeAll(async () => {
    // Create test tokens
    creatorToken = jwt.sign(
      { userId: 1, email: 'creator@test.com', role: 'creator' },
      process.env.JWT_SECRET || 'test-secret',
      { expiresIn: '1h' }
    );

    userToken = jwt.sign(
      { userId: 2, email: 'user@test.com', role: 'user' },
      process.env.JWT_SECRET || 'test-secret',
      { expiresIn: '1h' }
    );
  });

  describe('Survey Lifecycle Notifications', () => {
    it('should send notifications when survey is created', async () => {
      // Create workspace first
      const workspaceRes = await request(app)
        .post('/api/workspaces')
        .set('Authorization', `Bearer ${creatorToken}`)
        .send({
          name: 'Notification Test Workspace',
          description: 'Testing notifications'
        });

      workspaceId = workspaceRes.body.data.id;

      // Add a member to workspace
      await request(app)
        .post(`/api/workspaces/${workspaceId}/members`)
        .set('Authorization', `Bearer ${creatorToken}`)
        .send({
          email: 'user@test.com',
          role: 'member'
        });

      // Create survey in workspace
      const surveyRes = await request(app)
        .post('/api/surveys')
        .set('Authorization', `Bearer ${creatorToken}`)
        .send({
          template_id: 1,
          title: 'Notification Test Survey',
          description: 'Testing survey creation notifications',
          workspace_id: workspaceId
        });

      surveyId = surveyRes.body.data.id;

      // Check notifications were created
      const notificationsRes = await request(app)
        .get('/api/notifications')
        .set('Authorization', `Bearer ${userToken}`);

      expect(notificationsRes.status).toBe(200);
      const notifications = notificationsRes.body.data;
      const surveyNotification = notifications.find(n => 
        n.type === 'survey_created' && 
        n.related_survey_id === surveyId
      );

      expect(surveyNotification).toBeDefined();
      expect(surveyNotification.title).toBe('New Survey Created');
      expect(surveyNotification.message).toContain('Notification Test Survey');
    });

    it('should send notifications when survey status changes', async () => {
      // Update survey status to active
      await request(app)
        .put(`/api/surveys/${surveyId}`)
        .set('Authorization', `Bearer ${creatorToken}`)
        .send({
          status: 'active'
        });

      // Check status change notification
      const notificationsRes = await request(app)
        .get('/api/notifications')
        .set('Authorization', `Bearer ${userToken}`);

      expect(notificationsRes.status).toBe(200);
      const notifications = notificationsRes.body.data;
      const statusNotification = notifications.find(n => 
        n.type === 'survey_active' && 
        n.related_survey_id === surveyId
      );

      expect(statusNotification).toBeDefined();
      expect(statusNotification.title).toBe('Survey Status Changed');
      expect(statusNotification.message).toContain('Survey published and is now active');
    });

    it('should send notifications when survey is archived', async () => {
      // Archive survey
      await request(app)
        .put(`/api/surveys/${surveyId}`)
        .set('Authorization', `Bearer ${creatorToken}`)
        .send({
          status: 'archived'
        });

      // Check archive notification
      const notificationsRes = await request(app)
        .get('/api/notifications')
        .set('Authorization', `Bearer ${userToken}`);

      expect(notificationsRes.status).toBe(200);
      const notifications = notificationsRes.body.data;
      const archiveNotification = notifications.find(n => 
        n.type === 'survey_archived' && 
        n.related_survey_id === surveyId
      );

      expect(archiveNotification).toBeDefined();
      expect(archiveNotification.title).toBe('Survey Status Changed');
      expect(archiveNotification.message).toContain('Survey has been archived');
    });

    it('should send notifications when survey is restored', async () => {
      // Restore survey
      await request(app)
        .post(`/api/surveys/${surveyId}/restore`)
        .set('Authorization', `Bearer ${creatorToken}`);

      // Check restore notification
      const notificationsRes = await request(app)
        .get('/api/notifications')
        .set('Authorization', `Bearer ${userToken}`);

      expect(notificationsRes.status).toBe(200);
      const notifications = notificationsRes.body.data;
      const restoreNotification = notifications.find(n => 
        n.type === 'survey_active' && 
        n.message.includes('restored')
      );

      expect(restoreNotification).toBeDefined();
      expect(restoreNotification.title).toBe('Survey Restored');
      expect(restoreNotification.message).toContain("restored survey");
    });

    it('should send notifications when survey is deleted', async () => {
      // Delete survey
      await request(app)
        .delete(`/api/surveys/${surveyId}`)
        .set('Authorization', `Bearer ${creatorToken}`);

      // Check delete notification  
      const notificationsRes = await request(app)
        .get('/api/notifications')
        .set('Authorization', `Bearer ${userToken}`);

      expect(notificationsRes.status).toBe(200);
      const notifications = notificationsRes.body.data;
      const deleteNotification = notifications.find(n => 
        n.type === 'survey_deleted' && 
        n.related_survey_id === surveyId
      );

      expect(deleteNotification).toBeDefined();
      expect(deleteNotification.title).toBe('Survey Deleted');
      expect(deleteNotification.message).toContain('deleted survey');
    });
  });

  describe('Notification Recipients', () => {
    it('should notify all workspace members except the actor', async () => {
      // Create another workspace and survey
      const workspaceRes = await request(app)
        .post('/api/workspaces')
        .set('Authorization', `Bearer ${creatorToken}`)
        .send({
          name: 'Recipients Test Workspace',
          description: 'Testing notification recipients'
        });

      const testWorkspaceId = workspaceRes.body.data.id;

      // Add multiple members
      await request(app)
        .post(`/api/workspaces/${testWorkspaceId}/members`)
        .set('Authorization', `Bearer ${creatorToken}`)
        .send({
          email: 'user@test.com',
          role: 'member'
        });

      // Create survey
      const surveyRes = await request(app)
        .post('/api/surveys')
        .set('Authorization', `Bearer ${creatorToken}`)
        .send({
          template_id: 1,
          title: 'Recipients Test Survey',
          description: 'Testing notification recipients',
          workspace_id: testWorkspaceId
        });

      // Check creator doesn't receive notification about their own action
      const creatorNotificationsRes = await request(app)
        .get('/api/notifications')
        .set('Authorization', `Bearer ${creatorToken}`);

      const creatorNotifications = creatorNotificationsRes.body.data;
      const selfNotification = creatorNotifications.find(n => 
        n.type === 'survey_created' && 
        n.related_survey_id === surveyRes.body.data.id &&
        n.actor_id === 1 // creator's user id
      );

      expect(selfNotification).toBeUndefined();

      // Check member receives notification
      const memberNotificationsRes = await request(app)
        .get('/api/notifications')
        .set('Authorization', `Bearer ${userToken}`);

      const memberNotifications = memberNotificationsRes.body.data;
      const memberNotification = memberNotifications.find(n => 
        n.type === 'survey_created' && 
        n.related_survey_id === surveyRes.body.data.id
      );

      expect(memberNotification).toBeDefined();
    });
  });
});