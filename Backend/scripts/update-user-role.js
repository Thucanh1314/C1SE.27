#!/usr/bin/env node
/**
 * Update User Role Script
 * Usage: node update-user-role.js <email> <new_role>
 * Example: node update-user-role.js test@example.com creator
 */

require('dotenv').config();
const { User } = require('../src/models');

async function updateUserRole() {
    const email = process.argv[2];
    const newRole = process.argv[3];

    if (!email || !newRole) {
        console.error('Usage: node update-user-role.js <email> <new_role>');
        console.error('Valid roles: admin, creator, user');
        process.exit(1);
    }

    if (!['admin', 'creator', 'user'].includes(newRole)) {
        console.error('Invalid role. Valid roles: admin, creator, user');
        process.exit(1);
    }

    try {
        const user = await User.findOne({ where: { email } });

        if (!user) {
            console.error(`User with email ${email} not found`);
            process.exit(1);
        }

        const oldRole = user.role;
        user.role = newRole;
        await user.save();

        console.log(`✅ Successfully updated user role:`);
        console.log(`   Email: ${email}`);
        console.log(`   Old Role: ${oldRole}`);
        console.log(`   New Role: ${newRole}`);

        process.exit(0);
    } catch (error) {
        console.error('❌ Error updating user role:', error.message);
        process.exit(1);
    }
}

updateUserRole();
