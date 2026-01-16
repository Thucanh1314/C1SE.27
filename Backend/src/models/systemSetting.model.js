module.exports = (sequelize, DataTypes) => {
    const SystemSetting = sequelize.define(
        'SystemSetting',
        {
            key: {
                type: DataTypes.STRING(50),
                primaryKey: true,
                allowNull: false,
            },
            value: {
                type: DataTypes.TEXT, // Encrypted value
                allowNull: false,
            },
            description: {
                type: DataTypes.STRING(255),
                allowNull: true,
            },
            updated_at: {
                type: DataTypes.DATE,
                defaultValue: DataTypes.NOW,
            },
        },
        {
            tableName: 'system_settings',
            timestamps: true,
            createdAt: false, // We only care about when it was last updated
            updatedAt: 'updated_at',
        }
    );

    return SystemSetting;
};
