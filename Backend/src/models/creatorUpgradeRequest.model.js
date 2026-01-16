module.exports = (sequelize, DataTypes) => {
    const CreatorUpgradeRequest = sequelize.define('CreatorUpgradeRequest', {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        user_id: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: {
                model: 'users',
                key: 'id'
            }
        },
        reason: {
            type: DataTypes.TEXT,
            allowNull: true
        },
        intended_usage: {
            type: DataTypes.ENUM('academic', 'business', 'personal', 'other'),
            defaultValue: 'other'
        },
        status: {
            type: DataTypes.ENUM('pending', 'approved', 'rejected'),
            defaultValue: 'pending'
        },
        admin_comment: {
            type: DataTypes.TEXT,
            allowNull: true
        },
        reviewed_by: {
            type: DataTypes.INTEGER,
            allowNull: true,
            references: {
                model: 'users',
                key: 'id'
            }
        },
        reviewed_at: {
            type: DataTypes.DATE,
            allowNull: true
        }
    }, {
        tableName: 'creator_upgrade_requests',
        timestamps: true,
        underscored: true
    });

    CreatorUpgradeRequest.associate = (models) => {
        CreatorUpgradeRequest.belongsTo(models.User, {
            foreignKey: 'user_id',
            as: 'user'
        });
        CreatorUpgradeRequest.belongsTo(models.User, {
            foreignKey: 'reviewed_by',
            as: 'reviewer'
        });
    };

    return CreatorUpgradeRequest;
};
