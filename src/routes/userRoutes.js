const express = require('express');
const { body, param } = require('express-validator');
const limitRequests = require('../middlewares/rateLimiter');
const validateRequest = require('../middlewares/validationMiddleware');
const { verifyToken, verifyAdmin } = require('../middlewares/authMiddleware');
const { parseArrayFields, parseNormalFields } = require('../middlewares/parse');
const multer = require('multer');
const { upload } = require('../middlewares/fileUpload');
const moment = require('moment');

// Controllers
const userController = require('../controllers/userController');
const cityController = require('../controllers/cityController');
const outletController = require('../controllers/outletController');
const activityController = require('../controllers/activityController')
const surveyController = require('../controllers/surveyController')
const attendenceController = require('../controllers/attendenceController')
const roleController = require('../controllers/roleController')
const DatabaseController = require('../controllers/DatabaseController');
const versionController = require('../controllers/versionController');
const LogController = require('../socketController/LogController');

const router = express.Router();
// router.use(limitRequests);


// ******************************* User Controller Start Here ************************************* //
router.post('/requestVerificationCode',
  [
    body('phone').notEmpty().isNumeric().withMessage('Valid phone number is required'),
  ],
  validateRequest,
  userController.requestVerificationCode
);

router.post('/login',
  [
    body('phone').notEmpty().isNumeric().withMessage('Valid phone number is required'),
    body('code').notEmpty().isNumeric().isLength({ min: 6 }).withMessage('Code is required'),
  ],
  validateRequest,
  userController.loginUser
);

router.post('/loginwithcred',
  [
    body('phone').notEmpty().isNumeric().withMessage('Valid phone number is required'),
    body('password').notEmpty().withMessage('password is required'),
  ],
  validateRequest,
  userController.loginUserWithCred
);

router.post('/adduser', verifyToken, verifyAdmin,
  upload.fields([
    { name: 'aadhar_photo', maxCount: 1 },
    { name: 'c4_photo', maxCount: 1 },
  ]),
  parseNormalFields(['firstname', 'lastname', 'email', 'phone', 'role', 'dob', 'state', 'city', 'c4_validation']),
  [
    body('firstname').notEmpty().isString().withMessage('Firstname is required'),
    // body('lastname').notEmpty().isString().withMessage('Lastname is required'),
    // body('email').optional().isEmail().withMessage('Valid email is required'),
    body('phone').notEmpty().isNumeric().isLength({ min: 10, max: 10 }).withMessage('Phone number must be exactly 10 digits'),
    body('role').notEmpty().isIn(['fwp', 'supervisor']).withMessage('Role must be either "fwp" or "supervisor"'),
    body('dob').notEmpty().matches(/^\d{4}-\d{2}-\d{2}$/).withMessage('DOB must be in format YYYY-MM-DD')
      .custom((value) => {
        const dob = new Date(value);
        if (isNaN(dob.getTime())) {
          throw new Error('Invalid date format');
        }
        const today = new Date();

        let age = today.getFullYear() - dob.getFullYear();
        const monthDiff = today.getMonth() - dob.getMonth();
        const dayDiff = today.getDate() - dob.getDate();

        if (monthDiff < 0 || (monthDiff === 0 && dayDiff < 0)) {
          age--;
        }

        if (age < 21) {
          throw new Error('User must be at least 21 years old');
        }
        return true;
      }),
    body('state').notEmpty().withMessage('State is required'),
    body('city').notEmpty().withMessage('City is required'),
    body('c4_validation').notEmpty().isInt({ min: 0, max: 1 }).withMessage('c4_validation must be either 0 or 1'),
  ],
  validateRequest,
  userController.createUser
);

