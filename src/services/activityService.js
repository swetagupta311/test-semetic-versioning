const Activity = require('../models/activityModel');
const Outlet = require('../models/outletModel');
const User = require('../models/userModel');
const { City, Brand, CityBrand, Variant } = require('../models/cityModel');
const { Op, fn, col } = require('sequelize');
const sequelize = require('../config/database');
const moment = require("moment")

const createActivity = async (data) => {
    try {
        const outlet = await Outlet.findByPk(data.outlet_id);
        if (!outlet) {
            return { error: 'Outlet Not Found' };
        }

        const city = await City.findByPk(data.city_id);
        if (!city) {
            return { error: 'City Not Found' };
        }

        const supervisor = await User.findOne({
            where: { id: data.supervisor_id, role: 'supervisor' }
        });
        if (!supervisor) {
            return { error: 'Invalid Supervisor ID. Supervisor not found or incorrect role.' };
        }

        const fwp1 = await User.findOne({
            where: { id: data.fwp1_id, role: 'fwp' }
        });
        if (!fwp1) {
            return { error: 'Invalid FWP1 ID. FWP1 not found or incorrect role.' };
        }

        const fwp2 = await User.findOne({
            where: { id: data.fwp2_id, role: 'fwp' }
        });
        if (!fwp2) {
            return { error: 'Invalid FWP2 ID. FWP2 not found or incorrect role.' };
        }

        if (fwp1.id === fwp2.id) {
            return { error: 'Please Select 2 Different Fwp' };
        }



        const startDateTime = new Date(`${data.start_date} ${data.start_time}`);
        const endDateTime = new Date(`${data.end_date} ${data.end_time}`);

        const existingActivity = await Activity.findOne({
            where: {
                outlet_id: data.outlet_id,
                [Op.or]: [
                    {
                        start_date: {
                            [Op.between]: [startDateTime, endDateTime]
                        }
                    },
                    {
                        end_date: {
                            [Op.between]: [startDateTime, endDateTime]
                        }
                    }
                ]
            }
        });

        if (existingActivity) {
            return { error: 'An activity for this outlet during the given time range already exists.' };
        }

        let startDate = new Date(data.start_date)
        let normalizedStartDate = new Date(startDate);
        normalizedStartDate.setHours(0, 0, 0, 0); 

        // check that fwps and supervisor are already assignd for any activity for that perticular start date
        const existingActivityForSuperVisor = await Activity.findOne({
            where: {
                supervisor_id: data.supervisor_id,
                start_date: {
                    [Op.eq]: normalizedStartDate
                }
            }
        });

        if (existingActivityForSuperVisor) {
            return { error: 'Supervisor already assigned in an activity for given date.' };
        }

        const existingActivityForFwp1 = await Activity.findOne({
            where: {
                [Op.or] : [
                    {
                        fwp1_id: fwp1.id
                    },
                    {
                        fwp2_id: fwp1.id
                    }
                ],
                start_date: {
                    [Op.eq]: normalizedStartDate
                }
            }
        });

        if (existingActivityForFwp1) {
            return { error: 'FWP1 already assigned in an activity for given date.' };
        }

        const existingActivityForFwp2 = await Activity.findOne({
            where: {
                [Op.or] : [
                    {
                        fwp1_id: fwp2.id
                    },
                    {
                        fwp2_id: fwp2.id
                    }
                ],
                start_date: {
                    [Op.eq]: normalizedStartDate
                }
            }
        });

        if (existingActivityForFwp2) {
            return { error: 'FWP2 already assigned in an activity for given date.' };
        }

        // const newActivity = await Activity.create(data);

        return {
            msg: "Activity created successfully",
            activity: newActivity
        };
    } catch (error) {
        throw new Error(error.message);
    }
};

const getAllActivities = async (req) => {
    try {
        let outlet_id = req.query.outletId ? req.query.outletId : "" 
        let start_date = req.query.startDate ? req.query.startDate : "" 
        let end_date = req.query.endDate ? req.query.endDate : "" 
        let params = {}

        if (outlet_id) {
            params = Object.assign(params, {
                outlet_id : {
                    [Op.eq]: outlet_id
                } 
            })
        }

        if (start_date && end_date) {
            params = Object.assign(params, {
                [Op.and]: [
                    {
                        start_date: {
                            [Op.gte]: start_date
                        }
                    }, 
                    {
                        end_date: {
                            [Op.lte]: end_date
                        }
                    }
                ]
            })
        }
        return await Activity.findAll({
            where : params,
            include: [
                {
                model: Outlet,
                as: 'outlet',
                attributes: ['id', 'outlet_name']
                },
                {
                    model : User,
                    as : "fwpOne",
                    attributes : [
                        "id",
                        "firstname",
                        "lastname"
                    ]
                },
                {
                    model : User,
                    as : "fwpTwo",
                    attributes : [
                        "id",
                        "firstname",
                        "lastname"
                    ]
                }
            ]
        });
    } catch (error) {
        throw new Error(error.message);
    }
};

