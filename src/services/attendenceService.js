const Attendance = require('../models/attendenceModel');
const DemoAttendance = require('../models/demoAttendanceModel');
const Activity = require('../models/activityModel');
const User = require('../models/userModel');
const Outlet = require('../models/outletModel');
const { uploadToS3 } = require('../config/s3');
const { where, fn, col, Op } = require("sequelize")
const moment = require('moment');

const getCurrentTime = () => {
    return new Date().toISOString();
};

const folder = process.env.AWS_S3_BUCKET_FOLDER || 'PMI'

const checkIn = async (data, files) => {
    try {
        const { activity_id, checkin_latitude, checkin_longitude, checkin_address, comment_check_in, user_id, appMode } = data;
        const activityExists = await Activity.findByPk(data.activity_id);
        if (!activityExists) {
            return { error: "Activity not found" };
        }

        const outlet = await Outlet.findByPk(activityExists.outlet_id, {
            attributes: ['outlet_latitude', 'outlet_longitude', 'isTestingOutlet'],
        });

        if (!outlet) {
            return { error: "Outlet not found" };
        }

        const outletLat = parseFloat(outlet.outlet_latitude);
        const outletLng = parseFloat(outlet.outlet_longitude);
        const userLat = parseFloat(checkin_latitude);
        const userLng = parseFloat(checkin_longitude);

        const checkin_distance = distance(userLat, userLng, outletLat, outletLng, 'MT');
        let geoFencingAllowed = outlet.isTestingOutlet == 0 ? 1 : 0
        if (geoFencingAllowed == 1) {
            if (checkin_distance > 500) {
                return { error: `Out of geofencing range (${checkin_distance} meters). Check-in allowed only within 500 meters.` };
            }
        }

        const checkin_selfie = files?.checkin_selfie ? await uploadToS3(files.checkin_selfie[0], `${folder}/attendance/checkin/${user_id}`) : null;
        const checkin_outlet_selfie = files?.checkin_outlet_selfie ? await uploadToS3(files.checkin_outlet_selfie[0], `${folder}/attendance/checkin/${user_id}`) : null;

        let objData = {
            user_id,
            activity_id,
            checkin_latitude,
            checkin_longitude,
            checkin_address,
            checkin_selfie,
            checkin_outlet_selfie,
            comment_check_in,
            checkin_distance,
            checkin_time: getCurrentTime(),
            attendence_date: new Date().toISOString().split('T')[0],
        }
        let attendance ={}
        if (appMode == 'demo') {
            attendance = await DemoAttendance.create(objData);
        } else {
            attendance = await Attendance.create(objData);
        }

        return { msg: "Checked in successfully", data: attendance };
    } catch (error) {
        return { error: error.message };
    }
};

const checkOut = async (attendence_id, data, files) => {
    try {
        const { checkout_latitude, checkout_longitude, checkout_address, comment_check_out, user_id, appMode } = data;

        let attendance =""
        if (appMode == 'demo') {
            attendance = await DemoAttendance.findByPk(attendence_id);
        } else {
            attendance = await Attendance.findByPk(attendence_id);
        }

        if (!attendance) {
            return { error: "Attendance record not found" };
        }

        // Prevent checkout if it already exists
        if (attendance.checkout_time) {
            return { error: "Check-out already exists for this attendance record" };
        }

        const activityExists = await Activity.findByPk(attendance.activity_id);
        if (!activityExists) {
            return { error: "Activity not found" };
        }

        const outlet = await Outlet.findByPk(activityExists.outlet_id, {
            attributes: ['outlet_latitude', 'outlet_longitude', 'isTestingOutlet'],
        });

        if (!outlet) {
            return { error: "Outlet not found" };
        }

        const outletLat = parseFloat(outlet.outlet_latitude);
        const outletLng = parseFloat(outlet.outlet_longitude);
        const userLat = parseFloat(checkout_latitude);
        const userLng = parseFloat(checkout_longitude);

        const checkout_distance = distance(userLat, userLng, outletLat, outletLng, 'MT');
        let geoFencingAllowed = outlet.isTestingOutlet == 0 ? 1 : 0
        if (geoFencingAllowed == 1) {
            if (checkout_distance > 500) {
                return { error: `Out of geofencing range (${checkout_distance} meters). Check-out allowed only within 500 meters.` };
            }
        }


        const checkout_selfie = files?.checkout_selfie ? await uploadToS3(files.checkout_selfie[0], `${folder}/attendance/checkout/${user_id}`) : null;
        const checkout_outlet_selfie = files?.checkout_outlet_selfie ? await uploadToS3(files.checkout_outlet_selfie[0], `${folder}/attendance/checkout/${user_id}`) : null;

        attendance.checkout_latitude = checkout_latitude;
        attendance.checkout_longitude = checkout_longitude;
        attendance.checkout_address = checkout_address;
        attendance.checkout_selfie = checkout_selfie;
        attendance.checkout_outlet_selfie = checkout_outlet_selfie;
        attendance.comment_check_out = comment_check_out;
        attendance.checkout_distance = checkout_distance;
        attendance.checkout_time = getCurrentTime();

        await attendance.save();

        return { msg: "Checked out successfully", data: attendance };
    } catch (error) {
        return { error: error.message };
    }
};

