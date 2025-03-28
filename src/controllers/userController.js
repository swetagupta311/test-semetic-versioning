const userService = require('../services/userService');
const { success, failed, validationFailed } = require('../helper/response');

const requestVerificationCode = async (req, res, next) => {
  try {
    const { phone } = req.body;
    const response = await userService.generateVerificationCode(phone);
    if (response.error) {
      return res.status(400).json({ error: response.error });
    }
    res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};

const loginUser = async (req, res, next) => {
  try {
    const { phone, code } = req.body;
    const response = await userService.loginUser(phone, code);
    if (response.error) {
      return res.status(400).json({ error: response.error });
    }
    res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};

const loginUserWithCred = async (req, res, next) => {
  try {
    const { phone, password } = req.body;
    const response = await userService.loginUserWithCred(phone, password);
    if (response.error) {
      return res.status(400).json({ error: response.error });
    }
    res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};

const createUser = async (req, res, next) => {
  try {
    const userId = req.userId;
    const result = await userService.createUser(userId, req.body, req.files);
    if (result.error) {
      return failed(res, result.error);
      // return res.status(400).json({ error: result.error });
    }
    return success(res, {}, "Successfull Registered");
    // res.status(201).json({ msg: 'Successfull Registered' });
  } catch (error) {
    return failed(res, error.message);
    // next(error);
  }
};

const updateProfile = async (req, res, next) => {
  try {
    const result = await userService.updateProfile(req.body, req.files);
    if (result.error) {
      return failed(res, result.error);
      // return res.status(400).json({ error: result.error });
    }
    // res.status(200).json(result);
    return success(res, result, "");
  } catch (error) {
    return failed(res, error.message);
    next(error);
  }
};

const getUserProfile = async (req, res, next) => {
  try {
    const userId = req.userId;
    const user = await userService.getUserById(userId);
    res.status(200).json(user);
  } catch (error) {
    next(error);
  }
};

const getUsers = async (req, res, next) => {
  try {
    const filters = req.query;
    const users = await userService.getUsers(filters);
    res.status(200).json(users);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  requestVerificationCode,
  loginUser,
  loginUserWithCred,
  createUser,
  updateProfile,
  getUserProfile,
  getUsers
};