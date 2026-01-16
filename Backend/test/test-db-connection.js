// Database connection test with Docker
require('dotenv').config();

async function testDatabaseConnection() {
  console.log('🔌 TESTING DATABASE CONNECTION WITH DOCKER\n');
  
  const config = {
    host: process.env.DB_HOST || '127.0.0.1',
    port: process.env.DB_PORT || 3307,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || 'rootpassword',
    database: process.env.DB_NAME || 'llm_survey_db'
  };
  
  console.log('📋 Connection config:');
  console.log(`   Host: ${config.host}`);
  console.log(`   Port: ${config.port}`);
  console.log(`   User: ${config.user}`);
  console.log(`   Database: ${config.database}`);
  console.log('');
  
  try {
    const mysql = require('mysql2/promise');
    
    console.log('🔄 Attempting database connection...');
    const connection = await mysql.createConnection(config);
    
    console.log('✅ Database connection successful!');
    
    // Test basic query
    const [rows] = await connection.execute('SELECT 1 as test');
    console.log('✅ Basic query test passed:', rows[0]);
    
    // Check if database exists
    const [databases] = await connection.execute('SHOW DATABASES');
    console.log('📋 Available databases:', databases.map(db => db.Database));
    
    await connection.end();
    console.log('✅ Connection closed properly');
    
    return true;
    
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
    
    if (error.code === 'ECONNREFUSED') {
      console.log('💡 Docker container may not be running. Try:');
      console.log('   cd d:\\NCKH\\Docker && docker-compose up -d mysql');
    } else if (error.code === 'ER_ACCESS_DENIED_ERROR') {
      console.log('💡 Authentication failed. Check credentials in .env file');
    }
    
    return false;
  }
}

// Test complete leave workspace system with actual DB
async function testWithRealDatabase() {
  console.log('\n🧪 TESTING LEAVE WORKSPACE SYSTEM WITH REAL DATABASE\n');
  
  const hasConnection = await testDatabaseConnection();
  
  if (hasConnection) {
    console.log('🚀 Ready to test with real database!');
    
    // Run the actual leave workspace test
    const { testCompleteLeaveWorkspaceSystem } = require('./test-complete-leave-system');
    await testCompleteLeaveWorkspaceSystem();
    
  } else {
    console.log('⚠️  Database not available, running logic tests only');
    const { testRoleMatrixScenarios } = require('./test-complete-leave-system');
    testRoleMatrixScenarios();
  }
}

if (require.main === module) {
  testWithRealDatabase().catch(console.error);
}

module.exports = { testDatabaseConnection };