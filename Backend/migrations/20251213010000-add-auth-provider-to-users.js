'use strict';

module.exports = {
    up: async (queryInterface, Sequelize) => {
        // Add auth_provider column
        await queryInterface.addColumn('users', 'auth_provider', {
            type: Sequelize.STRING,
            defaultValue: 'local',
            allowNull: false
        });

        // Add provider_id column
        await queryInterface.addColumn('users', 'provider_id', {
            type: Sequelize.STRING,
            allowNull: true
        });
    },

    down: async (queryInterface, Sequelize) => {
        await queryInterface.removeColumn('users', 'auth_provider');
        await queryInterface.removeColumn('users', 'provider_id');
    }
};
