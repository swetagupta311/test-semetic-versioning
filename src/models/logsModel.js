const { DataTypes, Model } = require('sequelize');
const sequelize = require('../config/database');

class Logs extends Model {}
Logs.init({
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },
  method: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  userId: {
    type: DataTypes.BIGINT,
    allowNull: false,
    defaultValue : 0
  },
  baseUrl : {
    type: DataTypes.TEXT,
    allowNull: true
  },
  urlEndPoint: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  fullUrl : {
    type: DataTypes.TEXT,
    allowNull: true
  },
  requests : {
    type: DataTypes.TEXT,
    allowNull: true
  },
  status : {
    type: DataTypes.SMALLINT,
    defaultValue : 1
  },
  message : {
    type: DataTypes.TEXT,
    allowNull: true
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
  modelName: 'Logs',
  tableName: 'logs',
  timestamps: false,
});

module.exports = Logs;