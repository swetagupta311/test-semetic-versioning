const { DataTypes, Model } = require('sequelize');
const sequelize = require('../config/database');
const Activity = require('./activityModel');
const { Brand, Variant } = require('./cityModel');
const User = require('./userModel');

class Survey extends Model { }

Survey.init({
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  activity_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: Activity,
      key: 'id',
    },
    onDelete: 'CASCADE',
    comment: "The activity to which this survey belongs",
  },
  user_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: User,
      key: 'id',
    },
    onDelete: 'CASCADE',
    comment: "The user who submitted this survey",
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
    allowNull: true,
    references: {
      model: Brand,
      key: 'id',
    },
    onDelete: 'CASCADE',
    comment: "The brand selected by the respondent",
  },
  variant_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: Variant,
      key: 'id',
    },
    onDelete: 'CASCADE',
    comment: "The variant of the selected brand",
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
    allowNull: true,
    references: {
      model: Brand,
      key: 'id',
    },
    onDelete: 'CASCADE',
    comment: "The changed brand selected by the respondent",
  },
  competitor_variant_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: Variant,
      key: 'id',
    },
    onDelete: 'CASCADE',
    comment: "The changed variant of the selected brand",
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
  modelName: 'Survey',
  tableName: 'survey',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  paranoid: true,
  deletedAt: 'deletedAt'
});

Activity.hasMany(Survey, { foreignKey: 'activity_id', as: 'surveys' });
Activity.hasMany(Survey, { foreignKey: 'activity_id', as: 'surveyData' });
Survey.belongsTo(Activity, { foreignKey: 'activity_id', as: 'activity' });

Brand.hasMany(Survey, { foreignKey: 'brand_id', as: 'surveys' });
Survey.belongsTo(Brand, { foreignKey: 'brand_id', as: 'brand' });

Survey.belongsTo(Brand, { foreignKey: 'competitor_brand_id', as: 'competitonBrand' });

Variant.hasMany(Survey, { foreignKey: 'variant_id', as: 'surveys' });
Survey.belongsTo(Variant, { foreignKey: 'variant_id', as: 'variant' });

Survey.belongsTo(Variant, { foreignKey: 'competitor_variant_id', as: 'comptitonVariant' });

User.hasMany(Survey, { foreignKey: 'user_id', as: 'surveys' });
Survey.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

module.exports = Survey;