router.put('/updateProfile', verifyToken, verifyAdmin,
  upload.fields([
    { name: 'aadhar_photo', maxCount: 1 },
    { name: 'c4_photo', maxCount: 1 },
  ]),
  parseNormalFields(['firstname', 'lastname', 'dob', 'state', 'city', 'user_id']),
  [
    body('firstname').optional().notEmpty().isString().withMessage('Firstname is required'),
    // body('lastname').optional().notEmpty().isString().withMessage('Lastname is required'),
    body('dob').optional().matches(/^\d{4}-\d{2}-\d{2}$/).withMessage('DOB must be in format YYYY-MM-DD')
      .custom((value) => {
        const dob = new Date(value);
        if (isNaN(dob.getTime())) {
          throw new Error('Invalid date format');
        }
        const today = new Date();

        let age = today.getFullYear() - dob.getFullYear();
        const monthDiff = today.getMonth() - dob.getMonth();
        const dayDiff = today.getDate() - dob.getDate();

        if (monthDiff < 0 || (monthDiff === 0 && dayDiff < 0)) {
          age--;
        }

        if (age < 21) {
          throw new Error('User must be at least 21 years old');
        }
        return true;
      }),
    body('state').optional().isString().withMessage('State is required'),
    body('city').optional().isString().withMessage('City is required'),
    body('user_id').optional().isInt().withMessage('User_id must be valid Integer'),
  ],
  validateRequest, userController.updateProfile);

router.get('/profile', verifyToken, userController.getUserProfile);
router.get('/getUsers', verifyToken, verifyAdmin, userController.getUsers);
// ******************************* User Controller End Here ************************************* //



// ******************************* City Controller Start Here ************************************* //
router.post('/addcity', verifyToken, verifyAdmin,
  [
    body('city_name').notEmpty().isString().withMessage('City name is required'),
    body('state_name').notEmpty().isString().withMessage('State name must be a string'),
    body('brands').isArray().withMessage('Brands must be an array of brand IDs'),
    body('brands.*').isInt().withMessage('Each brand ID must be an integer'),
  ],
  validateRequest,
  cityController.createCity
);

router.get('/getcities', verifyToken, verifyAdmin, cityController.getCities);
router.get('/roles', verifyToken, verifyAdmin, roleController.roles);
router.get('/permissions', verifyToken, verifyAdmin, roleController.permissions);

router.get('/getCityDetails/:city_id', verifyToken, verifyAdmin, [
  param('city_id').isInt().withMessage('City ID must be an integer'),
],
  validateRequest, cityController.getCityDetails);

router.get('/getCityBrands/:city_id', verifyToken,
  [
    param('city_id').isInt().withMessage('City ID must be an integer'),
  ],
  validateRequest, cityController.getCityBrands);


router.put('/editcity/:id', verifyToken, verifyAdmin,
  [
    param('id').isInt().withMessage('City ID must be an integer'),
    body('city_name').optional().isString().withMessage('City name must be a string'),
    body('state_name').optional().isString().withMessage('State name must be a string'),
    body('brands').optional().isArray().withMessage('Brands must be an array of brand IDs'),
    body('brands.*').optional().isInt().withMessage('Each brand ID must be an integer'),
  ],
  validateRequest,
  cityController.updateCity
);

router.delete('/deletecity/:id', verifyToken, verifyAdmin,
  [param('id').isInt().withMessage('City ID must be an integer')],
  validateRequest,
  cityController.deleteCity
);





router.post('/addbrand', verifyToken, verifyAdmin,
  [
    body('brand_name').notEmpty().isString().withMessage('Brand name is required'),
    body('variants').isArray().withMessage('Variants should be an array'),
    body('variants.*').isString().withMessage('Each variant must be a string'),
  ],
  validateRequest,
  cityController.createBrand
);

router.get('/getbrands', verifyToken, verifyAdmin, cityController.getBrands);

router.get('/getBrandsVariants/:id', verifyToken,
  [
    param('id').isInt().withMessage('Brand ID must be an integer'),
  ],
  validateRequest, cityController.getBrandsVariants);

router.put('/editbrand/:id', verifyToken, verifyAdmin,
  [
    param('id').isInt().withMessage('Brand ID must be an integer'),
    body('brand_name').optional().isString().withMessage('Brand name must be a string'),
    body('variants').optional().isArray().withMessage('Variants should be an array'),
    body('variants_to_remove').optional().isArray().withMessage('Variants to remove should be an array'),
  ],
  validateRequest,
  cityController.updateBrand
);

