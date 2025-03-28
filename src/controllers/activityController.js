const activityService = require('../services/activityService');
const { success, failed, validationFailed } = require('../helper/response');

const createActivity = async (req, res, next) => {
    try {
        const result = await activityService.createActivity(req.body);
        if (result.error) {
            return failed(res, result.error);
            // return res.status(404).json({ error: result.error });
        }
        return success(res, result, "");
        // res.status(201).json(result);
    } catch (error) {
        return failed(res, error.message);
        // next(error);
    }
};

const getAllActivities = async (req, res, next) => {
    try {
        const activities = await activityService.getAllActivities(req);
        return success(res, activities, "");
        // res.status(200).json(activities);
    } catch (error) {
        return failed(res, error.message);
        // next(error);
    }
};

const getActivityById = async (req, res) => {
    try {
        const result = await activityService.getActivityById(req.params.id);
        if (result.error) {
            return failed(res, result.error);
            // return res.status(404).json({ error: result.error });
        }
        return success(res, result, "");
        // res.status(200).json(result);
    } catch (error) {
        return failed(res, error.message);
        // next(error);
    }
};

const updateActivity = async (req, res, next) => {
    try {
        const result = await activityService.updateActivity(req.params.id, req.body);
        if (result.error) {
            return failed(res, result.error);
            // return res.status(404).json({ error: result.error });
        }
        return success(res, result, "");
        // res.status(200).json(result);
    } catch (error) {
        return failed(res, error.message);
        // next(error);
    }
};

const deleteActivity = async (req, res, next) => {
    try {
        const result = await activityService.deleteActivity(req.params.id);
        if (result.error) {
            return failed(res, result.error);
            // return res.status(404).json({ error: result.error });
        }
        return success(res, result, "");
        // res.status(200).json(result);
    } catch (error) {
        return failed(res, error.message);
        // next(error);
    }
};


const getTodayActivity = async (req, res, next) => {
  try {
    const { role, userId } = req;

    if (role !== 'supervisor' && role !== 'fwp') {
      return res.status(403).json({ error: 'Only for Fwp & Supervisor' });
    }

    const todayActivities = await activityService.getTodayActivity(role, userId);
    res.status(200).json(todayActivities);
  } catch (error) {
    next(error);
  }
};

module.exports = {
    createActivity,
    getAllActivities,
    getActivityById,
    updateActivity,
    deleteActivity,
    getTodayActivity
};
