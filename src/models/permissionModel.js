const { DataTypes, Model } = require('sequelize');
const sequelize = require('../config/database');

class Permission extends Model {}
Permission.init({
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  role: {
    type: DataTypes.STRING(50),
    allowNull: true,
  },
//   permissionName: {
//     type: DataTypes.STRING(50),
//     allowNull: true,
//   },
  permissionUrl: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  created_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
  },
  updated_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
  },
}, {
  sequelize,
  modelName: 'Permission',
  tableName: 'permissions',
  timestamps: false,
});

module.exports = Permission;