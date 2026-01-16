#!/usr/bin/env node
require('dotenv').config();
const mysql = require('mysql2/promise');

async function diagnose() {
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST || '127.0.0.1',
        port: Number(process.env.DB_PORT) || 3306,
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
        database: process.env.DB_NAME || 'llm_survey_db'
    });

    console.log('\n=== DATABASE DIAGNOSTIC ===\n');
    console.log(`Connected to: ${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_NAME}\n`);

    // Query 1: Total surveys
    const [total] = await connection.query('SELECT COUNT(*) as count FROM surveys');
    console.log(`Total surveys: ${total[0].count}`);

    // Query 2: By status
    const [byStatus] = await connection.query('SELECT status, COUNT(*) as count FROM surveys GROUP BY status');
    console.log('\nBy status:');
    byStatus.forEach(row => console.log(`  ${row.status}: ${row.count}`));

    // Query 3: Sample data
    const [sample] = await connection.query('SELECT id, title, status FROM surveys LIMIT 5');
    console.log('\nSample surveys:');
    sample.forEach(s => console.log(`  #${s.id}: "${s.title}" (${s.status})`));

    // Query 4: Users
    const [users] = await connection.query('SELECT COUNT(*) as count FROM users');
    console.log(`\nTotal users: ${users[0].count}`);

    // Query 5: Responses
    const [responses] = await connection.query('SELECT COUNT(*) as count FROM survey_responses');
    console.log(`Total responses: ${responses[0].count}\n`);

    await connection.end();
    process.exit(0);
}

diagnose().catch(err => {
    console.error('Error:', err.message);
    process.exit(1);
});
