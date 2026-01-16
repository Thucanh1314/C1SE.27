-- Migration: Add role_mismatch_alert to notification type enum
-- File: migrations/030_add_role_mismatch_alert.sql

ALTER TABLE notifications 
MODIFY COLUMN type ENUM(
  'survey_created',
  'survey_shared',
  'survey_response',
  'workspace_invite',
  'workspace_survey_added',
  'workspace_invitation',
  'workspace_member_added',
  'survey_invitation',
  'collector_created',
  'response_completed',
  'mention',
  'comment',
  'deadline_reminder',
  'role_change_request',
  'role_change_approved',
  'role_upgraded',
  'upgrade_rejected',
  'analysis_completed',
  'role_mismatch_alert',
  'system_alert'
) NOT NULL;