router.delete('/deletebrand/:id', verifyToken, verifyAdmin,
  [param('id').isInt().withMessage('Brand ID must be an integer')],
  validateRequest,
  cityController.deleteBrand
);

router.put('/editvariant/:id', verifyToken, verifyAdmin,
  [
    param('id').isInt().withMessage('Brand ID must be an integer'),
    body('variant_name').optional().isString().withMessage('Variant name must be a string'),
  ],
  validateRequest,
  cityController.updateVariant
);

router.delete('/deletevariant/:id', verifyToken, verifyAdmin,
  [param('id').isInt().withMessage('Variant ID must be an integer')],
  validateRequest,
  cityController.deleteVariant
);
// ******************************* City Controller End Here ************************************* //




// ******************************* Outlet Controller Start Here ************************************* //
router.post('/addoutlet', verifyToken, verifyAdmin,
  [
    body('city_id').isInt().withMessage('City ID must be an integer'),
    body('outlet_name').notEmpty().withMessage('Outlet name is required'),
    body('outlet_address').notEmpty().withMessage('Outlet address is required'),
    body('outlet_area').notEmpty().withMessage('Outlet area is required'),
    // body('outlet_latitude').notEmpty().isFloat().withMessage('Latitude must be a number'),
    // body('outlet_longitude').notEmpty().isFloat().withMessage('Longitude must be a number'),
  ],
  validateRequest,
  outletController.createOutlet
);

router.get('/getoutlets', verifyToken, verifyAdmin, outletController.getOutlets);

router.get(
  '/outletById/:id', verifyToken, verifyAdmin,
  [param('id').isInt().withMessage('Outlet ID must be an integer')], validateRequest,
  outletController.getOutletById
);

router.put(
  '/editoutlet/:id', verifyToken, verifyAdmin,
  [
    param('id').isInt().withMessage('Outlet ID must be an integer'),
    body('city_id').optional().isInt().withMessage('City ID must be an integer'),
    body('outlet_name').optional().notEmpty().withMessage('Outlet name cannot be empty'),
    body('outlet_address').optional().notEmpty().withMessage('Outlet address cannot be empty'),
    body('outlet_area').optional().notEmpty().withMessage('Outlet area cannot be empty'),
    // body('outlet_latitude').optional().isFloat().withMessage('Latitude must be a number'),
    // body('outlet_longitude').optional().isFloat().withMessage('Longitude must be a number'),
  ],
  validateRequest,
  outletController.updateOutlet
);

router.delete(
  '/deleteoutlet/:id',
  [param('id').isInt().withMessage('Outlet ID must be an integer')], validateRequest,
  outletController.deleteOutlet
);
// ******************************* Outlet Controller End Here ************************************* //



// ******************************* Activity Controller Start Here ************************************* //
router.post(
  '/addactivity', verifyToken, verifyAdmin,
  [
    body('city_id').isInt().withMessage('City ID must be an integer'),
    body('outlet_id').isInt().withMessage('Outlet ID must be an integer'),
    body('activity_type').notEmpty().withMessage('Activity type is required'),
    body('start_date').isISO8601().withMessage('Activity start date must be a valid date'),
    body('end_date').isISO8601().withMessage('Activity end date must be a valid date'),
    body('start_time')
      .matches(/^([01]?[0-9]|2[0-3]):([0-5][0-9])(:([0-5][0-9]))?$/)
      .withMessage('Start time must be in HH:MM:SS format'),
    body('end_time')
      .matches(/^([01]?[0-9]|2[0-3]):([0-5][0-9])(:([0-5][0-9]))?$/)
      .withMessage('End time must be in HH:MM:SS format'),
    body('activity_day').notEmpty().withMessage('Activity day is required'),
    body('supervisor_id').notEmpty().isInt().withMessage('Supervisor ID must be an integer'),
    body('fwp1_id').notEmpty().isInt().withMessage('FWP1 ID must be an integer'),
    body('fwp2_id').notEmpty().isInt().withMessage('FWP2 ID must be an integer'),
  ],
  validateRequest,
  activityController.createActivity
);


