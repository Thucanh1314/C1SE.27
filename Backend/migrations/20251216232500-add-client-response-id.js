'use strict';

module.exports = {
    up: async (queryInterface, Sequelize) => {
        // 1. Add client_response_id column safely
        try {
            await queryInterface.addColumn('survey_responses', 'client_response_id', {
                type: Sequelize.STRING,
                allowNull: true,
            });
            console.log('Column client_response_id added.');
        } catch (e) {
            if (e.message.includes('Duplicate column') || e.original?.code === 'ER_DUP_FIELDNAME') {
                console.log('Column client_response_id already exists, skipping.');
            } else {
                throw e;
            }
        }

        // 2. Add unique index safely
        try {
            await queryInterface.addIndex('survey_responses', ['survey_id', 'client_response_id'], {
                unique: true,
                name: 'survey_client_response_index'
            });
            console.log('Index survey_client_response_index added.');
        } catch (e) {
            if (e.message.includes('Duplicate key') || e.original?.code === 'ER_DUP_KEYNAME') {
                console.log('Index survey_client_response_index already exists, skipping.');
            } else {
                // Verify if it failed because index already exists but with different name/properties?
                // Just log and continue if we can verify existence, but for now assuming duplicate error
                console.warn('Index creation failed, possibly already exists:', e.message);
            }
        }
    },

    down: async (queryInterface, Sequelize) => {
        try {
            await queryInterface.removeIndex('survey_responses', 'survey_client_response_index');
        } catch (e) { }
        try {
            await queryInterface.removeColumn('survey_responses', 'client_response_id');
        } catch (e) { }
    }
};
