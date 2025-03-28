const { DataTypes, Model } = require('sequelize');
const sequelize = require('../config/database');
const User =  require('./userModel');
const Activity  =  require('./activityModel');


class demoAttendance extends Model {}

demoAttendance.init({
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  user_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: User,
      key: 'id',
    },
    onDelete: 'CASCADE',
  },
  activity_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: Activity,
      key: 'id',
    },
    onDelete: 'CASCADE',
    comment: "The activity to which this attendance record belongs",
  },
  attendence_date: {
    type: DataTypes.DATEONLY,
    allowNull: true,
  },
  checkin_time: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  checkout_time: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  checkin_latitude: {
    type: DataTypes.FLOAT,
    allowNull: true,
  },
  checkin_longitude: {
    type: DataTypes.FLOAT,
    allowNull: true,
  },
  checkin_address: {
    type: DataTypes.STRING(255),
    allowNull: true,
  },
  checkin_distance: {
    type: DataTypes.FLOAT,
    allowNull: true,
    comment: "Distance between check-in location and assigned outlet",
  },
  checkin_selfie: {
    type: DataTypes.STRING(255),
    allowNull: true,
    comment: "User's selfie at check-in",
  },
  checkin_outlet_selfie: {
    type: DataTypes.STRING(255),
    allowNull: true,
    comment: "Picture of the outlet taken by the user at check-in",
  },
  checkout_latitude: {
    type: DataTypes.FLOAT,
    allowNull: true,
  },
  checkout_longitude: {
    type: DataTypes.FLOAT,
    allowNull: true,
  },
  checkout_address: {
    type: DataTypes.STRING(255),
    allowNull: true,
  },
  checkout_distance: {
    type: DataTypes.FLOAT,
    allowNull: true,
    comment: "Distance between check-out location and assigned outlet",
  },
  checkout_selfie: {
    type: DataTypes.STRING(255),
    allowNull: true,
    comment: "User's selfie at check-out",
  },
  checkout_outlet_selfie: {
    type: DataTypes.STRING(255),
    allowNull: true,
    comment: "Picture of the outlet taken by the user at check-out",
  },
  comment_check_in: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  comment_check_out: {
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
  modelName: 'demoAttendance',
  tableName: 'demo_attendance',
  timestamps: false,
});

// User.hasMany(Attendance, { foreignKey: 'user_id', as: 'attendances' });
// Attendance.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

// Activity.hasMany(Attendance, { foreignKey: 'activity_id', as: 'attendances' });
// Attendance.belongsTo(Activity, { foreignKey: 'activity_id', as: 'activity' });

module.exports = demoAttendance;