router.get('/getactivities', verifyToken, verifyAdmin, activityController.getAllActivities);

router.get(
  '/activityById/:id', verifyToken, verifyAdmin,
  [param('id').isInt().withMessage('Activity ID must be an integer')],
  validateRequest,
  activityController.getActivityById
);

router.put(
  '/editactivity/:id', verifyToken, verifyAdmin,
  [
    param('id').isInt().withMessage('Activity ID must be an integer'),
    body('city_id').optional().isInt().withMessage('City ID must be an integer'),
    body('outlet_id').optional().isInt().withMessage('Outlet ID must be an integer'),
    body('activity_type').optional().notEmpty().withMessage('Activity type cannot be empty'),
    body('start_date').optional().isISO8601().withMessage('Activity start date must be a valid date'),
    body('end_date').optional().isISO8601().withMessage('Activity end date must be a valid date'),
    body('start_time').optional()
      .matches(/^([01]?[0-9]|2[0-3]):([0-5][0-9])(:([0-5][0-9]))?$/)
      .withMessage('Start time must be in HH:MM:SS format'),
    body('end_time').optional()
      .matches(/^([01]?[0-9]|2[0-3]):([0-5][0-9])(:([0-5][0-9]))?$/)
      .withMessage('End time must be in HH:MM:SS format'),
    body('activity_day').optional().notEmpty().withMessage('Activity day cannot be empty'),
    body('supervisor_id').optional().isInt().withMessage('Supervisor ID must be an integer'),
    body('fwp1_id').optional().isInt().withMessage('FWP1 ID must be an integer'),
    body('fwp2_id').optional().isInt().withMessage('FWP2 ID must be an integer'),
  ],
  validateRequest,
  activityController.updateActivity
);

router.delete(
  '/deleteactivity/:id',
  verifyToken,
  verifyAdmin,
  [param('id').isInt().withMessage('Activity ID must be an integer')],
  validateRequest,
  activityController.deleteActivity
);

router.get('/today-activity', verifyToken, activityController.getTodayActivity);

// ******************************* Activity Controller End Here ************************************* //



// ******************************* Survey Controller Start Here ************************************* //
router.post('/survey', verifyToken, [
  body('activity_id').isInt().withMessage('Activity ID must be an integer'),
  body('age').isInt({ min: 18 }).withMessage('Age must be an integer'),
  body('do_you_smoke').notEmpty().isInt({ min: 0, max: 1 }).withMessage('do_you_smoke must be either 0 or 1'),
  body('latitude').isFloat().withMessage('Latitude must be a number'),
  body('longitude').isFloat().withMessage('Longitude must be a number'),
],
  validateRequest,
  surveyController.createSurvey);

router.get('/getsurveys', verifyToken, verifyAdmin, surveyController.getAllSurveys);
router.get('/get-all-surveys', verifyToken, verifyAdmin, surveyController.getSurvey);

router.get('/exportsurveys', surveyController.exportSurvey);
// router.get('/export-mis-surveys', surveyController.exportMIPSurveyData);
router.get('/export-static-mis-surveys', surveyController.exportStaticMIPSurveyData);


router.get('/surveyById/:id', verifyToken, verifyAdmin,
  [param('id').isInt().withMessage('Survey ID must be an integer')],
  validateRequest, surveyController.getSurveyById);

router.delete('/delete-survey/:id', verifyToken, verifyAdmin, surveyController.deleteSurvey)

