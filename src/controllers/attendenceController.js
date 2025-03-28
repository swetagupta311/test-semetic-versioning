const attendenceService = require('../services/attendenceService');
const Attendence = require("../models/attendenceModel")
const User = require("../models/userModel")
const Activity = require('../models/activityModel')
const moment = require('moment')
const excel = require('exceljs');
const { Op, fn, col, where } = require("sequelize")

const checkIn = async (req, res, next) => {
  try {
    const { role, userId } = req;
    if (role !== 'supervisor' && role !== 'fwp') {
      return res.status(403).json({ error: 'Only for Fwp & Supervisor' });
    }

    const attendenceData = { ...req.body, user_id: userId };
    const response = await attendenceService.checkIn(attendenceData, req.files);
    if (response.error) {
      return res.status(400).json({ error: response.error });
    }
    res.status(201).json(response);
  } catch (error) {
    next(error);
  }
};

const checkOut = async (req, res, next) => {
  try {
    const { role, userId } = req;
    if (role !== 'supervisor' && role !== 'fwp') {
      return res.status(403).json({ error: 'Only for Fwp & Supervisor' });
    }

    const attendenceData = { ...req.body, user_id: userId };
    const response = await attendenceService.checkOut(req.params.id, attendenceData, req.files);
    if (response.error) {
      return res.status(400).json({ error: response.error });
    }
    res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};

const getAllUserCity = async (req, res, next) => {
  try {
    let users = await User.findAll({
      attributes : [
        [fn('DISTINCT', fn('LOWER', col('city'))), 'city']
      ],
      order :[
        [fn('LOWER', col('city')), 'ASC']
        // ['city', 'ASC']
      ],
      where: {
        city: {
          [Op.ne]: null // Exclude null values
        }
      }
    })

    let formattedCities = users
                          .map(user => user.city)
                          .map(city => city.replace(/\s+/g, ' ').trim()) // Replace multiple spaces with a single space
                          .map(city => city.split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')) // Capitalize each word
                          .filter((value, index, self) => self.indexOf(value) === index);
    res.status(200).json(formattedCities)
  } catch (error) {
    console.log({error});
    
    next(error);
  }
}

const getAllAttendances = async (req, res, next) => {
  try {
    const { user_id, activity_id, city_id, user_type, start_date, end_date } = req.query;

    const filters = {};

    if (user_id) filters.user_id = user_id;
    if (start_date) filters.start_date = start_date;
    if (end_date) filters.end_date = end_date;
    if (activity_id) filters.activity_id = activity_id;
    if (user_type) filters.user_type = user_type;
    if (city_id) filters.city_id = city_id;

    const response = await attendenceService.getAllAttendances(filters);

    if (response.error) {
      return res.status(400).json({ error: response.error });
    }

    res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};

const exportAttendance = async (req, res, next) => {
  try {
      let params = {}

      let city_id = req.query.city_id ? req.query.city_id : "";
      let activity_id = req.query.activity_id ? req.query.activity_id : "";
      let user_id = req.query.user_id ? req.query.user_id : "";
      let user_type = req.query.user_type ? req.query.user_type : "";
      let start_date = req.query.start_date ? req.query.start_date : "";
      let end_date = req.query.end_date ? req.query.end_date : "";

      if (activity_id) {
          params = Object.assign(params, {
              activity_id : activity_id
          });
      }

      if (user_id) {
          params = Object.assign(params, {
              user_id : user_id
          });
      }
      
      if (user_type) {
          params = Object.assign(params, {
              "$user.role$" : user_type
          });
      }

      if (city_id) {
          params = Object.assign(params, {
             "$user.city$" : where(fn('LOWER', col('city')), city_id.toLowerCase().trim())
              // "$activity.city_id$" : city_id
          });
      }

      if (start_date && end_date) {
            params = Object.assign(params, {
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

      let attendances = await Attendence.findAll({
          where : params,
          include: [
              {
                model: Activity,
                as: 'activity',
                required: true,
                attributes: ['activity_type', 'activity_day', 'city_id'],
              },
              {
                  model : User,
                  as : 'user',
                  attributes : [
                      "id",
                      "firstname",
                      "lastname",
                      "city",
                      "role",
                      "user_code"
                  ]
              }
          ],
          order: [
              ['id', 'DESC']
          ]
      })
      let attendanceArray = [];
      for (let i = 0; i < attendances.length; i++) {
          let NcheckInTime = moment(attendances[i].checkin_time,'YYYY-MM-DD HH:mm:ss')
          let NcheckOutTime = moment(attendances[i].checkout_time,'YYYY-MM-DD HH:mm:ss')
          // Calculate the difference in seconds
          const durationInSeconds = NcheckOutTime.diff(NcheckInTime, 'seconds');

          // Convert the duration in seconds to HH:mm:ss format
          const duration = moment.utc(durationInSeconds * 1000).format('HH:mm:ss');
          
          // let checkInTime = moment(attendances[i].checkin_time)
          // let checkOutTime = moment(attendances[i].checkout_time)
          // let diffInSeconds = checkOutTime.diff(checkInTime, 'seconds');
          // let workingTime;
          // let timeUnit = ""
          // if (diffInSeconds > 3600) {
          //   workingTime = (diffInSeconds / 3600).toFixed(2);
          //     timeUnit = 'Hours'
          // } else if (diffInSeconds > 60) {
          //   workingTime = (diffInSeconds / 60).toFixed(2); 
          //     timeUnit = 'Minutes'
          // } else {
          //   workingTime = diffInSeconds;
          //   timeUnit = 'Seconds'
          // }
          let attendanceData = {
              Sno: i+1,
              Id : attendances[i].id,
              Name : attendances[i].user.firstname + " " + attendances[i].user.lastname,
              City : attendances[i].user.city,
              Designation : attendances[i].user.role,
              EmployeeCode : attendances[i].user.user_code,
             // Date : `${moment(attendances[i].checkin_time).format("YYYY-MM-DD") } / ${moment(attendances[i].checkout_time).format("YYYY-MM-DD")}`,
              Date : `${moment(attendances[i].checkin_time).format("DD-MMM-YYYY") }`,
              Coordinates : `Lat:${attendances[i].checkin_latitude} Long:${attendances[i].checkin_longitude} / Lat:${attendances[i].checkout_latitude} Long:${attendances[i].checkout_longitude}`,
             CheckIn : attendances[i].checkin_time ? new Date(attendances[i].checkin_time).toLocaleString("en-US", {
                timeZone: 'Asia/Kolkata',
                hour12: false,               // Use 24-hour format
                hour: '2-digit',             // Show hours in 2-digit format
                minute: '2-digit',           // Show minutes in 2-digit format
                second: '2-digit'            // Show seconds in 2-digit format
              }) : ""
              ,
              //CheckIn : moment(attendances[i].checkin_time).format("HH:mm:ss"),
              //CheckOut : moment(attendances[i].checkout_time).format("HH:mm:ss"),
              CheckOut : attendances[i].checkout_time ? new Date(attendances[i].checkout_time).toLocaleString("en-US", {
                timeZone: 'Asia/Kolkata',
                hour12: false,               // Use 24-hour format
                hour: '2-digit',             // Show hours in 2-digit format
                minute: '2-digit',           // Show minutes in 2-digit format
                second: '2-digit'            // Show seconds in 2-digit format
              }) : ""
              ,
             // WorkingHrs : workingTime ? workingTime + " " + timeUnit : "",
              WorkingHrs : duration,
              CheckInSelfieImage : attendances[i].checkin_selfie,
              CheckOutSelfieImage : attendances[i].checkout_selfie,
              CheckInOutletSelfieImage : attendances[i].checkin_outlet_selfie,
              CheckOutOutletSelfieImage : attendances[i].checkout_outlet_selfie,
          }

          attendanceArray.push(attendanceData)
      }

      let workbook = new excel.Workbook();
      let worksheet = workbook.addWorksheet("attendance");

      worksheet.columns = [
          {
              header: "S.No",
              key: "Sno",
              width: 5,
              style: { alignment: { horizontal: 'center' } }
          },
          {
              header: "Date",
              key: "Date",
              width:15,
              style: { alignment: { horizontal: 'center' } }
          },
          {
              header: "Name",
              key: "Name",
              width:20,
              style: { alignment: { horizontal: 'center' } }
          },
          {
              header: "City",
              key: "City",
              width:20,
              style: { alignment: { horizontal: 'center' } }
          },
          {
              header: "Designation",
              key: "Designation",
              width:20,
              style: { alignment: { horizontal: 'center' } }
          },
          {
              header: "Employee Code",
              key: "EmployeeCode",
              width:20,
              style: { alignment: { horizontal: 'center' } }
          },
          {
              header: "Coordinates",
              key: "Coordinates",
              width: 70,
              style: { alignment: { horizontal: 'center' } }
          },
          {
              header: "Check In",
              key: "CheckIn",
              width: 20,
              style: { alignment: { horizontal: 'center' } }
          },
          {
              header: "Check Out",
              key: "CheckOut",
              width: 20,
              style: { alignment: { horizontal: 'center' } }
          },
          {
              header: "Working Hours",
              key: "WorkingHrs",
              width: 20,
              style: { alignment: { horizontal: 'center' } }
          },
          {
              header : "CheckIn Selfie Image",
              key : "CheckInSelfieImage",
              width : 130,
              style: { alignment: { horizontal: 'center' } }
          },
          {
              header : "CheckIn Outlet Selfie Image",
              key : "CheckInOutletSelfieImage",
              width : 130,
              style: { alignment: { horizontal: 'center' } }
          },
          {
              header: "CheckOut Selfie Image",
              key: "CheckOutSelfieImage",
              width: 130,
              style: { alignment: { horizontal: 'center' } }
          },
          {
              header: "CheckOut Outlet Selfie Image",
              key: "CheckOutOutletSelfieImage",
              width: 130,
              style: { alignment: { horizontal: 'center' } }
          }
      ];

      worksheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFF' } };  // White font
      worksheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '000000' } };  // Black background

      // // Add Array Rows
      worksheet.addRows(attendanceArray);

      res.setHeader(
          "Content-Type",
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      );
      res.setHeader(
          "Content-Disposition",
          "attachment; filename=" + "attendance.xlsx"
      );

      await workbook.xlsx.write(res);
     
      // res.status(201).json({surveyArray});
      
      // res.status(201).json({attendanceArray});
  } catch (error) {
      console.log
      ({
          error
      })
      return catchFailed(res, error.message);
  }
}


module.exports = {
  checkIn,
  checkOut,
  getAllAttendances,
  exportAttendance,
  getAllUserCity
};