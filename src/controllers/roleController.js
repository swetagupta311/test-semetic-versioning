const {success, failed} = require('../helper/response');
const Permission = require('../models/permissionModel');
const User = require('../models/userModel');
module.exports = {
    roles : async (req, res, next) => {
        try {
            if(req.query.type == "admin") {
                let roles = [
                    {
                        id : 3,
                        slug : "superadmin",
                        name : "Super Admin",
                        types : "admin"
                    },
                    {
                        id : 4,
                        slug : "admin",
                        name : "Admin",
                        types : "admin"
                    },
                    {
                        id : 5,
                        slug : "programManager",
                        name : "Program Manager",
                        types : "admin"
                    },
                    {
                        id : 6,
                        slug : "cityManager",
                        name : "Program Manager",
                        types : "admin"
                    },
                    {
                        id : 7,
                        slug : "mis",
                        name : "MIS",
                        types : "admin"
                    },
                    {
                        id : 8,
                        slug : "auditor",
                        name : "Auditor",
                        types : "admin"
                    }
                ]

                res.status(200).json(roles);
                return;
            } else {
                let roles = [
                    {
                        id : 1,
                        slug : "fwp",
                        name : "FWP",
                        types : "mobile"
                    },
                    {
                        id : 2,
                        slug : "supervisor",
                        name : "Supervisor",
                        types : "mobile"
                    }
                ]

                res.status(200).json(roles);
                return;
            }
        } catch (error) {
            next(error);
        }
     },

     permissions : async (req, res, next) => {
        try {
            
            let userRole = await User.findOne({
                where : {
                    id : req.userId
                },
                attributes : ['role']
            });

            let permissions = await Permission.findOne({
                where : {
                    role : userRole.role
                },
                attributes : ['permissionUrl']
            });

            let permission = JSON.parse(permissions.permissionUrl);

            return success(res, permission);
        } catch (error) {
            return failed(error.message);
        }
     }
}