router.put('/editsurvey/:id', verifyToken,
  upload.fields([
    { name: 'signature', maxCount: 1 },
  ]),
  parseNormalFields(['participate_survey', 'name', 'gender', 'brand_id', 'variant_id', 'survey_id']),
  [
    param('id').isInt().withMessage('Survey ID must be an integer'),
    body('participate_survey').optional().isInt({ min: 0, max: 1 }).withMessage('participate_survey must be either 0 or 1'),
    body('name').optional().notEmpty().isString().withMessage('name must be valid string'),
    body('gender').optional().notEmpty().isString().withMessage('gender must be valid string'),
    body('brand_id').optional().isInt().withMessage('brand_id must be valid Integer'),
    body('variant_id').optional().isInt().withMessage('variant_id must be valid Integer'),
    body('other').optional().isString().withMessage('other must be valid string'),
    body('product_rating').optional().isInt({ min: 0, max: 5 }).withMessage('Product rating must be between 0 to 5'),
    body('pack_rating').optional().isInt({ min: 0, max: 5 }).withMessage('Pack rating must be between 0 to 5'),
    body('stick_rating').optional().isInt({ min: 0, max: 5 }).withMessage('Stick rating must be between 0 to 5'),
    body('feedback').optional().notEmpty().isString().withMessage('feedback must be valid string'),
  ],
  validateRequest, surveyController.updateSurvey);
// ******************************* Survey Controller End Here ************************************* //

// special user edit survey //
router.post('/create-survey', verifyToken, verifyAdmin,
  upload.fields([
    { name: 'signature', maxCount: 1 },
  ]),
surveyController.createSurveyBySpecialUser)

router.put('/update-survey/:id', verifyToken, verifyAdmin,
  upload.fields([
    { name: 'signature', maxCount: 1 },
  ]),
surveyController.updateSurveyBySpecialUser)
///////////////////////////////



// ******************************* Attendence Controller Start Here ************************************* //

router.post('/checkin', verifyToken,
  upload.fields([
    { name: 'checkin_selfie', maxCount: 1 },
    { name: 'checkin_outlet_selfie', maxCount: 1 },
  ]),
  parseNormalFields(['activity_id', 'checkin_latitude', 'checkin_longitude', 'checkin_address', 'comment_check_in']),
  [
    body('activity_id').isInt().withMessage('Activity ID must be an integer'),
    body('checkin_latitude').isFloat().withMessage('Latitude must be a number'),
    body('checkin_longitude').isFloat().withMessage('Longitude must be a number'),
    body('checkin_address').isString().withMessage('Address must be a String'),
    body('comment_check_in').optional().isString().withMessage('Comment must be a String'),
  ],
  validateRequest,
  attendenceController.checkIn);


router.put('/checkout/:id', verifyToken,
  upload.fields([
    { name: 'checkout_selfie', maxCount: 1 },
    { name: 'checkout_outlet_selfie', maxCount: 1 },
  ]),
  parseNormalFields(['checkout_latitude', 'checkout_longitude', 'checkout_address', 'comment_check_out']),
  [
    param('id').isInt().withMessage('Attendence ID must be an integer'),
    body('checkout_latitude').isFloat().withMessage('Latitude must be a number'),
    body('checkout_longitude').isFloat().withMessage('Longitude must be a number'),
    body('checkout_address').isString().withMessage('Address must be a String'),
    body('comment_check_out').optional().isString().withMessage('Comment must be a String'),
  ],
  validateRequest, attendenceController.checkOut);

  router.get('/attendances', verifyToken, verifyAdmin, attendenceController.getAllAttendances);
  router.get('/get-user-city', verifyToken, verifyAdmin, attendenceController.getAllUserCity);
  router.get('/export-attendances', attendenceController.exportAttendance);
  

// ******************************* Attendence Controller End Here ************************************* //

// Update version and apk //
router.post('/update-version', 
  upload.fields([
    { name: 'apk', maxCount: 1 },
  ]),versionController.addApkAndVersion)

router.get('/get-updated-version', verifyToken, versionController.updatedVersion)
router.post('/user-logs', verifyToken, LogController.appendToJsonFile)
router.get('/get-user-logs', verifyToken, LogController.getAllLogsFile)
router.get('/read-user-logs', verifyToken, LogController.readLogFile)
router.get('/delete-user-logs', verifyToken, LogController.removeLogFile)

////////////////////////////

// db export
// router.get('/export-db', DatabaseController.export);

module.exports = router;