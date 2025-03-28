const jwt = require('jsonwebtoken');
const User = require("../models/userModel")
const RolePermissions = require("../models/permissionModel")
require('dotenv').config();

const JWT_SECRET = process.env.JWT_SECRET;

const verifyToken = (req, res, next) => {
  const tokenHeader = req.headers['authorization'];

  if (!tokenHeader) {
    return res.status(403).send({ message: 'No token provided!' });
  }
  const token = tokenHeader.split(" ")[1];
  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err) {
      if (err.name === 'TokenExpiredError') {
        return res.status(401).send({ message: 'tokenExpired' });
      }
      return res.status(401).send({ message: 'Unauthorized!' });
    }
    req.userId = decoded.id;
    req.phone = decoded.phone;
    req.role = decoded.role;  
    next();
  });
};

const verifyAdmin = (req, res, next) => {
  if (req.role !== 'admin' && req.role !== 'superadmin' && req.role !== 'special_user' && req.role !== 'programManager' && req.role !== 'cityManager' && req.role !== 'mis' && req.role !== 'auditor') {
    return res.status(403).send({ message: 'Access denied!' });
  }

  // const parts = req.path.split("/").filter(Boolean); 
  let parts = req.path.replace(/^\/+/, "");
  parts = parts.replace(/\/\d+\/?$/, "");
  
  // const endpoint = parts.length ? parts[0] : null; 
  const endpoint = parts //.length ? parts[0] : null; 
  
  let userId = req.userId
  
  User.findOne({
      where: {
          id: userId
      },
      include: [
          {
              model: RolePermissions,
              as: "rolePermissions"
          }
      ]
  }).then(data => {
    if (!data || !data.rolePermissions || !data.rolePermissions.permissionUrl) {
      return res.status(403).send({ message: 'Access denied!' });
    }
    let permissions = JSON.parse(data.rolePermissions.permissionUrl);

    if (!permissions.includes(endpoint)) {
      return res.status(403).send({ message: 'Access denied!' });
    }
    next();
  })
  .catch(error => {
    return res.status(403).send({ message: 'Access denied!' });
  });
};


module.exports = { verifyToken, verifyAdmin };