const { DataTypes, Model } = require('sequelize');
const sequelize = require('../config/database');

class City extends Model {}
City.init({
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  state_name: {
    type: DataTypes.STRING(50),
    allowNull: true,
  },
  city_name: {
    type: DataTypes.STRING(50),
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
  modelName: 'City',
  tableName: 'city',
  timestamps: false,
});

class Brand extends Model {}
Brand.init({
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  brand_name: {
    type: DataTypes.STRING(50),
    allowNull: false,
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
  modelName: 'Brand',
  tableName: 'brand',
  timestamps: false,
});

class CityBrand extends Model {}
CityBrand.init({
  city_id: {
    type: DataTypes.INTEGER,
    references: {
      model: City,
      key: 'id',
    },
    onDelete: 'CASCADE',
  },
  brand_id: {
    type: DataTypes.INTEGER,
    references: {
      model: Brand,
      key: 'id',
    },
    onDelete: 'CASCADE',
  },
}, {
  sequelize,
  modelName: 'CityBrand',
  tableName: 'city_brand',
  timestamps: false,
});

class Variant extends Model {}
Variant.init({
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  brand_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: Brand,
      key: 'id',
    },
    onDelete: 'CASCADE',
  },
  variant_name: {
    type: DataTypes.STRING(50),
    allowNull: false,
  },
  packSize : {
    type: DataTypes.STRING(50),
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
  modelName: 'Variant',
  tableName: 'variant',
  timestamps: false,
});


City.belongsToMany(Brand, { through: CityBrand, foreignKey: 'city_id', as: 'brands' });
Brand.belongsToMany(City, { through: CityBrand, foreignKey: 'brand_id', as: 'cities' });

Brand.hasMany(Variant, { foreignKey: 'brand_id', as: 'variants' });
Brand.hasMany(CityBrand, { foreignKey: 'brand_id', as: 'cityBrand' });
Variant.belongsTo(Brand, { foreignKey: 'brand_id' });

module.exports = { City, Brand, CityBrand, Variant };
