const { DataTypes, Model } = require('sequelize');
const sequelize = require('../config/database');
const Permission = require('./permissionModel');
const CryptoJS = require('crypto-js');
require('dotenv').config();

class User extends Model { }

User.init({
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  firstname: {
    type: DataTypes.STRING(50),
    allowNull: true,
  },
  lastname: {
    type: DataTypes.STRING(50),
    allowNull: true,
  },
  email: {
    type: DataTypes.STRING(255),
    allowNull: true,
  },
  phone: {
    type: DataTypes.STRING(255),
    allowNull: false,
    unique: true,
  },
  user_code: {
    type: DataTypes.STRING(255),
    allowNull: true,
  },
  code: {
    type: DataTypes.STRING(255),
    allowNull: true,
  },
  password: {
    type: DataTypes.STRING(255),
    allowNull: true,
  },
  code_expiry: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: "The expiration time for the verification or reset code.",
  },
  role: {
    type: DataTypes.STRING(50),
    defaultValue: 'fwp',
    allowNull: true,
  },
  dob: {
    type: DataTypes.DATEONLY,
    allowNull: true,
  },
  state: {
    type: DataTypes.STRING(100),
    allowNull: true,
  },
  city: {
    type: DataTypes.STRING(100),
    allowNull: true,
  },
  aadhar_photo: {
    type: DataTypes.STRING(255),
    allowNull: true,
  },
  c4_validation: {
    type: DataTypes.INTEGER,
    defaultValue: 1,
    validate: {
      isIn: [[0, 1]],
    },
  },
  c4_photo: {
    type: DataTypes.STRING(255),
    allowNull: true,
  },
  is_active: {
    type: DataTypes.INTEGER,
    defaultValue: 1,
    validate: {
      isIn: [[0, 1]],
    },
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
  modelName: 'User',
  tableName: 'users',
  timestamps: false,
});

User.belongsTo(Permission, { 
  foreignKey: 'role', 
  targetKey: 'role',
  as: 'rolePermissions' 
});

module.exports = User;