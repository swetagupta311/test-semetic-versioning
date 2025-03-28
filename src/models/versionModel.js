const { DataTypes, Model } = require('sequelize');
const sequelize = require('../config/database');

class Version extends Model {}
Version.init({
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  version: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  fileName: {
    type: DataTypes.STRING(50),
    allowNull: true,
  },
  apkPath: {
    type: DataTypes.STRING,
    allowNull: true
  },
  status : {
    type: DataTypes.BOOLEAN,
    defaultValue : true,
    allowNull: true
  },
//   user_id: {
//     type: DataTypes.INTEGER,
//     allowNull: true,
//   },
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
  modelName: 'Version',
  tableName: 'versions',
  timestamps: false,
  paranoid: true
});

module.exports = Version;