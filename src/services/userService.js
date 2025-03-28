const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { Op, where, col, fn } = require('sequelize');
const path = require('path');
const fs = require('fs');
const User = require('../models/userModel');
const Attendance = require('../models/attendenceModel');
const transporter = require('../config/mailer');
require('dotenv').config();
const { uploadToS3 } = require('../config/s3');
const axios = require('axios');

const JWT_SECRET = process.env.JWT_SECRET


const generateVerificationCode = async (phone) => {
  try {
    const user = await User.findOne({ where: { phone } });
    if (!user) {
      return { error: 'User not found' };
    }

    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiryTime = new Date();
    expiryTime.setMinutes(expiryTime.getMinutes() + 2);

    await User.update({ code, code_expiry: expiryTime }, { where: { phone } });

    const SMS_USER = process.env.SMS_USER
    const SMS_PASS = process.env.SMS_PASS

    let config = {
      method: 'get',
      maxBodyLength: Infinity,
      url: `https://www.smsjust.com/blank/sms/user/urlsms.php?username=${SMS_USER}&pass=${SMS_PASS}&senderid=VMSEAB&dest_mobileno=${phone}&message=Hello User, Your Verification OTP is ${code} and valid till 2 minutes. Do not share this OTP for security reasons. -VMSEAB&response=Y&dlttempid=1107168613837110619`,
      headers: { }
    };
    
    axios.request(config)
    .then((response) => {
      console.log(JSON.stringify(response.data));
    })
    .catch((error) => {
      console.log(error);
    });

    return { msg: 'Verification code sent successfully' };
  } catch (error) {
    throw new Error(error.message);
  }
};


const loginUser = async (phone, code) => {
  try {
    const user = await User.findOne({ where: { phone } });
    if (!user) {
      return { error: 'Invalid phone number' };
    }

    if (user.code !== code) {
      return { error: 'Invalid code' };
    }

    if (user.code_expiry && new Date() > user.code_expiry) {
      return { error: 'Code has expired' };
    }

    const token = jwt.sign({ id: user.id, phone: user.phone, role: user.role }, JWT_SECRET, { expiresIn: '24h' });

    return { msg: 'Login Successfully', access_token: token, role: user.role };
  } catch (error) {
    throw new Error(error.message);
  }
};

