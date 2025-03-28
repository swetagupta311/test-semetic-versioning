const Permission = require('../models/permissionModel');
const Survey = require("../models/surveyModel");
const { faker } = require('@faker-js/faker');
const sequelize = require('../config/database');

module.exports = {
  rolePermissions: async (req, res, next) => {
    try {
      let data = [
        {
          id: 1,
          role: "admin",
          permissionUrl: `["adduser", "updateProfile", "getUsers", "addcity", "getcities", "roles", "getCityDetails", "getCityBrands", "editcity", "deletecity", "addbrand", "getbrands", "getBrandsVariants", "editbrand", "deletebrand", "editvariant", "deletevariant", "addoutlet", "getoutlets", "outletById", "editoutlet", "deleteoutlet", "addactivity", "getactivities", "activityById", "editactivity", "deleteactivity", "getsurveys", "exportsurveys", "surveyById", "editsurvey", "create-survey", "update-survey", "checkin", "checkout", "attendances", "get-user-city", "export-attendances", "permissions"]`
        },
        {
          id: 2,
          role: "programManager",
          permissionUrl: `["adduser", "updateProfile", "getUsers", "addcity", "getcities", "roles", "getCityDetails", "getCityBrands", "editcity", "addbrand", "getbrands", "getBrandsVariants", "editbrand", "editvariant", "addoutlet", "getoutlets", "outletById", "editoutlet", "addactivity", "getactivities", "activityById", "editactivity", "getsurveys", "exportsurveys", "surveyById", "editsurvey", "create-survey", "update-survey", "checkin", "checkout", "attendances", "get-user-city", "export-attendances", "permissions"]`
        },
        {
          id: 3,
          role: "cityManager",
          permissionUrl: `["adduser", "updateProfile", "getUsers", "addcity", "getcities", "roles", "getCityDetails", "getCityBrands", "editcity", "deletecity", "addbrand", "getbrands", "getBrandsVariants", "editbrand", "deletebrand", "editvariant", "deletevariant", "addoutlet", "getoutlets", "outletById", "editoutlet", "deleteoutlet", "addactivity", "getactivities", "activityById", "editactivity", "deleteactivity", "getsurveys", "exportsurveys", "surveyById", "editsurvey", "create-survey", "update-survey", "checkin", "checkout", "get-user-city", "permissions"]`
        },
        {
          id: 4,
          role: "mis",
          permissionUrl: `["getcities", "getoutlets", "getsurveys", "exportsurveys", "attendances", "export-attendances", "get-user-city", "roles", "getUsers", "permissions"]`
        },
        {
          id: 5,
          role: "auditor",
          permissionUrl: `["permissions"]`
        },
        {
          id: 6,
          role: "superadmin",
          permissionUrl: `["adduser", "updateProfile", "getUsers", "addcity", "getcities", "roles", "getCityDetails", "getCityBrands", "editcity", "deletecity", "addbrand", "getbrands", "getBrandsVariants", "editbrand", "deletebrand", "editvariant", "deletevariant", "addoutlet", "getoutlets", "outletById", "editoutlet", "deleteoutlet", "addactivity", "getactivities", "activityById", "editactivity", "deleteactivity", "getsurveys", "exportsurveys", "surveyById", "editsurvey", "create-survey", "update-survey", "checkin", "checkout", "attendances", "get-user-city", "export-attendances", "permissions"]`
        },
        {
          id: 7,
          role: "special_user",
          permissionUrl: `["getUsers", "addcity", "getcities", "roles", "getCityBrands", "getbrands", "getBrandsVariants", "getoutlets", "getactivities", "activityById", "getsurveys", "exportsurveys", "surveyById", "create-survey", "update-survey", "permissions"]`
        }
      ];

      await Permission.bulkCreate(data);

      res.json({
        message: "Role Permission Created"
      });
    } catch (error) {
      console.log(error);
      next(error.message);
    }
  },

  createFakeSurvey: async (req, res, next) => {
    try {
      // Disable foreign key constraints
      await sequelize.query('SET session_replication_role = replica');

      for (let index = 0; index < 1000000; index++) {
        let gender = faker.person.sex();
        let getMaxId = await Survey.findOne({
          attributes: [
            "id"
          ],
          order: [["id", "desc"]]
        })
        let reqData = {
          id: getMaxId.id + 1,
          user_id: faker.number.int({ min: 1, max: 100 }),
          activity_id: faker.number.int({ min: 1, max: 100 }),
          age: faker.number.int({ min: 18, max: 100 }),
          do_you_smoke: 1,
          participate_survey: 1,
          name: faker.name.fullName(),
          gender: gender.charAt(0).toUpperCase() + gender.slice(1),
          brand_id: faker.number.int({ min: 1, max: 100 }),
          variant_id: faker.number.int({ min: 1, max: 100 }),
          other: "",
          latitude: faker.location.latitude(),
          longitude: faker.location.longitude(),
          competitor_brand_id: 46,
          competitor_variant_id: faker.number.int({ min: 139, max: 156 }),
          competitor_other: "",
          product_rating: faker.number.int({ min: 1, max: 3 }),
          pack_rating: faker.number.int({ min: 1, max: 3 }),
          stick_rating: faker.number.int({ min: 1, max: 3 }),
          feedback: "",
        };
        await Survey.create(reqData);
      }

      // Re-enable foreign key constraints
      await sequelize.query('SET session_replication_role = DEFAULT');

      res.json({
        message: "Faker executed successfully"
      });
    } catch (error) {
      console.log(error);
      next(error.message);
    }
  }
};