const getActivityById = async (id) => {
    try {
        const activity = await Activity.findByPk(id, {
            include: [{
                model: Outlet,
                as: 'outlet',
                attributes: ['id', 'outlet_name']
            },
            {
                model : User,
                as : "fwpOne",
                attributes : [
                    "id",
                    "firstname",
                    "lastname"
                ]
            },
            {
                model : User,
                as : "fwpTwo",
                attributes : [
                    "id",
                    "firstname",
                    "lastname"
                ]
            }]
        });

        if (!activity) {
            return { error: 'Activity Not Found' };
        }

        return activity;
    } catch (error) {
        throw new Error(error.message);
    }
};

const updateActivity = async (id, data) => {
    try {
        const activity = await Activity.findByPk(id);
        if (!activity) {
            return { error: 'Activity Not Found' };
        }

        // Validate outlet if provided
        if (data.outlet_id) {
            const outlet = await Outlet.findByPk(data.outlet_id);
            if (!outlet) {
                return { error: 'Outlet Not Found' };
            }
        }

        // Validate city if provided
        if (data.city_id) {
            const city = await City.findByPk(data.city_id);
            if (!city) {
                return { error: 'City Not Found' };
            }
        }

        // Validate supervisor if provided
        if (data.supervisor_id) {
            const supervisor = await User.findOne({
                where: { id: data.supervisor_id, role: 'supervisor' }
            });
            if (!supervisor) {
                return { error: 'Invalid Supervisor ID. Supervisor not found or incorrect role.' };
            }
        }

        // Validate FWP1 if provided
        let fwp1 = null;
        if (data.fwp1_id) {
            fwp1 = await User.findOne({
                where: { id: data.fwp1_id, role: 'fwp' }
            });
            if (!fwp1) {
                return { error: 'Invalid FWP1 ID. FWP1 not found or incorrect role.' };
            }
        }

        // Validate FWP2 if provided
        let fwp2 = null;
        if (data.fwp2_id) {
            fwp2 = await User.findOne({
                where: { id: data.fwp2_id, role: 'fwp' }
            });
            if (!fwp2) {
                return { error: 'Invalid FWP2 ID. FWP2 not found or incorrect role.' };
            }
        }
        
        // Ensure FWP1 and FWP2 are different if both are provided
        if (fwp1 && fwp2 && fwp1.id === fwp2.id) {
            return { error: 'Please Select 2 Different FWPs' };
        }

        if (data.outlet_id && data.start_date && data.end_date && data.start_time && data.end_time) {
            const startDateTime = new Date(`${data.start_date} ${data.start_time}`);
            const endDateTime = new Date(`${data.end_date} ${data.end_time}`);

            const existingActivity = await Activity.findOne({
                where: {
                    outlet_id: data.outlet_id,
                    id: { [Op.ne]: id },
                    [Op.or]: [
                        {
                            start_date: {
                                [Op.lte]: endDateTime
                            },
                            end_date: {
                                [Op.gte]: startDateTime
                            }
                        }
                    ]
                }
            });

            if (existingActivity) {
                return { error: 'An activity for this outlet during the given time range already exists.' };
            }
        }

        let startDate = new Date(data.start_date)
        let normalizedStartDate = new Date(startDate);
        normalizedStartDate.setHours(0, 0, 0, 0); 

        // check that fwps and supervisor are already assignd for any activity for that perticular start date
        const existingActivityForSuperVisor = await Activity.findOne({
            where: {
                supervisor_id: data.supervisor_id,
                id: { [Op.ne]: id },
                start_date: {
                    [Op.eq]: normalizedStartDate
                }
            }
        })

        if (existingActivityForSuperVisor) {
            return { error: 'Supervisor already assigned in an activity for given date.' };
        }

        const existingActivityForFwp1 = await Activity.findOne({
            where: {
                // fwp1_id: fwp1.id,
                [Op.or] : [
                    {
                        fwp1_id: fwp1.id
                    },
                    {
                        fwp2_id: fwp1.id
                    }
                ],
                id: { [Op.ne]: id },
                start_date: {
                    [Op.eq]: normalizedStartDate
                }
            }
        });

        if (existingActivityForFwp1) {
            return { error: 'FWP1 already assigned in an activity for given date.' };
        }

        const existingActivityForFwp2 = await Activity.findOne({
            where: {
                [Op.or] : [
                    {
                        fwp1_id: fwp2.id
                    },
                    {
                        fwp2_id: fwp2.id
                    }
                ],
                id: { [Op.ne]: id },
                start_date: {
                    [Op.eq]: normalizedStartDate
                }
            }
        });

        if (existingActivityForFwp2) {
            return { error: 'FWP2 already assigned in an activity for given date.' };
        }

        await activity.update(data);
        return { msg: "Activity updated successfully", activity };
    } catch (error) {
        throw new Error(error.message);
    }
};

