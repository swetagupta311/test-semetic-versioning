const express = require('express');
const router = express.Router();
const permissions = require('../seeder/permissions');

// Define your routes here
router.get('/role-permission', permissions.rolePermissions);
// router.get('/create-fake-survey', permissions.createFakeSurvey);

module.exports = router;