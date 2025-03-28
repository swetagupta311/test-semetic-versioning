const { DataTypes, Model } = require('sequelize');
const sequelize = require('../config/database');

class Category extends Model {}
Category.init({
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  name: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  code: {
    type: DataTypes.STRING(50),
    allowNull: true,
  },
  city_id: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    allowNull: false
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
  modelName: 'Category',
  tableName: 'categories',
  timestamps: false,
  paranoid: true
});

module.exports = Category;