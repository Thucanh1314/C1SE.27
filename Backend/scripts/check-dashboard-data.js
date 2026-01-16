#!/usr/bin/env node
/**
 * Diagnostic Script - Check Dashboard Data
 * This script checks the actual database counts to diagnose the admin dashboard data inconsistency
 */

require('dotenv').config();
const { Survey, User, SurveyResponse, sequelize } = require('../src/models');

async function checkDashboardData() {
    try {
        console.log('\n🔍 Checking Dashboard Data...\n');

        // Test 1: Count all surveys
        console.log('📊 Survey Counts:');
        const totalSurveys = await Survey.count();
        console.log(`   Total Surveys (Survey.count()): ${totalSurveys}`);

        const activeSurveys = await Survey.count({ where: { status: 'active' } });
        console.log(`   Active Surveys: ${activeSurveys}`);

        const draftSurveys = await Survey.count({ where: { status: 'draft' } });
        console.log(`   Draft Surveys: ${draftSurveys}`);

        const closedSurveys = await Survey.count({ where: { status: 'closed' } });
        console.log(`   Closed Surveys: ${closedSurveys}`);

        // Test 2: Raw SQL query
        console.log('\n📊 Raw SQL Query:');
        const [rawResults] = await sequelize.query('SELECT COUNT(*) as count FROM surveys');
        console.log(`   Raw SQL COUNT: ${rawResults[0].count}`);

        const [statusResults] = await sequelize.query(
            'SELECT status, COUNT(*) as count FROM surveys GROUP BY status'
        );
        console.log('   Breakdown by status:');
        statusResults.forEach(row => {
            console.log(`     ${row.status}: ${row.count}`);
        });

        // Test 3: Find all surveys and check
        console.log('\n📊 Fetching all surveys:');
        const allSurveys = await Survey.findAll({
            attributes: ['id', 'title', 'status', 'created_by']
        });
        console.log(`   Found ${allSurveys.length} surveys via findAll()`);
        if (allSurveys.length > 0) {
            console.log('   First 5 surveys:');
            allSurveys.slice(0, 5).forEach(s => {
                console.log(`     ID: ${s.id}, Title: ${s.title}, Status: ${s.status}`);
            });
        }

        // Test 4: Check Users
        console.log('\n👥 User Counts:');
        const totalUsers = await User.count();
        console.log(`   Total Users: ${totalUsers}`);

        const [userRoles] = await sequelize.query(
            'SELECT role, COUNT(*) as count FROM users GROUP BY role'
        );
        console.log('   Breakdown by role:');
        userRoles.forEach(row => {
            console.log(`     ${row.role}: ${row.count}`);
        });

        // Test 5: Check Responses
        console.log('\n📝 Response Counts:');
        const totalResponses = await SurveyResponse.count();
        console.log(`   Total Responses: ${totalResponses}`);

        // Test 6: Check database connection
        console.log('\n🔌 Database Connection:');
        console.log(`   Database: ${sequelize.config.database}`);
        console.log(`   Host: ${sequelize.config.host}`);
        console.log(`   Dialect: ${sequelize.config.dialect}`);

        console.log('\n✅ Diagnostic check completed!\n');
        process.exit(0);
    } catch (error) {
        console.error('❌ Error during diagnostic check:', error.message);
        console.error(error);
        process.exit(1);
    }
}

checkDashboardData();