const deleteActivity = async (id) => {
    try {
        const activity = await Activity.findByPk(id);
        if (!activity) {
            return { error: 'Activity Not Found' };
        }

        await activity.destroy();
        return { msg: "Activity deleted successfully" };
    } catch (error) {
        throw new Error(error.message);
    }
};

const getTodayActivity = async (role, userId) => {
    try {
        const today = new Date();
        const currentTime = new Date();
        const hours = String(currentTime.getHours()).padStart(2, '0');
        const minutes = String(currentTime.getMinutes()).padStart(2, '0');
        const seconds = String(currentTime.getSeconds()).padStart(2, '0');
        const time = `${hours}:${minutes}:${seconds}`;

        const year = today.getFullYear();
        const month = String(today.getMonth() + 1).padStart(2, '0'); // Months are zero-indexed
        const day = String(today.getDate()).padStart(2, '0');
        const date = `${year}-${month}-${day}`;

        // console.log(`Current Date: ${date}`);
        // console.log(`Current Time: ${time}`);
        if (time >= '00:00:00' && time <= '06:00:00') {
            today.setDate(today.getDate() - 1);
        }

        const whereCondition = {
            start_date: {
                [Op.eq]: today,
            },
        };

        // let currentDate = moment().format("YYYY-MM-DD");
        // let currentDate = new Date().toLocaleString("en-US", {
        //     timeZone: 'Asia/Kolkata',
        //     year: 'numeric', month: '2-digit', day: '2-digit'
        // });

        // let options = { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' };
        // let formattedDate = new Intl.DateTimeFormat('en-CA', options).format(new Date());

        // // Replace slashes with hyphens
        // let currentDate = formattedDate.replace(/\//g, '-');

        // // let currentTime = moment().format("HH:mm")+":00";
        // let currentTime = new Date().toLocaleString("en-US", {
        //     timeZone: 'Asia/Kolkata',
        //     hour12: false,               // Use 24-hour format
        //     hour: '2-digit',             // Show hours in 2-digit format
        //     minute: '2-digit',           // Show minutes in 2-digit format
        //     // second: '2-digit'            // Show seconds in 2-digit format
        // })+":00";
        // console.log({currentTime, currentDate});
        
        // const whereCondition = {
        //   [Op.and]: [
        //     {
        //       start_date: {
        //         [Op.lte]: currentDate,
        //       },
        //       end_date: {
        //         [Op.gte]: currentDate,
        //       },
        //     },
        //     {
        //       start_time: {
        //         [Op.lte]: currentTime,
        //       },
        //       end_time: {
        //         [Op.gte]: currentTime,
        //       },
        //     },
        //   ],
        // };
        
        // Add conditions based on the user role
        if (role === 'supervisor') {
            whereCondition.supervisor_id = userId;
        } else if (role === 'fwp') {
            whereCondition[Op.or] = [{ fwp1_id: userId }, { fwp2_id: userId }];
        }

        const activity = await Activity.findOne({
            where: whereCondition,
            order: [['start_date', 'ASC']],
            include: [
                {
                    model: Outlet,
                    as: 'outlet',
                    attributes: ['id', 'outlet_name', 'isTestingOutlet'],
                    include: [
                        {
                            model: City,
                            as: 'city',
                            attributes: ['id', 'city_name', 'state_name'],
                            include: [
                                {
                                    model: Brand,
                                    as: 'brands',
                                    attributes: ['id', 'brand_name'],
                                    through: { attributes: [] }, // Removes extra join table data
                                    include: [
                                        {
                                            model: Variant,
                                            as: 'variants',
                                            attributes: ['id', 'variant_name'],
                                        },
                                    ],
                                },
                            ],
                        },
                    ],
                },
            ],
        });

        if (!activity) {
            return { msg: "No activity assigned for today" };
            // return { msg: "No activity assigned for today" };
        }

        return activity;
    } catch (error) {
        throw new Error(error.message);
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
