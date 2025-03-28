const { DataTypes, Model } = require('sequelize');
const sequelize = require('../config/database');
const Outlet = require('./outletModel');
const User = require('./userModel');
const Attendance = require('./attendenceModel');
const { City } = require('../models/cityModel')

class Activity extends Model {}

Activity.init({
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  city_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  outlet_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: Outlet,
      key: 'id',
    },
    onDelete: 'CASCADE',
  },
  activity_type: {
    type: DataTypes.STRING(50),
    allowNull: true,
  },
  start_date: {
    type: DataTypes.DATEONLY,
    allowNull: true,
  },
  end_date: {
    type: DataTypes.DATEONLY,
    allowNull: true,
  },
  start_time: {
    type: DataTypes.TIME,
    allowNull: true,
  },
  end_time: {
    type: DataTypes.TIME,
    allowNull: true,
  },
  activity_day: {
    type: DataTypes.STRING(50),
    allowNull: true,
  },
  supervisor_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  fwp1_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  fwp2_id: {
    type: DataTypes.INTEGER,
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
  modelName: 'Activity',
  tableName: 'activity',
  timestamps: false,
});

Outlet.hasMany(Activity, { foreignKey: 'outlet_id', as: 'activities' });
Activity.belongsTo(Outlet, { foreignKey: 'outlet_id', as: 'outlet' });
Activity.belongsTo(User, { foreignKey: 'supervisor_id', as: 'supervisor' });
Activity.belongsTo(User, { foreignKey: 'fwp1_id', as: 'fwpOne' });
Activity.belongsTo(User, { foreignKey: 'fwp2_id', as: 'fwpTwo' });
Activity.belongsTo(City, { foreignKey: 'city_id', as: 'city' });

module.exports = Activity;