const getAllAttendances = async (filters) => {
    try {
        const { activity_id, user_id, user_type, city_id, start_date, end_date } = filters;
        let whereConditions = {};

        if (activity_id) {
            whereConditions = Object.assign(whereConditions, {
                activity_id : activity_id
            });
        }

        if (user_id) {
            whereConditions = Object.assign(whereConditions, {
                user_id : user_id
            });
        }

        if (user_type) {
            whereConditions = Object.assign(whereConditions, {
                "$user.role$" : user_type
            });
        }

        if (city_id) {
            whereConditions = Object.assign(whereConditions, {
                "$user.city$" : where(fn('LOWER', col('city')), city_id.toLowerCase().trim())
            });
        }
        if (start_date && end_date) {
            whereConditions = Object.assign(whereConditions, {
                [Op.and]: [
                    {
                        attendence_date: {
                            [Op.gte]: moment(start_date).format("YYYY-MM-DD")
                        }
                    }, 
                    {
                        attendence_date: {
                            [Op.lte]: moment(end_date).format("YYYY-MM-DD")
                        }
                    }
                ]
            })
        }

        const attendances = await Attendance.findAll({
            where: whereConditions,
            include: [
                {
                    model: Activity,
                    as: 'activity',
                    required: true,
                    attributes: ['activity_type', 'activity_day', 'city_id'],
                },
                {
                    model: User,
                    as: 'user',
                    required: true,
                    attributes: ['firstname', 'lastname', 'email', 'user_code', 'role', 'city'],
                }
            ],
            order: [
                ['id', 'DESC']
            ]
        });

        return attendances;
    } catch (error) {
        console.log({error});
        
        return { error: error.message };
    }
};

module.exports = {
    checkIn,
    checkOut,
    getAllAttendances
};


function distance(latitudeOne = '', longitudeOne = '', latitudeTwo = '', longitudeTwo = '', distanceUnit = 'KM', round = false, decimalPoints = 3) {
    if (!decimalPoints) {
        decimalPoints = 3;
    }
    if (!distanceUnit) {
        distanceUnit = 'KM';
    }

    distanceUnit = distanceUnit.toLowerCase();
    const pointDifference = longitudeOne - longitudeTwo;

    const toSin = (Math.sin(degToRad(latitudeOne)) * Math.sin(degToRad(latitudeTwo))) +
        (Math.cos(degToRad(latitudeOne)) * Math.cos(degToRad(latitudeTwo)) * Math.cos(degToRad(pointDifference)));

    const toAcos = Math.acos(toSin);
    const toRad2Deg = radToDeg(toAcos);

    const toMiles = toRad2Deg * 60 * 1.1515;
    const toKilometers = toMiles * 1.609344;
    const toNauticalMiles = toMiles * 0.8684;
    const toMeters = toKilometers * 1000;
    const toFeets = toMiles * 5280;
    const toYards = toFeets / 3;

    switch (distanceUnit.toUpperCase()) {
        case 'ML': // Miles
            return round ? Math.round(toMiles) : parseFloat(toMiles.toFixed(decimalPoints));
        case 'KM': // Kilometers
            return round ? Math.round(toKilometers) : parseFloat(toKilometers.toFixed(decimalPoints));
        case 'MT': // Meters
            return round ? Math.round(toMeters) : parseFloat(toMeters.toFixed(decimalPoints));
        case 'FT': // Feet
            return round ? Math.round(toFeets) : parseFloat(toFeets.toFixed(decimalPoints));
        case 'YD': // Yards
            return round ? Math.round(toYards) : parseFloat(toYards.toFixed(decimalPoints));
        case 'NM': // Nautical Miles
            return round ? Math.round(toNauticalMiles) : parseFloat(toNauticalMiles.toFixed(decimalPoints));
        default:
            return null;
    }
}

function degToRad(degrees) {
    return degrees * (Math.PI / 180);
}

function radToDeg(radians) {
    return radians * (180 / Math.PI);
}