// src/components/Notifications/NotificationTriggers.jsx
import React from 'react';
import notificationService from '../../api/services/notification.service';
import { useAuth } from '../../contexts/AuthContext';

/**
 * Component chứa các methods để trigger notifications từ frontend
 * Được sử dụng bởi các components khác khi cần gửi notification
 */
export const useNotificationTriggers = () => {
  const triggers = {
    // Trigger workspace invitation
    sendWorkspaceInvitation: async (workspaceId, invitedUserId, role) => {
      try {
        const response = await notificationService.sendWorkspaceInvitation({
          workspaceId,
          invitedUserId,
          role
        });

        if (response.success) {
          console.log(' Workspace invitation notification sent');
          return { success: true };
        } else {
          console.error(' Failed to send workspace invitation:', response.message);
          return { success: false, error: response.message };
        }
      } catch (error) {
        console.error(' Error sending workspace invitation:', error);
        return { success: false, error: error.message };
      }
    },

    // Trigger survey response notification  
    sendSurveyResponseNotification: async (surveyId, respondentId, workspaceId) => {
      try {
        const response = await notificationService.sendSurveyResponseNotification({
          surveyId,
          respondentId,
          workspaceId
        });

        if (response.success) {
          console.log(' Survey response notification sent');
          return { success: true };
        } else {
          console.error(' Failed to send survey response notification:', response.message);
          return { success: false, error: response.message };
        }
      } catch (error) {
        console.error(' Error sending survey response notification:', error);
        return { success: false, error: error.message };
      }
    },

    // Trigger AI analysis completed notification
    sendAnalysisCompletedNotification: async (analysisId, surveyId, workspaceId) => {
      try {
        const response = await notificationService.sendAnalysisCompletedNotification({
          analysisId,
          surveyId,
          workspaceId
        });

        if (response.success) {
          console.log(' Analysis completed notification sent');
          return { success: true };
        } else {
          console.error(' Failed to send analysis completed notification:', response.message);
          return { success: false, error: response.message };
        }
      } catch (error) {
        console.error(' Error sending analysis completed notification:', error);
        return { success: false, error: error.message };
      }
    },

    // Trigger role request notification
    sendRoleRequestNotification: async (workspaceId, requestedRole, currentRole) => {
      try {
        const response = await notificationService.sendRoleRequestNotification({
          workspaceId,
          requestedRole,
          currentRole
        });

        if (response.success) {
          console.log(' Role request notification sent');
          return { success: true };
        } else {
          console.error(' Failed to send role request notification:', response.message);
          return { success: false, error: response.message };
        }
      } catch (error) {
        console.error(' Error sending role request notification:', error);
        return { success: false, error: error.message };
      }
    },

    // Trigger system alert notification (admin only)
    sendSystemAlertNotification: async (userId, workspaceId, reason) => {
      try {
        const response = await notificationService.sendSystemAlertNotification({
          userId,
          workspaceId,
          reason
        });

        if (response.success) {
          console.log(' System alert notification sent');
          return { success: true };
        } else {
          console.error(' Failed to send system alert notification:', response.message);
          return { success: false, error: response.message };
        }
      } catch (error) {
        console.error(' Error sending system alert notification:', error);
        return { success: false, error: error.message };
      }
    },

    // Trigger deadline reminder notification
    sendDeadlineReminderNotification: async (surveyId, workspaceId, deadline, hoursRemaining) => {
      try {
        const response = await notificationService.sendDeadlineReminderNotification({
          surveyId,
          workspaceId,
          deadline,
          hoursRemaining
        });

        if (response.success) {
          console.log(' Deadline reminder notification sent');
          return { success: true };
        } else {
          console.error(' Failed to send deadline reminder notification:', response.message);
          return { success: false, error: response.message };
        }
      } catch (error) {
        console.error(' Error sending deadline reminder notification:', error);
        return { success: false, error: error.message };
      }
    },

    // Handle notification action
    handleNotificationAction: async (notificationId, action) => {
      try {
        const response = await notificationService.handleNotificationAction(notificationId, action);

        if (response.success) {
          console.log(` Notification action ${action} completed`);
          return { success: true, data: response.data };
        } else {
          console.error(` Failed to handle notification action ${action}:`, response.message);
          return { success: false, error: response.message };
        }
      } catch (error) {
        console.error(` Error handling notification action ${action}:`, error);
        return { success: false, error: error.message };
      }
    }
  };

  return triggers;
};

// Higher-order component để inject notification triggers
export const withNotificationTriggers = (WrappedComponent) => {
  return function WithNotificationTriggersComponent(props) {
    const notificationTriggers = useNotificationTriggers();

    return (
      <WrappedComponent
        {...props}
        notificationTriggers={notificationTriggers}
      />
    );
  };
};

export default useNotificationTriggers;