const { DataTypes, Model } = require('sequelize');
const sequelize = require('../config/database');
const {City} = require('./cityModel');

class Outlet extends Model {}

Outlet.init({
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  city_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: City,
      key: 'id',
    },
    onDelete: 'CASCADE',
  },
  outlet_name: {
    type: DataTypes.STRING(50),
    allowNull: true,
  },
  outlet_code: {
    type: DataTypes.STRING(50),
    allowNull: true,
  },
  outlet_address: {
    type: DataTypes.STRING(255),
    allowNull: true,
  },
  outlet_area: {
    type: DataTypes.STRING(100),
    allowNull: true,
  },
  outlet_latitude: {
    type: DataTypes.STRING(50),
    allowNull: true,
  },
  outlet_longitude: {
    type: DataTypes.STRING(50),
    allowNull: true,
  },
  isTestingOutlet : {
    type: DataTypes.INTEGER,
    defaultValue: 0,
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
  modelName: 'Outlet',
  tableName: 'outlet',
  timestamps: false,
});

City.hasMany(Outlet, { foreignKey: 'city_id', as: 'outlets' });
Outlet.belongsTo(City, { foreignKey: 'city_id', as: 'city' });

module.exports = Outlet;
