module.exports = (sequelize, DataTypes) => {
    const PasswordResetToken = sequelize.define(
        'PasswordResetToken',
        {
            id: {
                type: DataTypes.INTEGER,
                autoIncrement: true,
                primaryKey: true,
            },
            user_id: {
                type: DataTypes.INTEGER,
                allowNull: false,
                references: {
                    model: 'users',
                    key: 'id',
                },
                onDelete: 'CASCADE',
            },
            token: {
                type: DataTypes.STRING(255),
                allowNull: false,
            },
            expires_at: {
                type: DataTypes.DATE,
                allowNull: false,
            },
            used: {
                type: DataTypes.BOOLEAN,
                defaultValue: false,
            },
            created_at: {
                type: DataTypes.DATE,
                defaultValue: DataTypes.NOW,
            },
            updated_at: {
                type: DataTypes.DATE,
                defaultValue: DataTypes.NOW,
            },
        },
        {
            tableName: 'password_reset_tokens',
            timestamps: true,
            createdAt: 'created_at',
            updatedAt: 'updated_at',
        }
    );

    PasswordResetToken.associate = (models) => {
        PasswordResetToken.belongsTo(models.User, { foreignKey: 'user_id', as: 'user' });
    };

    return PasswordResetToken;
};