const loginUserWithCred = async (phone, password) => {
  try {
    const user = await User.findOne({ where: { phone } });
    if (!user) {
      return { error: 'Invalid phone number or password' };
    }

    if (!['admin', 'superadmin', 'special_user', 'programManager', 'cityManager', 'mis', 'auditor'].includes(user.role)) {// added special_user
      return { error: 'Unauthorized access' };
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return { error: 'Invalid phone number or password' };
    }

    if (!user.is_active) {
      return { error: 'User account is inactive' };
    }

    const token = jwt.sign(
      { id: user.id, phone: user.phone, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    return { msg: 'Login Successfully', access_token: token, role: user.role };
  } catch (error) {
    throw new Error(error.message);
  }
};


const createUser = async (id, userData, files) => {
  try {
    if (userData.email) {
      const existingEmail = await User.findOne({ where: { email: userData.email } });
      if (existingEmail) {
        return { error: 'Email already exists.' };
      }
    }

    const existingPhone = await User.findOne({ where: { phone: userData.phone } });
    if (existingPhone) {
      return { error: 'Phone number already exists.' };
    }

    let cityName = await capitalizeFirstLetterAndReplaceSpaces(userData.city)

    userData.city = cityName

    if (files.aadhar_photo) {
      userData.aadhar_photo = await uploadToS3(files.aadhar_photo[0], 'PMI/aadhar');
    }

    if (files.c4_photo) {
      userData.c4_photo = await uploadToS3(files.c4_photo[0], 'PMI/c4');
    }

    let prefix = "MIP-us-";
    if (userData.role === "supervisor") {
      prefix = "MIP-SU-";
    } else if (userData.role === "fwp") {
      prefix = "MIP-FW-";
    }
    let userCode;
    let isUnique = false;

    while (!isUnique) {
      const randomNum = Math.floor(1000 + Math.random() * 9000);
      userCode = `${prefix}${randomNum}`; 

      const userExists = await User.findOne({ where: { user_code: userCode } });
      if (!userExists) {
        isUnique = true;
      }
    }

    userData.email = userData.email ? userData.email : null 
    userData.firstname = userData.firstname.toUpperCase()
    userData.lastname = userData.lastname ? userData.lastname.toUpperCase() : ""

    const user = await User.create({
      ...userData,
      user_code: userCode
    });

    return user;
  } catch (error) {
    if (error.name === 'SequelizeUniqueConstraintError') {
      throw new Error('Email or Phone already exists. Please use a different one.');
    } else {
      throw new Error('An error occurred while creating the user: ' + error.message);
    }
  }
};


const updateProfile = async (data, files) => {
  try {
    const user = await User.findOne({ where: { id: data.user_id } });
    if (!user) {
      return { error: 'User Not Found' };
    }

    if (files.aadhar_photo) {
      data.aadhar_photo = await uploadToS3(files.aadhar_photo[0], 'PMI/aadhar');
    }
    if (files.c4_photo) {
      data.c4_photo = await uploadToS3(files.c4_photo[0], 'PMI/c4');
    }
    if (data.city) {
      let cityName = await capitalizeFirstLetterAndReplaceSpaces(data.city)
      data.city = cityName
    }
    userData.email = userData.email ? userData.email : null 
    data.firstname = data.firstname.toUpperCase()
    data.lastname = data.lastname ? data.lastname.toUpperCase() : ""

    await User.update(data, { where: { id: data.user_id } });
    return { msg: 'User updated successfully' };
  } catch (error) {
    throw new Error(error.message);
  }
};


// const getUserById = async (id) => {
//   try {
//     const user = await User.findByPk(id, {
//       attributes: ['id', 'firstname', 'lastname', 'email', 'phone', 'role', 'dob', 'state', 'city', 'c4_validation', 'user_code'],
//     });

//     if (!user) {
//       throw new Error('User not found');
//     }

//     return user;
//   } catch (error) {
//     throw new Error(error.message);
//   }
// };

const getUserById = async (id) => {
  try {
    const user = await User.findByPk(id, {
      attributes: [
        'id', 'firstname', 'lastname', 'email', 'phone', 'role', 'dob', 
        'state', 'city', 'c4_validation', 'user_code'
      ],
      include: [
        {
          model: Attendance,
          as: 'attendances',
          attributes: ['id', 'checkin_time', 'checkout_time'],
          order: [['checkin_time', 'DESC']],
          limit: 1,
        },
      ],
    });

    if (!user) {
      throw new Error('User not found');
    }

    const lastAttendance = user.attendances?.[0] || null;
    let lastCheckStatus = null;
    if (lastAttendance) {
      if (lastAttendance.checkin_time && !lastAttendance.checkout_time) {
        lastCheckStatus = 'Checked In';
      } else if (lastAttendance.checkin_time && lastAttendance.checkout_time) {
        lastCheckStatus = 'Checked Out';
      }
    }

    return {
      ...user.toJSON(),
      lastCheckStatus,
    };
  } catch (error) {
    throw new Error(error.message);
  }
};


const getUsers = async (filters) => {
  try {
    const { city, role } = filters;
    let whereConditions = {
      is_active: '1',
    };

    if (role) {
      whereConditions.role = role;
    } else {
      whereConditions.role = { [Op.or]: ['fwp', 'supervisor'] };
    }
    if (city) {
      whereConditions = Object.assign(whereConditions, {
        city : where(fn('LOWER', col('city')), city.toLowerCase().trim())
      })
    }

    const users = await User.findAll({
      attributes: ['id', 'firstname', 'lastname', 'email', 'phone', 'role', 'dob', 'state', 'city', 'c4_validation', 'user_code'],
      where: whereConditions,
      order : [
        ["created_at" , "DESC"]
      ]
    });
    return users;
  } catch (error) {
    throw new Error(error.message);
  }
};

const capitalizeFirstLetterAndReplaceSpaces = async(inputString) => {
  // Replace multiple spaces with a single space using a regular expression
  let cleanedString = inputString.replace(/\s+/g, ' ').trim();

  // Capitalize the first letter of each word
  cleanedString = cleanedString.replace(/\b\w/g, char => char.toUpperCase());

  return cleanedString;
}

module.exports = {
  generateVerificationCode,
  loginUser,
  loginUserWithCred,
  createUser,
  updateProfile,
  getUserById,
  getUsers
};