const { DataTypes, Model } = require('sequelize');
const sequelize = require('../config/database');
const Activity = require('./activityModel');
const { Brand, Variant } = require('./cityModel');
const User = require('./userModel');

class DeletedSurvey extends Model { }

DeletedSurvey.init({
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  survey_id : {
    type: DataTypes.INTEGER,
    allowNull: false
  }, 
  activity_id: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  user_id: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  age: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  do_you_smoke: {
    type: DataTypes.BOOLEAN,
    allowNull: true,
    comment: "Indicates whether the respondent smokes (true/false)",
  },
  participate_survey: {
    type: DataTypes.BOOLEAN,
    allowNull: true,
    comment: "Indicates whether the respondent wants to participate (true/false)",
  },
  name: {
    type: DataTypes.STRING(255),
    allowNull: true,
  },
  gender: {
    type: DataTypes.STRING(50),
    allowNull: true,
  },
  brand_id: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  variant_id: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  numberOfSticks: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
  },
  other: {
    type: DataTypes.STRING(50),
    allowNull: true,
  },
  competitor_brand_id: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  competitor_variant_id: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  competitor_other: {
    type: DataTypes.STRING(50),
    allowNull: true,
  },
  latitude: {
    type: DataTypes.FLOAT,
    allowNull: true,
  },
  longitude: {
    type: DataTypes.FLOAT,
    allowNull: true,
  },
  signature: {
    type: DataTypes.STRING(255),
    allowNull: true,
  },
  feedback: {
    type: DataTypes.STRING(255),
    allowNull: true,
  },
  product_rating: {
    type: DataTypes.STRING(50),
    allowNull: true,
  },
  pack_rating: {
    type: DataTypes.STRING(50),
    allowNull: true,
  },
  stick_rating: {
    type: DataTypes.STRING(50),
    allowNull: true,
  },
  createdBySpecialUser: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
  },
  specialUserId: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  created_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
  },
  updated_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
  },
  deletedAt: {
    type: DataTypes.DATE,
    allowNull: true,  // Allow NULL for active records
  },
}, {
  sequelize,
  modelName: 'DeletedSurvey',
  tableName: 'deleted_survey',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  paranoid: true,
  deletedAt: 'deletedAt'
});

Activity.hasMany(DeletedSurvey, { foreignKey: 'activity_id', as: 'deletedSurveys' });
// Activity.hasMany(DeletedSurvey, { foreignKey: 'activity_id', as: 'surveyData' });
DeletedSurvey.belongsTo(Activity, { foreignKey: 'activity_id', as: 'activity' });

Brand.hasMany(DeletedSurvey, { foreignKey: 'brand_id', as: 'deletedSurveys' });
DeletedSurvey.belongsTo(Brand, { foreignKey: 'brand_id', as: 'brand' });

DeletedSurvey.belongsTo(Brand, { foreignKey: 'competitor_brand_id', as: 'competitonBrand' });

Variant.hasMany(DeletedSurvey, { foreignKey: 'variant_id', as: 'deletedSurveys' });
DeletedSurvey.belongsTo(Variant, { foreignKey: 'variant_id', as: 'variant' });

DeletedSurvey.belongsTo(Variant, { foreignKey: 'competitor_variant_id', as: 'comptitonVariant' });

User.hasMany(DeletedSurvey, { foreignKey: 'user_id', as: 'deletedSurveys' });
DeletedSurvey.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

module.exports = DeletedSurvey;
