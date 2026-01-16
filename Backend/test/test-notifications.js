// Simple notification service test
const notificationService = require('../src/modules/notifications/service/notification.service');
const { Workspace, User, WorkspaceMember, Notification } = require('../src/models');

async function testNotificationSystem() {
  try {
    console.log('🧪 Testing Notification System...\n');

    // Test 1: Create notification
    console.log('📝 Test 1: Creating single notification...');
    const notification = await notificationService.createNotification({
      userId: 1,
      type: 'survey_created',
      title: 'Test Notification',
      message: 'This is a test notification',
      actionUrl: '/surveys/123',
      actorId: 2,
      relatedSurveyId: 123,
      relatedWorkspaceId: 1,
      priority: 'normal',
      category: 'survey'
    });
    console.log('✅ Single notification created:', {
      id: notification.id,
      type: notification.type,
      title: notification.title
    });

    // Test 2: Get user notifications  
    console.log('\n📫 Test 2: Getting user notifications...');
    const userNotifications = await notificationService.getUserNotifications(1, {
      page: 1,
      limit: 10,
      unreadOnly: false
    });
    console.log('✅ User notifications retrieved:', {
      total: userNotifications.total,
      unreadCount: userNotifications.unreadCount,
      count: userNotifications.notifications.length
    });

    // Test 3: Mark notification as read
    console.log('\n👀 Test 3: Marking notification as read...');
    await notificationService.markAsRead([notification.id], 1);
    console.log('✅ Notification marked as read');

    // Test 4: Test workspace notification (if workspace exists)
    console.log('\n🏢 Test 4: Testing workspace notifications...');
    
    // Check if workspace exists
    const workspace = await Workspace.findByPk(1);
    if (workspace) {
      console.log(`Found workspace: ${workspace.name}`);
      
      const result = await notificationService.notifyWorkspaceMembers({
        workspaceId: 1,
        type: 'survey_updated',
        title: 'Test Workspace Notification',
        message: 'Testing workspace member notifications',
        actionUrl: '/surveys/456',
        actorId: 1,
        relatedSurveyId: 456,
        excludeUserIds: [1],
        priority: 'normal',
        category: 'survey'
      });
      console.log('✅ Workspace notifications sent:', {
        count: result.count,
        notificationIds: result.notifications.map(n => n.id)
      });
    } else {
      console.log('❌ No workspace found with ID 1, skipping workspace test');
    }

    // Test 5: Get notification statistics
    console.log('\n📊 Test 5: Getting notification statistics...');
    const stats = await notificationService.getNotificationStats(1);
    console.log('✅ Notification statistics:', stats);

    console.log('\n🎉 All notification tests completed successfully!');

  } catch (error) {
    console.error('❌ Notification test failed:', error.message);
    console.error(error.stack);
  }
}

// Run the test
if (require.main === module) {
  testNotificationSystem().then(() => {
    console.log('\n🏁 Test script completed');
    process.exit(0);
  }).catch(error => {
    console.error('💥 Test script crashed:', error.message);
    process.exit(1);
  });
}

module.exports = { testNotificationSystem };