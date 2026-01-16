// Test role-based notification filtering and action URLs
const notificationService = require('../src/modules/notifications/service/notification.service');

async function testRoleBasedNotifications() {
  try {
    console.log('🧪 Testing Role-Based Notification System...\n');

    // Test 1: Draft survey notifications (only managers)
    console.log('📝 Test 1: Draft survey notifications (should only notify managers)...');
    const draftResult = await notificationService.notifyWorkspaceMembers({
      workspaceId: 1,
      type: 'survey_created',
      title: 'New Draft Survey',
      message: 'A new draft survey has been created',
      actionUrl: '/creator/surveys/123/edit',
      actorId: 1,
      relatedSurveyId: 123,
      excludeUserIds: [1],
      priority: 'normal',
      category: 'survey',
      surveyStatus: 'draft' // Should only notify owner/collaborator/viewer
    });
    console.log('✅ Draft notifications result:', {
      count: draftResult.count,
      eligibleRoles: draftResult.eligibleRoles
    });

    // Test 2: Active survey notifications (notify everyone including members)
    console.log('\n🚀 Test 2: Active survey notifications (should notify all roles)...');
    const activeResult = await notificationService.notifyWorkspaceMembers({
      workspaceId: 1,
      type: 'survey_active',
      title: 'Survey Now Active',
      message: 'A survey is now active and ready for responses',
      actionUrl: '/surveys/123',
      actorId: 1,
      relatedSurveyId: 123,
      excludeUserIds: [1],
      priority: 'high',
      category: 'survey',
      surveyStatus: 'active' // Should notify all roles
    });
    console.log('✅ Active notifications result:', {
      count: activeResult.count,
      eligibleRoles: activeResult.eligibleRoles
    });

    // Test 3: Archived survey notifications (only managers)
    console.log('\n📦 Test 3: Archived survey notifications (should only notify managers)...');
    const archivedResult = await notificationService.notifyWorkspaceMembers({
      workspaceId: 1,
      type: 'survey_archived',
      title: 'Survey Archived',
      message: 'A survey has been archived',
      actionUrl: '/creator/surveys/123/edit',
      actorId: 1,
      relatedSurveyId: 123,
      excludeUserIds: [1],
      priority: 'normal',
      category: 'survey',
      surveyStatus: 'archived' // Should only notify managers
    });
    console.log('✅ Archived notifications result:', {
      count: archivedResult.count,
      eligibleRoles: archivedResult.eligibleRoles
    });

    // Test 4: Non-survey notifications (workspace events - should notify all)
    console.log('\n🏢 Test 4: Workspace notifications (should notify all roles)...');
    const workspaceResult = await notificationService.notifyWorkspaceMembers({
      workspaceId: 1,
      type: 'workspace_updated',
      title: 'Workspace Updated',
      message: 'Workspace settings have been updated',
      actionUrl: '/creator/workspaces/1',
      actorId: 1,
      excludeUserIds: [1],
      priority: 'normal',
      category: 'workspace'
      // No surveyStatus - should use default: all roles
    });
    console.log('✅ Workspace notifications result:', {
      count: workspaceResult.count,
      eligibleRoles: workspaceResult.eligibleRoles
    });

    console.log('\n🎉 Role-based notification tests completed!');
    
    // Summary of logic
    console.log('\n📋 Logic Summary:');
    console.log('📌 Draft/Closed/Archived surveys: Owner + Collaborator + Viewer only');
    console.log('📌 Active surveys: ALL roles (Members need to know they can participate)');
    console.log('📌 Workspace events: ALL roles');
    console.log('📌 Deletion events: Managers only');

  } catch (error) {
    console.error('❌ Role-based notification test failed:', error.message);
    console.error(error.stack);
  }
}

// Action URL examples
function demonstrateActionURLs() {
  console.log('\n🔗 Action URL Strategy:');
  console.log('📝 Draft/Edit actions → `/creator/surveys/{id}/edit` (management interface)');
  console.log('🚀 Active surveys → `/surveys/{id}` (participation interface)');
  console.log('🗑️ Deletions → `/creator/workspaces/{id}` (workspace management)');
  console.log('📦 Archives → `/creator/surveys/{id}/edit` (management interface)');
  console.log('🏢 Workspace events → `/creator/workspaces/{id}` (workspace management)');
}

// Run tests
if (require.main === module) {
  testRoleBasedNotifications()
    .then(() => {
      demonstrateActionURLs();
      console.log('\n🏁 All tests completed');
      process.exit(0);
    })
    .catch(error => {
      console.error('💥 Test failed:', error.message);
      process.exit(1);
    });
}

module.exports = { testRoleBasedNotifications };