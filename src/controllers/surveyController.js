const surveyService = require('../services/surveyService');
const User = require('../models/userModel')
const { Brand, Variant, City } = require('../models/cityModel')
const Survey = require('../models/surveyModel')
const DeletedSurvey = require('../models/deletedSurveyModel')
const Attendence = require('../models/attendenceModel')
const Activity = require('../models/activityModel')
const Outlet = require('../models/outletModel')
const { uploadToS3 } = require('../config/s3');
const { Validator } = require('node-input-validator');
const { success, failed, validationFailed } = require('../helper/response');
const excel = require('exceljs');
const moment = require('moment')
const { Op } = require("sequelize");


const createSurvey = async (req, res, next) => {
    try {
        const userId = req.userId;
        const surveyData = { ...req.body, user_id: userId };
        const result = await surveyService.createSurvey(surveyData);
        if (result.error) {
            return res.status(404).json({ error: result.error });
        }
        res.status(201).json(result);
    } catch (error) {
        next(error);
    }
};

const getAllSurveys = async (req, res, next) => {
    try {
        const activities = await surveyService.getAllSurveys(req.query, req.role, req.userId);
        return success(res, activities, "");
        // res.status(200).json(activities);
    } catch (error) {
        return failed(res, error.message);
        // next(error);
    }
};

const exportSurvey = async (req, res, next) => {
    try {
        let params = {}

        let City_id = req.query.City_id ? req.query.City_id : "";
        let outlet_id = req.query.outlet_id ? JSON.parse(req.query.outlet_id) : "";
        let start_date = req.query.start_date ? req.query.start_date : "";
        let end_date = req.query.end_date ? req.query.end_date : "";
        // let start_date = req.start_date ? new Date(req.start_date).toLocaleDateString("en-CA", { 
        //     timeZone: "Asia/Kolkata"
        // }) : "";
        // let end_date = req.end_date ? new Date(req.end_date).toLocaleDateString("en-CA", { 
        //     timeZone: "Asia/Kolkata"
        // }) : "";

        if (City_id) {
            params = Object.assign(params, {
                "$activity.city_id$": City_id
            })
        }

        // if (outlet_id) {
        //     params = Object.assign(params, {
        //         "$activity.outlet_id$" : outlet_id 
        //     })
        // }
        if (outlet_id && outlet_id.length > 0) {
            params = Object.assign(params, {
                "$activity.outlet_id$": {
                    [Op.in]: outlet_id
                }
            })
        }

        // if (start_date && end_date) {
        //     params = Object.assign(params, {
        //         [Op.and]: [
        //             {
        //                 "$activity.created_at$": {
        //                     [Op.gte]: new Date(start_date + " 00:00:00")
        //                 }
        //             }, 
        //             {
        //                 "$activity.created_at$": {
        //                     [Op.lte]: new Date(end_date + " 23:59:00")
        //                 }
        //             }
        //         ]
        //     })
        // }

        //  if (start_date && end_date) {
        //     params = Object.assign(params, {
        //         [Op.and]: [
        //             {
        //                 created_at: {
        //                     [Op.gte]: moment(start_date).format("YYYY-MM-DD")
        //                 }
        //             }, 
        //             {
        //                 created_at: {
        //                     [Op.lte]: moment(end_date).format("YYYY-MM-DD")
        //                 }
        //             }
        //         ]
        //     })
        // }

        if (start_date && end_date) {
            params = Object.assign(params, {
                [Op.and]: [
                    {
                        created_at: {
                            [Op.gte]: new Date(start_date + " 00:00:00")
                        }
                    },
                    {
                        created_at: {
                            [Op.lte]: new Date(end_date + " 23:59:00")
                        }
                    }
                ]
            })
        }

        let survey = await Survey.findAll({
            where: params,
            include: [
                {
                    model: Activity,
                    as: 'activity',
                    include: [
                        {
                            model: Outlet,
                            as: "outlet"
                        },
                        {
                            model: User, as: 'supervisor', attributes: [
                                "id",
                                "firstname",
                                "lastname",
                                "user_code"
                            ]
                        },
                        {
                            model: User, as: 'fwpOne', attributes: [
                                "id",
                                "firstname",
                                "lastname",
                                "user_code"
                            ]
                        },
                        {
                            model: User, as: 'fwpTwo', attributes: [
                                "id",
                                "firstname",
                                "lastname",
                                "user_code"
                            ]
                        },
                        {
                            model: City,
                            as: "city"
                        }
                    ]
                },
                { model: Brand, as: 'brand' },
                { model: Variant, as: 'variant' },
                { model: Brand, as: 'competitonBrand' },
                { model: Variant, as: 'comptitonVariant' },
                {
                    model: User,
                    as: 'user',
                    attributes: [
                        "id",
                        "firstname",
                        "lastname",
                        "user_code"
                    ]
                }
            ],
            order: [
                ['id', 'DESC']
            ]
        })
        let surveyArray = [];
        for (let i = 0; i < survey.length; i++) {
            let competitonBrand = survey[i].competitonBrand ? survey[i].competitonBrand.brand_name : ""
            let comptitonVariant = survey[i].comptitonVariant ? survey[i].comptitonVariant.variant_name : ""
            let brand = survey[i].brand ? survey[i].brand.brand_name : ""
            let variant = survey[i].variant ? survey[i].variant.variant_name : ""
            let surveyData = {
                Sno: i + 1,
                City: survey[i].activity.city.city_name,
                // Time : moment(survey[i].created_at).format("HH:mm:ss"),
                Time: survey[i].created_at ? new Date(survey[i].created_at).toLocaleString("en-US", {
                    timeZone: 'Asia/Kolkata',
                    hour12: false,               // Use 24-hour format
                    hour: '2-digit',             // Show hours in 2-digit format
                    minute: '2-digit',           // Show minutes in 2-digit format
                    second: '2-digit'            // Show seconds in 2-digit format
                }) : "",
                Date: moment(survey[i].created_at).format("YYYY-MM-DD"),
                Day: survey[i].activity.activity_day,
                ActivityType: survey[i].activity.activity_type,
                OutletCode: survey[i].activity.outlet.outlet_code,
                OutletName: survey[i].activity.outlet.outlet_name,
                Address: survey[i].activity.outlet.outlet_address,
                // Address : survey[i].activity.checkin_address,
                Area: survey[i].activity.outlet.outlet_area,
                SupervisorCode: survey[i].activity ? survey[i].activity.supervisor.user_code : "",
                SupervisorName: survey[i].activity ? survey[i].activity.supervisor.firstname : "",
                FwpName: survey[i].user ? survey[i].user.firstname + " " + survey[i].user.lastname : "",
                FwpCode: survey[i].user ? survey[i].user.user_code : "",
                FwpOneCode: survey[i].activity ? survey[i].activity.fwpOne.user_code : "",
                FwpOneName: survey[i].activity ? survey[i].activity.fwpOne.firstname : "",
                FwpTwoCode: survey[i].activity ? survey[i].activity.fwpTwo.user_code : "",
                FwpTwoName: survey[i].activity ? survey[i].activity.fwpTwo.firstname : "",
                // VariantName : survey[i].comptitonVariant ? survey[i].comptitonVariant.variant_name : "",
                // BrandName : survey[i].competitonBrand ? survey[i].competitonBrand.brand_name : "",
                Brand: brand + " " + (variant ? `(${variant})` : ""),
                CompetitionBrand: competitonBrand + " " + (comptitonVariant ? `(${comptitonVariant})` : ""),
                Other: survey[i].competitonBrand ? survey[i].competitonBrand.competitor_other : "",
                PackTrail: 0,
                Age: survey[i].age,
                Name: survey[i].name,
                Gender: survey[i].gender,
                DoYouSmoke: survey[i].do_you_smoke ? "Yes" : "No",
                ParticipateSurvey: survey[i].participate_survey ? "Yes" : "No",
                Latitude: survey[i].latitude,
                Longitude: survey[i].longitude,
                Signature: survey[i].signature,
                Feedback: survey[i].feedback,
                ProductRating: survey[i].product_rating,
                PackRating: survey[i].pack_rating,
                StickRating: survey[i].stick_rating,
            }

            surveyArray.push(surveyData)
        }

        let workbook = new excel.Workbook();
        let worksheet = workbook.addWorksheet("survey");

        worksheet.columns = [
            {
                header: "S.No",
                key: "Sno",
                width: 5
            },
            {
                header: "City",
                key: "City",
                width: 20
            },
            {
                header: "Date",
                key: "Date",
                width: 20
            },
            {
                header: "Time",
                key: "Time",
                width: 20
            },
            {
                header: "ACTIVITY TYPE",
                key: "ActivityType",
                width: 20
            },
            {
                header: "OUTLET NAME",
                key: "OutletName",
                width: 20
            },
            {
                header: "OUTLET CODE",
                key: "OutletCode",
                width: 20
            },
            {
                header: "ADDRESS",
                key: "Address",
                width: 60
            },
            {
                header: "AREA",
                key: "Area",
                width: 20
            },
            {
                header: "SuperVisor name",
                key: "SupervisorName",
                width: 20
            },
            {
                header: "SuperVisor Code",
                key: "SupervisorCode",
                width: 20
            },
            {
                header: "FWP Name",
                key: "FwpName",
                width: 20
            },
            {
                header: "FWP Code",
                key: "FwpCode",
                width: 20
            },
            // {
            //     header: "FWP_ CODE -1",
            //     key: "FwpOneCode",
            //     width: 20
            // },
            // {
            //     header: "FWP_NAME 1",
            //     key: "FwpOneName",
            //     width: 20
            // },
            // {
            //     header: "FWP_ CODE -2",
            //     key: "FwpTwoCode",
            //     width: 20
            // },
            // {
            //     header: "FWP_NAME 2",
            //     key: "FwpTwoName",
            //     width: 20
            // },
            {
                header: "Competition Brand",
                key: "Brand",
                width: 30
            },
            {
                header: "Offer Brand",
                key: "CompetitionBrand",
                width: 30
            },
            // {
            //     header: "other",
            //     key: "Other",
            //     width: 20
            // },
            // {
            //     header: "Pack Trail (10/20)",
            //     key: "PackTrail",
            //     width: 20
            // },
            {
                header: "Age",
                key: "Age",
                width: 10
            },
            {
                header: "do_you_smoke",
                key: "DoYouSmoke",
                width: 20
            },
            {
                header: "participate_survey",
                key: "ParticipateSurvey",
                width: 20
            },
            {
                header: "Name",
                key: "Name",
                width: 20
            },
            {
                header: "gender",
                key: "Gender",
                width: 10
            },
            {
                header: "latitude",
                key: "Latitude",
                width: 20
            },
            {
                header: "longitude",
                key: "Longitude",
                width: 20
            },
            {
                header: "signature",
                key: "Signature",
                width: 100
            },

            {
                header: "stick_rating",
                key: "StickRating",
                width: 5
            },
            {
                header: "pack_rating",
                key: "PackRating",
                width: 5
            },
            {
                header: "product_rating",
                key: "ProductRating",
                width: 5
            }, {
                header: "feedback",
                key: "Feedback",
                width: 30
            },
        ];

        worksheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFF' } };  // White font
        worksheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '000000' } };  // Black background

        // // Add Array Rows
        worksheet.addRows(surveyArray);

        res.setHeader(
            "Content-Type",
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        );
        res.setHeader(
            "Content-Disposition",
            "attachment; filename=" + "survey.xlsx"
        );

        await workbook.xlsx.write(res);
        // data = {
        //     staffs : staffs
        // }
        // res.status(201).json({surveyArray});
        // res.status(201).json({survey});
    } catch (error) {
        console.log
            ({
                error
            })
    }
}

const exportMIPSurveyData = async (req, res, next) => {
    try {
        let params = {}

        let City_id = req.query.City_id ? req.query.City_id : "";
        let outlet_id = req.query.outlet_id ? JSON.parse(req.query.outlet_id) : "";
        let start_date = req.query.start_date ? req.query.start_date : "";
        let end_date = req.query.end_date ? req.query.end_date : "";

        if (City_id) {
            params = Object.assign(params, {
                "$activity.city_id$": City_id
            })
        }

        if (outlet_id && outlet_id.length > 0) {
            params = Object.assign(params, {
                "$activity.outlet_id$": {
                    [Op.in]: outlet_id
                }
            })
        }


        if (start_date && end_date) {
            params = Object.assign(params, {
                [Op.and]: [
                    {
                        created_at: {
                            [Op.gte]: new Date(start_date + " 00:00:00")
                        }
                    },
                    {
                        created_at: {
                            [Op.lte]: new Date(end_date + " 23:59:00")
                        }
                    }
                ]
            })
        }
        /// competitor brand and variant
        let competitorBrands = await Brand.findAll({
            where: {
                brand_name: {
                    [Op.ne]: "Malboro"
                }
            },
            attributes: [
                "id",
                "brand_name"
            ],
            order: [
                ['brand_name', 'ASC']
            ]
        });

        let competitorBrandVariants = []
        let headerCompetions = []
        for (let bIndex = 0; bIndex < competitorBrands.length; bIndex++) {
            let competitorVariants = await Variant.findAll({
                where: {
                    brand_id: competitorBrands[bIndex].id
                },
                attributes: [
                    "id",
                    "variant_name"
                ],
                order: [
                    ['variant_name', 'ASC']
                ]
            })
            for (let vIndex = 0; vIndex < competitorVariants.length; vIndex++) {
                // competitorBrandVariants = Object.assign(competitorBrandVariants, {
                //     [`${competitorBrands[bIndex].brand_name} (${competitorVariants[vIndex].variant_name})`] : 0
                // })
                let name = (((`${competitorBrands[bIndex].brand_name} ${competitorVariants[vIndex].variant_name}`).toLowerCase()).replace(/ /g, "_")).replace(/[()\ \s-]+/g, '')
                headerCompetions.push(name)
                headerCompetions.push("competitonBrandVariantsTotal")

                competitorBrandVariants.push(
                    {
                        headerName: `Comptition Brand : ${competitorBrands[bIndex].brand_name} (${competitorVariants[vIndex].variant_name})`,
                        name: name,
                        id: competitorVariants[vIndex].id
                    })
            }
        }

        /////////////////////////////////////////////
        /// offer brand and variant

        let offerBrands = await Brand.findAll({
            where: {
                brand_name: "Malboro"
            },
            attributes: [
                "id",
                "brand_name"
            ],
            order: [
                ['brand_name', 'ASC']
            ]
        });

        let offerBrandVariants = []
        let headerOfferBrandVariants = []
        for (let bIndex = 0; bIndex < offerBrands.length; bIndex++) {
            let offerVariants = await Variant.findAll({
                where: {
                    brand_id: offerBrands[bIndex].id
                },
                attributes: [
                    "id",
                    "variant_name"
                ],
                order: [
                    ['variant_name', 'ASC']
                ]
            })
            for (let vIndex = 0; vIndex < offerVariants.length; vIndex++) {
                let name = (((`${offerBrands[bIndex].brand_name} ${offerVariants[vIndex].variant_name}`).toLowerCase()).replace(/ /g, "_")).replace(/[()\ \s-]+/g, '')
                headerOfferBrandVariants.push(name)
                headerOfferBrandVariants.push("offerBrandVariantsCount")
                offerBrandVariants.push(
                    {
                        headerName: `Offer Brand : ${offerBrands[bIndex].brand_name} (${offerVariants[vIndex].variant_name})`,
                        name: name,
                        id: offerVariants[vIndex].id
                    })
            }
        }

        let activity = await Activity.findAll({
            where: params,
            include: [
                {
                    model: Outlet,
                    as: "outlet"
                },
                {
                    model: Survey,
                    as: "surveyData",
                    attributes: [
                        "age",
                        "brand_id",
                        "variant_id",
                        "other",
                        "competitor_brand_id",
                        "competitor_variant_id",
                        "competitor_other",
                        "gender",
                    ],
                    include: [
                        { model: Brand, as: 'brand' },
                        { model: Variant, as: 'variant' },
                        { model: Brand, as: 'competitonBrand' },
                        { model: Variant, as: 'comptitonVariant' }
                    ]
                },
                {
                    model: User, as: 'supervisor', attributes: [
                        "id",
                        "firstname",
                        "lastname",
                        "user_code"
                    ]
                },
                {
                    model: User, as: 'fwpOne', attributes: [
                        "id",
                        "firstname",
                        "lastname",
                        "user_code"
                    ]
                },
                {
                    model: User, as: 'fwpTwo', attributes: [
                        "id",
                        "firstname",
                        "lastname",
                        "user_code"
                    ]
                },
                {
                    model: City,
                    as: "city"
                }
            ],
            order: [
                ['id', 'DESC']
            ]
        })

        let surveyArray = [];
        let CompetitionHeader = []
        let OfferHeader = []
        for (let i = 0; i < activity.length; i++) {

            let AgeTotal = 0;
            let surveyDataArray = activity[i].surveyData;
            let ages = surveyDataArray.map((item) => item.age);
            let filteredAges1 = ages.filter(age => age >= 18 && age <= 24).length;
            let filteredAges2 = ages.filter(age => age >= 25 && age <= 34).length;
            let filteredAges3 = ages.filter(age => age >= 35 && age <= 44).length;
            let filteredAges4 = ages.filter(age => age >= 45).length;

            AgeTotal = filteredAges1 + filteredAges2 + filteredAges3 + filteredAges4;

            let newCompetitorBrandVariants = {}
            let competitonBrandVariantsTotal = 0

            for (let j = 0; j < competitorBrandVariants.length; j++) {
                let varientCount = await Survey.count({
                    where: {
                        activity_id: activity[i].id,
                        variant_id: competitorBrandVariants[j].id
                    }
                })
                competitonBrandVariantsTotal = competitonBrandVariantsTotal + varientCount
                newCompetitorBrandVariants = Object.assign(newCompetitorBrandVariants, {
                    [`${competitorBrandVariants[j].name}`]: varientCount
                })
            }

            newCompetitorBrandVariants = Object.assign(newCompetitorBrandVariants, {
                competitonBrandVariantsTotal: competitonBrandVariantsTotal
            })

            let newOfferBrandVariants = {}
            let offerBrandVariantsCount = 0

            for (let j = 0; j < offerBrandVariants.length; j++) {
                let varientCount = await Survey.count({
                    where: {
                        activity_id: activity[i].id,
                        variant_id: offerBrandVariants[j].id
                    }
                })
                offerBrandVariantsCount = offerBrandVariantsCount + varientCount
                newOfferBrandVariants = Object.assign(newOfferBrandVariants, {
                    [`${offerBrandVariants[j].name}`]: varientCount
                })
            }
            newOfferBrandVariants = Object.assign(newOfferBrandVariants, {
                offerBrandVariantsCount: offerBrandVariantsCount
            })



            let genders = surveyDataArray.map((item) => item.gender ? item.gender.replace(/ /g, '') : "");

            let male = genders.filter(gender => gender == "Male").length;
            let female = genders.filter(gender => gender == "Female").length;
            let total = male + female

            let surveyData = {
                Sno: i + 1,
                Date: activity[i].start_date,
                Day: activity[i].activity_day,
                ActivityType: activity[i].activity_type,
                OutletCode: activity[i].outlet.outlet_code,
                OutletName: activity[i].outlet.outlet_name,
                Address: activity[i].outlet.outlet_address,
                Area: activity[i].outlet.outlet_area,
                SupervisorCode: activity[i].supervisor ? activity[i].supervisor.user_code : "",
                SupervisorName: activity[i].supervisor ? activity[i].supervisor.firstname : "",
                FwpOneCode: activity[i].fwpOne ? activity[i].fwpOne.user_code : "",
                FwpOneName: activity[i].fwpOne ? activity[i].fwpOne.firstname : "",
                FwpTwoCode: activity[i].fwpTwo ? activity[i].fwpTwo.user_code : "",
                FwpTwoName: activity[i].fwpTwo ? activity[i].fwpTwo.firstname : "",
                Age_18_24: filteredAges1,
                Age_25_34: filteredAges2,
                Age_35_44: filteredAges3,
                Age_Others: filteredAges4,
                AgeTotal: AgeTotal,
                ...newCompetitorBrandVariants,
                ...newOfferBrandVariants,
                male: male,
                female: female,
                total: total
            }

            surveyArray.push(surveyData)
        }

        let workbook = new excel.Workbook();
        let worksheet = workbook.addWorksheet("survey");

        let columns = [
            {
                header: "S.No",
                key: "Sno",
                width: 5,
                style: { alignment: { horizontal: 'center' } }
            },
            {
                header: "DATE",
                key: "Date",
                width: 15,
                style: { alignment: { horizontal: 'center' } }
            },
            {
                header: "DAY",
                key: "Day",
                width: 20,
                style: { alignment: { horizontal: 'center' } }
            },
            {
                header: "ACTIVITY TYPE",
                key: "ActivityType",
                width: 20,
                style: { alignment: { horizontal: 'center' } }
            },
            {
                header: "OUTLET CODE",
                key: "OutletCode",
                width: 20,
                style: { alignment: { horizontal: 'center' } }
            },
            {
                header: "OUTLET NAME",
                key: "OutletName",
                width: 20,
                style: { alignment: { horizontal: 'center' } }
            },
            {
                header: "OUTLET ADDRESS",
                key: "Address",
                width: 20,
                style: { alignment: { horizontal: 'center' } }
            },
            {
                header: "AREA",
                key: "Area",
                width: 20,
                style: { alignment: { horizontal: 'center' } }
            },
            {
                header: "SUPERVISOR CODE 1",
                key: "SupervisorCode",
                width: 20,
                style: { alignment: { horizontal: 'center' } }
            },
            {
                header: "SUPERVISOR 1",
                key: "SupervisorName",
                width: 20,
                style: { alignment: { horizontal: 'center' } }
            },
            {
                header: "FWP CODE 1",
                key: "FwpOneCode",
                width: 20,
                style: { alignment: { horizontal: 'center' } }
            },
            {
                header: "FWP NAME 1",
                key: "FwpOneName",
                width: 20,
                style: { alignment: { horizontal: 'center' } }
            },
            {
                header: "FWP CODE 2",
                key: "FwpTwoCode",
                width: 20,
                style: { alignment: { horizontal: 'center' } }
            },
            {
                header: "FWP NAME 2",
                key: "FwpTwoName",
                width: 20,
                style: { alignment: { horizontal: 'center' } }
            },
            {
                header: "Age 18-24",
                key: "Age_18_24",
                width: 20,
                style: { alignment: { horizontal: 'center' } }
            },
            {
                header: "Age 30-34",
                key: "Age_25_34",
                width: 20,
                style: { alignment: { horizontal: 'center' } }
            },
            {
                header: "Age 35-44",
                key: "Age_35_44",
                width: 20,
                style: { alignment: { horizontal: 'center' } }
            },
            {
                header: "OTHERS Age",
                key: "Age_Others",
                width: 20,
                style: { alignment: { horizontal: 'center' } }
            },
            {
                header: "Age TOTAL",
                key: "AgeTotal",
                width: 20,
                style: { alignment: { horizontal: 'center' } }
            },
            {
                header: "Male",
                key: "male",
                width: 20,
                style: { alignment: { horizontal: 'center' } }
            },
            {
                header: "Female",
                key: "female",
                width: 20,
                style: { alignment: { horizontal: 'center' } }
            },
            {
                header: "Gender Total",
                key: "total",
                width: 20,
                style: { alignment: { horizontal: 'center' } }
            }
        ]

        for (let j = 0; j < competitorBrandVariants.length; j++) {
            CompetitionHeader.push(
                {
                    header: competitorBrandVariants[j].headerName,
                    key: competitorBrandVariants[j].name,
                    width: 50,
                    style: { alignment: { horizontal: 'center' } }
                }
            )
        }

        CompetitionHeader.push({
            header: "Competition Brand Variants Total",
            key: "competitonBrandVariantsTotal",
            width: 50,
            style: { alignment: { horizontal: 'center' } }
        })

        for (let j = 0; j < offerBrandVariants.length; j++) {
            OfferHeader.push(
                {
                    header: offerBrandVariants[j].headerName,
                    key: offerBrandVariants[j].name,
                    width: 50,
                    style: { alignment: { horizontal: 'center' } }
                }
            )
        }

        OfferHeader.push({
            header: "Offer Brand Variants Total",
            key: "offerBrandVariantsCount",
            width: 50,
            style: { alignment: { horizontal: 'center' } }
        })
        const mergedArray = [...columns, ...CompetitionHeader, ...OfferHeader]

        worksheet.columns = mergedArray

        worksheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFF' } };  // White font
        worksheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '000000' } };  // Black background

        // **Add Array Rows (Data) first**
        worksheet.addRows(surveyArray);

        // Get actual last row **after** data is added
        const lastRowNumber = worksheet.rowCount; // Ensures footer is added at the last row

        // Define footer row values
        const footerRowValues = Array(14).fill(""); // Empty first 14 columns
        footerRowValues[0] = "Total"; // First column as "Total"

        // Apply **SUM() formula** dynamically for numeric columns (starting from column 15)
        const startColumnIndex = 15; // 1-based index for the first numeric column

        for (let colIndex = startColumnIndex; colIndex <= mergedArray.length; colIndex++) {
            // const colLetter = String.fromCharCode(64 + colIndex); // Convert index to Excel column letter
            const colLetter = worksheet.getColumn(colIndex).letter;
            footerRowValues.push({ formula: `SUM(${colLetter}2:${colLetter}${lastRowNumber})` });
        }

        // **Now, add the footer row at the correct last row**
        const footerRow = worksheet.addRow(footerRowValues);

        // **Style the footer row**
        footerRow.font = { bold: true, color: { argb: 'FFFFFF' } };
        footerRow.alignment = { horizontal: 'center' };
        footerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '000000' } };


        res.setHeader(
            "Content-Type",
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        );
        res.setHeader(
            "Content-Disposition",
            "attachment; filename=" + "survey.xlsx"
        );

        await workbook.xlsx.write(res);


        // res.status(201).json({columns, CompetitionHeader, OfferHeader});
        // res.status(201).json({activity});
    } catch (error) {
        console.log
            ({
                error
            })
    }
}

const exportStaticMIPSurveyData = async (req, res, next) => {
    try {

        let params = {}

        let City_id = req.query.City_id ? req.query.City_id : "";
        let outlet_id = req.query.outlet_id ? JSON.parse(req.query.outlet_id) : "";
        let start_date = req.query.start_date ? req.query.start_date : "";
        let end_date = req.query.end_date ? req.query.end_date : "";

        let city = ""
        if (City_id) {
            params = Object.assign(params, {
                city_id: City_id
            })

            city = await City.findOne({
                where: {
                    id: City_id
                },
                attributes: [
                    "city_name"
                ]
            })
        }

        if (outlet_id && outlet_id.length > 0) {
            params = Object.assign(params, {
                outlet_id: {
                    [Op.in]: outlet_id
                }
            })
        }


        if (start_date && end_date) {
            params = Object.assign(params, {
                [Op.and]: [
                    {
                        "$surveyData.created_at$": {
                            [Op.gte]: new Date(start_date + " 00:00:00")
                        }
                    },
                    {
                        "$surveyData.created_at$": {
                            [Op.lte]: new Date(end_date + " 23:59:00")
                        }
                    }
                ]
            })
        }

        let brandParams = {
            brand_name: {
                [Op.ne]: "Malboro"
            }
        }

        if (City_id) {
            brandParams = Object.assign(brandParams, {
                "$cityBrand.city_id$": City_id
            })
        }
        let competitorBrands = await Brand.findAll({
            where: brandParams,
            attributes: [
                "id",
                "brand_name"
            ],
            include: [
                "cityBrand"
            ],
            order: [
                ['brand_name', 'ASC']
            ]
        });

        let competitorBrandVariants = []
        let headerCompetions = []
        for (let bIndex = 0; bIndex < competitorBrands.length; bIndex++) {
            let competitorVariants = await Variant.findAll({
                where: {
                    brand_id: competitorBrands[bIndex].id
                },
                attributes: [
                    "id",
                    "variant_name"
                ],
                order: [
                    ['variant_name', 'ASC']
                ]
            })
            for (let vIndex = 0; vIndex < competitorVariants.length; vIndex++) {
                let name = `${competitorBrands[bIndex].brand_name} (${competitorVariants[vIndex].variant_name})`
                headerCompetions.push(name)
                headerCompetions.push("competitonBrandVariantsTotal")

                competitorBrandVariants.push(
                    {
                        headerName: `Comptition Brand : ${competitorBrands[bIndex].brand_name} (${competitorVariants[vIndex].variant_name})`,
                        name: name,
                        id: competitorVariants[vIndex].id
                    })
            }
        }
        let offerBrandParams = {
            brand_name: "Malboro"
        }
        if (City_id) {
            offerBrandParams = Object.assign(offerBrandParams, {
                "$cityBrand.city_id$": City_id
            })
        }
        let offerBrands = await Brand.findAll({
            where: offerBrandParams,
            attributes: [
                "id",
                "brand_name"
            ],
            include: [
                "cityBrand"
            ],
            order: [
                ['brand_name', 'ASC']
            ]
        });

        let offerBrandVariants = []
        let headerOfferBrandVariants = []
        for (let bIndex = 0; bIndex < offerBrands.length; bIndex++) {
            let offerVariants = await Variant.findAll({
                where: {
                    brand_id: offerBrands[bIndex].id
                },
                attributes: [
                    "id",
                    "variant_name"
                ],
                order: [
                    ['variant_name', 'ASC']
                ]
            })
            for (let vIndex = 0; vIndex < offerVariants.length; vIndex++) {
                let name = `${offerBrands[bIndex].brand_name} (${offerVariants[vIndex].variant_name})`
                headerOfferBrandVariants.push(name)
                headerOfferBrandVariants.push("offerBrandVariantsCount")
                offerBrandVariants.push(
                    {
                        headerName: `Offer Brand : ${offerBrands[bIndex].brand_name} (${offerVariants[vIndex].variant_name})`,
                        name: name,
                        id: offerVariants[vIndex].id,

                    })
            }
        }

        let activity = await Activity.findAll({
            where: params,
            include: [
                {
                    model: Outlet,
                    as: "outlet"
                },
                {
                    model: Survey,
                    as: "surveyData",
                    attributes: [
                        "age",
                        "brand_id",
                        "variant_id",
                        "other",
                        "competitor_brand_id",
                        "competitor_variant_id",
                        "competitor_other",
                        "gender",
                        "created_at"
                    ],
                    include: [
                        { model: Brand, as: 'brand' },
                        { model: Variant, as: 'variant' },
                        { model: Brand, as: 'competitonBrand' },
                        { model: Variant, as: 'comptitonVariant' }
                    ]
                },
                {
                    model: User, as: 'supervisor', attributes: [
                        "id",
                        "firstname",
                        "lastname",
                        "user_code"
                    ]
                },
                {
                    model: User, as: 'fwpOne', attributes: [
                        "id",
                        "firstname",
                        "lastname",
                        "user_code"
                    ]
                },
                {
                    model: User, as: 'fwpTwo', attributes: [
                        "id",
                        "firstname",
                        "lastname",
                        "user_code"
                    ]
                },
                {
                    model: City,
                    as: "city"
                }
            ],
            order: [
                ['id', 'DESC']
            ]
        })

        let surveyArray = [];
        let CompetitionHeader = []
        let OfferHeader = []
        for (let i = 0; i < activity.length; i++) {

            let AgeTotal = 0;
            let surveyDataArray = activity[i].surveyData;
            let ages = surveyDataArray.map((item) => item.age);
            let filteredAges1 = ages.filter(age => age >= 18 && age <= 24).length;
            let filteredAges2 = ages.filter(age => age >= 25 && age <= 29).length;
            let filteredAges3 = ages.filter(age => age >= 30 && age <= 34).length;
            let filteredAges4 = ages.filter(age => age >= 35 && age <= 44).length;
            let filteredAges5 = ages.filter(age => age >= 45).length;

            AgeTotal = filteredAges1 + filteredAges2 + filteredAges3 + filteredAges4 + filteredAges5;

            let newCompetitorBrandVariants = {}
            let competitonBrandVariantsTotal = 0

            for (let j = 0; j < competitorBrandVariants.length; j++) {
                let varientCount = await Survey.count({
                    where: {
                        activity_id: activity[i].id,
                        variant_id: competitorBrandVariants[j].id
                    }
                })
                competitonBrandVariantsTotal = competitonBrandVariantsTotal + varientCount
                newCompetitorBrandVariants = Object.assign(newCompetitorBrandVariants, {
                    [`${competitorBrandVariants[j].name}`]: varientCount
                })
            }

            newCompetitorBrandVariants = Object.assign(newCompetitorBrandVariants, {
                "Competiton Variants Total": competitonBrandVariantsTotal
            })

            let newOfferBrandVariants = {}
            let offerBrandVariantsCount = 0

            for (let j = 0; j < offerBrandVariants.length; j++) {
                let varientCount = await Survey.count({
                    where: {
                        activity_id: activity[i].id,
                        variant_id: offerBrandVariants[j].id
                    }
                })
                offerBrandVariantsCount = offerBrandVariantsCount + varientCount
                newOfferBrandVariants = Object.assign(newOfferBrandVariants, {
                    [`${offerBrandVariants[j].name}`]: varientCount
                })
            }

            newOfferBrandVariants = Object.assign(newOfferBrandVariants, {
                "Offered Variants Total": offerBrandVariantsCount
            })

            let genders = surveyDataArray.map((item) => item.gender ? item.gender.replace(/ /g, '') : "");

            let male = genders.filter(gender => gender == "Male").length;
            let female = genders.filter(gender => gender == "Female").length;
            let total = male + female

            let surveyData = {
                "SR. NO": i + 1,
                "DATE": activity[i].start_date,
                "DAY": activity[i].activity_day,
                "ACTIVITY TYPE": activity[i].activity_type,
                "OUTLET CODE": activity[i].outlet.outlet_code,
                "OUTLET NAME": activity[i].outlet.outlet_name,
                "OUTLET ADDRESS": activity[i].outlet.outlet_address,
                "AREA": activity[i].outlet.outlet_area,
                "SUPERVISOR CODE 1": activity[i].supervisor ? activity[i].supervisor.user_code : "",
                "SUPERVISOR 1": activity[i].supervisor ? (activity[i].supervisor.firstname + " " + activity[i].supervisor.lastname) : "",
                "FWP CODE 1": activity[i].fwpOne ? activity[i].fwpOne.user_code : "",
                "FWP NAME 1": activity[i].fwpOne ? (activity[i].fwpOne.firstname + " " + activity[i].fwpOne.lastname) : "",
                "FWP CODE 2": activity[i].fwpTwo ? activity[i].fwpTwo.user_code : "",
                "FWP NAME 2": activity[i].fwpTwo ? (activity[i].fwpTwo.firstname + " " + activity[i].fwpTwo.lastname) : "",
                "18-24": filteredAges1,
                "25-29": filteredAges2,
                "30-34": filteredAges3,
                "35-44": filteredAges4,
                "OTHERS": filteredAges5,
                "TOTAL": AgeTotal,
                ...newCompetitorBrandVariants,
                ...newOfferBrandVariants,
                "Male": male,
                "Female": female,
                "Gender Total": total
            }

            surveyArray.push(surveyData)
        }

        for (let j = 0; j < competitorBrandVariants.length; j++) {
            CompetitionHeader.push(competitorBrandVariants[j].name)
        }

        CompetitionHeader.push("Competiton Variants Total")

        for (let j = 0; j < offerBrandVariants.length; j++) {
            OfferHeader.push(offerBrandVariants[j].name)
        }

        OfferHeader.push("Offered Variants Total")

        let workbook = new excel.Workbook();
        let worksheet = workbook.addWorksheet("Outlet Wise Summary");

        worksheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFF' } };  // White font
        worksheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '808080' } };  // grey background
        worksheet.getRow(2).font = { bold: true, color: { argb: 'FFFFFF' } };  // White font
        worksheet.getRow(2).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '808080' } };  // grey background

        const headers = {
            '': ['SR. NO', 'DATE', 'DAY', 'ACTIVITY TYPE', 'OUTLET CODE', 'OUTLET NAME', 'OUTLET ADDRESS', 'AREA', 'SUPERVISOR CODE 1', 'SUPERVISOR 1', 'FWP CODE 1', 'FWP NAME 1', 'FWP CODE 2', 'FWP NAME 2'],
            'Age': ['18-24', '25-29', '30-34', '35-44', 'OTHERS', 'TOTAL'],
            'Competition Brand': CompetitionHeader,
            'Marlboro Variant': OfferHeader,
            'LAS Gender': ['Male', 'Female', 'Gender Total']
        };

        const dataRows = surveyArray;

        worksheet.columns = Object.values(headers).flat().map(subheader => ({
            header: subheader,
            key: subheader,
            width: subheader.length + 5,
            style: { alignment: { horizontal: 'center' } }
        }));

        let colIndex = 1;
        Object.entries(headers).forEach(([header, subheaders]) => {
            let startCol = colIndex;
            subheaders.forEach((subheader) => {
                worksheet.getCell(2, colIndex).value = subheader;
                const cell = worksheet.getCell(2, colIndex);
                cell.value = subheader;
                cell.border = {
                    top: { style: 'thin' },
                    left: { style: 'thin' },
                    bottom: { style: 'thin' },
                    right: { style: 'thin' }
                };
                colIndex++;
            });
            let endCol = colIndex - 1;
            worksheet.mergeCells(1, startCol, 1, endCol);
            worksheet.getCell(1, startCol).value = header;
            worksheet.getCell(1, startCol).alignment = { horizontal: 'center', vertical: 'middle' };
            const headerCell = worksheet.getCell(1, startCol);
            headerCell.value = header;
            headerCell.alignment = { horizontal: 'center', vertical: 'middle' };
            headerCell.border = {
                top: { style: 'thin' },
                left: { style: 'thin' },
                bottom: { style: 'thin' },
                right: { style: 'thin' }
            };
        });

        worksheet.addRows(dataRows);

        const lastRowNumber = worksheet.rowCount;

        const footerRowValues = Array(14).fill("");
        let mergedArray = worksheet.columns
        const startColumnIndex = 15;
        for (let colIndex = startColumnIndex; colIndex <= mergedArray.length; colIndex++) {
            const colLetter = worksheet.getColumn(colIndex).letter;
            footerRowValues.push({ formula: `SUM(${colLetter}2:${colLetter}${lastRowNumber})` });
        }

        const footerRow = worksheet.addRow(footerRowValues);

        footerRow.font = { bold: true, color: { argb: 'FFFFFF' } };
        footerRow.alignment = { horizontal: 'center' };
        footerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '808080' } };

        // City tab
        let cityName = "City Name"
        if (city) {
            cityName = city.city_name
        }
        // let workbookCity = new excel.Workbook();
        let worksheetCity = workbook.addWorksheet(cityName);

        worksheetCity.getRow(1).font = { bold: true, color: { argb: 'FFFFFF' } };  // White font
        worksheetCity.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '2E2E31' } };  // grey background
        worksheetCity.getRow(2).font = { bold: true, color: { argb: 'FFFFFF' } };  // White font
        worksheetCity.getRow(2).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '2E2E31' } };  // grey background

        const headers2 = {
            'MIP DETAILED REPORT': ['SR. NO', 'CITY', 'DATE', 'DAY', 'ACTIVITY TYPE', 'OUTLET CODE', 'OUTLET NAME', 'OUTLET ADDRESS', 'AREA', 'SUPERVISOR CODE', 'SUPERVISOR NAME', 'FWP CODE 1', 'FWP NAME 1', 'FWP CODE 2', 'FWP NAME 2', 'FWP HEAD COUNT'],
            'AGE': ['18-24', '25-29', '30-34', '35-44', 'OTHERS', 'TOTAL'],
            'COMPETITION BRAND SPLIT': CompetitionHeader,
            'MARLBORO VARIANT': OfferHeader,
            // 'LAS Gender' : ['Male', 'Female', 'Gender Total'],
            'RATE THE FOLLOWING ATTRIBUTES ON A SCALE OF 1 TO 3': ['STICK DESIGN', 'PACKAGING', 'PRODUCT', 'Any other feedback'],
            '': ['ATTEMPTED SURVEYS', 'COMPLETED SURVEYS', 'LAS GENDER', 'CYCLE', 'FORM ENTRY TIME', 'MARLBORO VARIANT', 'COMPETITION VARIANT']
        };

        let surveyParams = {}

        if (City_id) {
            surveyParams = Object.assign(surveyParams, {
                "$activity.city_id$": City_id
            })
        }

        // if (outlet_id) {
        //     surveyParams = Object.assign(surveyParams, {
        //         "$activity.outlet_id$" : outlet_id 
        //     })
        // }
        if (outlet_id && outlet_id.length > 0) {
            surveyParams = Object.assign(surveyParams, {
                "$activity.outlet_id$": {
                    [Op.in]: outlet_id
                }
            })
        }

        if (start_date && end_date) {
            surveyParams = Object.assign(surveyParams, {
                [Op.and]: [
                    {
                        created_at: {
                            [Op.gte]: new Date(start_date + " 00:00:00")
                        }
                    },
                    {
                        created_at: {
                            [Op.lte]: new Date(end_date + " 23:59:00")
                        }
                    }
                ]
            })
        }

        let survey = await Survey.findAll({
            where: surveyParams,
            include: [
                {
                    model: Activity,
                    as: 'activity',
                    include: [
                        {
                            model: Outlet,
                            as: "outlet"
                        },
                        {
                            model: User, as: 'supervisor', attributes: [
                                "id",
                                "firstname",
                                "lastname",
                                "user_code"
                            ]
                        },
                        {
                            model: User, as: 'fwpOne', attributes: [
                                "id",
                                "firstname",
                                "lastname",
                                "user_code"
                            ]
                        },
                        {
                            model: User, as: 'fwpTwo', attributes: [
                                "id",
                                "firstname",
                                "lastname",
                                "user_code"
                            ]
                        },
                        {
                            model: City,
                            as: "city"
                        }
                    ]
                },
                { model: Brand, as: 'brand' },
                { model: Variant, as: 'variant' },
                { model: Brand, as: 'competitonBrand' },
                { model: Variant, as: 'comptitonVariant' },
                {
                    model: User,
                    as: 'user',
                    attributes: [
                        "id",
                        "firstname",
                        "lastname",
                        "user_code"
                    ]
                }
            ],
            order: [
                ['id', 'DESC']
            ]
        })

        let newSurveyArray = [];

        for (let i = 0; i < survey.length; i++) {
            let filteredAges1 = survey[i].age >= 18 && survey[i].age <= 24 ? 1 : 0;
            let filteredAges2 = survey[i].age >= 25 && survey[i].age <= 29 ? 1 : 0;
            let filteredAges3 = survey[i].age >= 30 && survey[i].age <= 34 ? 1 : 0;
            let filteredAges4 = survey[i].age >= 35 && survey[i].age <= 44 ? 1 : 0;
            let filteredAges5 = survey[i].age >= 45 ? 1 : 0;

            AgeTotal = filteredAges1 + filteredAges2 + filteredAges3 + filteredAges4 + filteredAges5;

            let newCompetitorBrandVariants = {}
            let competitonBrandVariantsTotal = 0

            for (let j = 0; j < competitorBrandVariants.length; j++) {
                competitonBrandVariantsTotal = competitonBrandVariantsTotal + (competitorBrandVariants[j].id == survey[i].variant_id ? 1 : 0)
                newCompetitorBrandVariants = Object.assign(newCompetitorBrandVariants, {
                    [`${competitorBrandVariants[j].name}`]: competitorBrandVariants[j].id == survey[i].variant_id ? 1 : 0
                })
            }

            newCompetitorBrandVariants = Object.assign(newCompetitorBrandVariants, {
                "Competiton Variants Total": competitonBrandVariantsTotal
            })

            let newOfferBrandVariants = {}
            let offerBrandVariantsCount = 0

            for (let j = 0; j < offerBrandVariants.length; j++) {
                offerBrandVariantsCount = offerBrandVariantsCount + (offerBrandVariants[j].id == survey[i].competitor_variant_id ? parseInt(survey[i].numberOfSticks) : 0)
                newOfferBrandVariants = Object.assign(newOfferBrandVariants, {
                    [`${offerBrandVariants[j].name}`]: offerBrandVariants[j].id == survey[i].competitor_variant_id ? parseInt(survey[i].numberOfSticks) : 0
                })
            }

            newOfferBrandVariants = Object.assign(newOfferBrandVariants, {
                "Offered Variants Total": offerBrandVariantsCount
            })

            let offerBrand = survey[i].competitonBrand ? survey[i].competitonBrand.brand_name : ""
            let offerVariant = survey[i].comptitonVariant ? survey[i].comptitonVariant.variant_name : ""
            let competitionBrand = survey[i].brand ? survey[i].brand.brand_name : ""
            let competitionVariant = survey[i].variant ? survey[i].variant.variant_name : ""
            let surveyData = {
                "ID": survey[i].id,
                "SR. NO": i + 1,
                "CITY": survey[i].activity.city.city_name,
                // Time : moment(survey[i].created_at).format("HH:mm:ss"),
                Time: survey[i].created_at ? new Date(survey[i].created_at).toLocaleString("en-US", {
                    timeZone: 'Asia/Kolkata',
                    hour12: false,               // Use 24-hour format
                    hour: '2-digit',             // Show hours in 2-digit format
                    minute: '2-digit',           // Show minutes in 2-digit format
                    second: '2-digit'            // Show seconds in 2-digit format
                }) : "",
                "DATE": moment(survey[i].created_at).format("YYYY-MM-DD"),
                "DAY": survey[i].activity.activity_day,
                "ACTIVITY TYPE": survey[i].activity.activity_type,
                "OUTLET CODE": survey[i].activity.outlet.outlet_code,
                "OUTLET NAME": survey[i].activity.outlet.outlet_name,
                "OUTLET ADDRESS": survey[i].activity.outlet.outlet_address,
                // Address : survey[i].activity.checkin_address,
                "AREA": survey[i].activity.outlet.outlet_area,
                "SUPERVISOR CODE": survey[i].activity ? survey[i].activity.supervisor.user_code : "",
                "SUPERVISOR NAME": survey[i].activity ? (survey[i].activity.supervisor.firstname + " " + survey[i].activity.supervisor.lastname) : "",
                // "FWP NAME 1" : survey[i].user ? survey[i].user.firstname + " " + survey[i].user.lastname : "",
                // "FWP CODE 1" : survey[i].user ? survey[i].user.user_code : "",
                "FWP CODE 1": survey[i].activity ? survey[i].activity.fwpOne.user_code : "",
                "FWP NAME 1": survey[i].activity ? (survey[i].activity.fwpOne.firstname + " " + survey[i].activity.fwpOne.lastname) : "",
                "FWP CODE 2": survey[i].activity ? survey[i].activity.fwpTwo.user_code : "",
                "FWP NAME 2": survey[i].activity ? (survey[i].activity.fwpTwo.firstname + " " + survey[i].activity.fwpTwo.lastname) : "",
                "FWP HEAD COUNT": 2,
                "18-24": filteredAges1,
                "25-29": filteredAges2,
                "30-34": filteredAges3,
                "35-44": filteredAges4,
                "OTHERS": filteredAges5,
                "TOTAL": AgeTotal,
                ...newCompetitorBrandVariants,
                ...newOfferBrandVariants,
                "STICK DESIGN": survey[i].stick_rating,
                "PACKAGING": survey[i].pack_rating,
                "PRODUCT": survey[i].product_rating,
                "Any other feedback": survey[i].feedback,
                'ATTEMPTED SURVEYS': (survey[i].do_you_smoke == 1 || survey[i].do_you_smoke == 0) ? 1 : 0,
                'COMPLETED SURVEYS': survey[i].participate_survey ? 1 : 0,
                'LAS GENDER': survey[i].gender ? survey[i].gender.replace(/ /g, '') : "",
                'CYCLE': "MARLBORO PORTFOLIO",
                'FORM ENTRY TIME': survey[i].created_at ? new Date(survey[i].created_at).toLocaleString("en-US", {
                    timeZone: 'Asia/Kolkata',
                    hour12: false,               // Use 24-hour format
                    hour: '2-digit',             // Show hours in 2-digit format
                    minute: '2-digit',           // Show minutes in 2-digit format
                    second: '2-digit'            // Show seconds in 2-digit format
                }) : "",
                'MARLBORO VARIANT': offerVariant,
                'COMPETITION VARIANT': competitionBrand + " " + competitionVariant
            }

            newSurveyArray.push(surveyData)
        }



        worksheetCity.columns = Object.values(headers2).flat().map(subheader => ({
            header: subheader,
            key: subheader,
            width: subheader.length + 5,
            style: { alignment: { horizontal: 'center' } }
        }));

        let colIndexes = 1;
        Object.entries(headers2).forEach(([header, subheaders]) => {
            let startCol = colIndexes;
            subheaders.forEach((subheader) => {
                worksheetCity.getCell(2, colIndexes).value = subheader;
                const cell = worksheetCity.getCell(2, colIndexes);
                cell.value = subheader;
                cell.border = {
                    top: { style: 'thin' },
                    left: { style: 'thin' },
                    bottom: { style: 'thin' },
                    right: { style: 'thin' }
                };
                colIndexes++;
            });
            let endCol = colIndexes - 1;
            worksheetCity.mergeCells(1, startCol, 1, endCol);
            worksheetCity.getCell(1, startCol).value = header;
            worksheetCity.getCell(1, startCol).alignment = { horizontal: 'center', vertical: 'middle' };
            const headerCell = worksheetCity.getCell(1, startCol);
            headerCell.value = header;
            headerCell.alignment = { horizontal: 'center', vertical: 'middle' };
            headerCell.border = {
                top: { style: 'thin' },
                left: { style: 'thin' },
                bottom: { style: 'thin' },
                right: { style: 'thin' }
            };
        });

        worksheetCity.addRows(newSurveyArray);

        res.setHeader(
            "Content-Type",
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        );
        res.setHeader(
            "Content-Disposition",
            "attachment; filename=" + "survey.xlsx"
        );

        await workbook.xlsx.write(res);
    } catch (error) {
        console.log
            ({
                error
            })
    }
}

const getSurveyById = async (req, res, next) => {
    try {
        const result = await surveyService.getSurveyById(req.params.id);
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

const updateSurvey = async (req, res, next) => {
    try {
        if (
            (!req.body || Object.keys(req.body).length === 0) &&
            (!req.files || Object.keys(req.files).length === 0)
        ) {
            return res.status(400).json({ error: "Nothing to update" });
        }
        const result = await surveyService.updateSurvey(req.params.id, req.body, req.files);
        if (result.error) {
            return res.status(404).json({ error: result.error });
        }
        res.status(200).json(result);
    } catch (error) {
        next(error);
    }
};

const createSurveyBySpecialUser = async (req, res, next) => {
    try {
        if (req.role != 'special_user') {
            return failed(res, "Access denied.");
            // return res.status(400).json({ error: "Access denide." });
        }

        let requests = req.body

        const v = new Validator(requests, {
            activity_id: 'required|integer',
            user_id: 'required|integer',
            age: 'required|integer',
            do_you_smoke: 'required|in:0,1',
            participate_survey: 'requiredIf:do_you_smoke,1|in:0,1',
            // signature : 'file|requiredIf:participate_survey,1',
            name: 'requiredIf:participate_survey,1',
            gender: 'requiredIf:participate_survey,1',
            brand_id: 'requiredIf:participate_survey,1',
            variant_id: 'requiredIf:participate_survey,1',
        });

        const matched = await v.check();

        if (!matched) {
            return validationFailed(res, v);
            // return res.status(400).json({ error: v.errors });
        }

        // if (requests.do_you_smoke == '1' && requests.participate_survey == '1' && !req.files || !req.files.signature) {
        //     console.log("ddd");

        //     return failed(res, "Signature is required.");
        //     // return res.status(400).json({ error: "Signature is required." });
        // }


        const activityExists = await Activity.findByPk(requests.activity_id);
        if (!activityExists) {
            return failed(res, "Activity not found.");
            // return res.status(400).json({ error: "Activity not found." });
        }

        if (requests.brand_id) {
            const brandExists = await Brand.findByPk(requests.brand_id);
            if (!brandExists) {
                return failed(res, "Brand not foundd.");
                // return res.status(400).json({ error: "Brand not foundd." });
            }
        }

        if (requests.variant_id) {
            const variantExists = await Variant.findOne({ where: { id: requests.variant_id } });
            if (!variantExists) {
                return failed(res, "Variant not found.");
                // return res.status(400).json({ error: "Variant not found." });
            }
        }

        if (requests.competitor_brand_id) {
            const brandExistss = await Brand.findByPk(requests.competitor_brand_id);
            if (!brandExistss) {
                return failed(res, "Comptiton brand not found.");
                // return res.status(400).json({ error: "Comptiton brand not found." });
            }
        }

        if (requests.competitor_variant_id) {
            const variantExistss = await Variant.findByPk(requests.competitor_variant_id);
            if (!variantExistss) {
                return failed(res, "Comptiton variant not found.");
                // return res.status(400).json({ error: "Comptiton variant not found." });
            }
        }

        let checkAttendence = await Attendence.findOne({
            where: {
                user_id: requests.user_id,
                activity_id: requests.activity_id
            }
        })

        if (!checkAttendence) {
            return failed(res, "This FWP is not checkedin.");
            // return res.status(400).json({ error: "This FWP is not checkedin." });
        }
        let startDate = activityExists.start_date
        let startTime = activityExists.start_time
        let endDate = activityExists.end_date
        let endTime = activityExists.end_time

        let createdAt = await getRandomDateTime(startDate, startTime, endDate, endTime)


        let reqData = {
            "user_id": requests.user_id ? requests.user_id : "",
            "activity_id": requests.activity_id ? requests.activity_id : "",
            "age": requests.age ? requests.age : "",
            "do_you_smoke": requests.do_you_smoke ? requests.do_you_smoke == 0 ? 0 : 1 : 0,
            "participate_survey": requests.participate_survey ? requests.participate_survey == 0 ? 0 : 1 : 0,
            "name": requests.name ? requests.name : "",
            "gender": requests.gender ? requests.gender : "",
            "brand_id": requests.brand_id ? requests.brand_id : null,
            "variant_id": requests.variant_id ? requests.variant_id : null,
            "other": requests.other ? requests.other : "",
            "latitude": checkAttendence.checkin_latitude ? checkAttendence.checkin_latitude : null,
            "longitude": checkAttendence.checkin_longitude ? checkAttendence.checkin_longitude : null,
            "competitor_brand_id": requests.competitor_brand_id ? requests.competitor_brand_id : null,
            "competitor_variant_id": requests.competitor_variant_id ? requests.competitor_variant_id : null,
            "competitor_other": requests.competitor_other ? requests.competitor_other : "",
            "product_rating": requests.product_rating ? requests.product_rating : "",
            "pack_rating": requests.pack_rating ? requests.pack_rating : "",
            "stick_rating": requests.stick_rating ? requests.stick_rating : "",
            "feedback": requests.feedback ? requests.feedback : "",
            "numberOfSticks": requests.numberOfSticks ? requests.numberOfSticks : 0,
            "createdBySpecialUser": 1,
            "specialUserId": req.userId,
            "created_at": createdAt,
            "updated_at": createdAt,
        }

        if (req.files && req.files.signature) {
            reqData = Object.assign(reqData, {
                signature: await uploadToS3(req.files.signature[0], 'PMI/signature')
            })
        }
        console.log({ reqData });

        let create = await Survey.create(reqData, { silent: true })

        // res.status(201).json(create);
        return success(res, {}, "Success");

    } catch (error) {
        console.log({ error });

        return failed(res, error.message);
        // next(error);
    }
};

const updateSurveyBySpecialUser = async (req, res, next) => {
    try {

        if (req.role != 'special_user') {
            return failed(res, "Access denide.");
            // return res.status(400).json({ error: "Access denide." });
        }

        let requests = req.body
        let id = req.params.id
        if (!id) {
            return failed(res, "Survey id is required.");
            // return res.status(400).json({ error: "Survey id is required." });
        }
        const v = new Validator(requests, {
            activity_id: 'required|integer',
            user_id: 'required|integer',
            age: 'required|integer',
            do_you_smoke: 'required|in:0,1',
            participate_survey: 'required|in:0,1',
            // signature : 'file|requiredIf:participate_survey,1',
            name: 'requiredIf:participate_survey,1',
            gender: 'requiredIf:participate_survey,1',
            brand_id: 'requiredIf:participate_survey,1',
            variant_id: 'requiredIf:participate_survey,1',
        });

        const matched = await v.check();

        if (!matched) {
            return validationFailed(res, v);
            // return failed(res, v.errors });
            // return res.status(400).json({ error: v.errors });
        }

        // if (!req.files || !req.files.signature) {
        // return failedjson({ error: "Signature is required." });
        // return res.status(400).json({ error: "Signature is required." });
        // }

        const activitySurvey = await Survey.findByPk(id);
        if (!activitySurvey) {
            return failed(res, "Survey not found.");
            // return res.status(400).json({ error: "Survey not found." });
        }

        if (activitySurvey.specialUserId != req.userId) {
            return failed(res, "Access denide.");
            // return res.status(400).json({ error: "Access denide." });
        }


        const activityExists = await Activity.findByPk(requests.activity_id);
        if (!activityExists) {
            return failed(res, "Activity not found.");
            // return res.status(400).json({ error: "Activity not found." });
        }

        if (requests.brand_id) {
            const brandExists = await Brand.findByPk(requests.brand_id);
            if (!brandExists) {
                return failed(res, "Brand not foundd.");
                // return res.status(400).json({ error: "Brand not foundd." });
            }
        }

        if (requests.variant_id) {
            const variantExists = await Variant.findOne({ where: { id: requests.variant_id } });
            if (!variantExists) {
                return failed(res, "Variant not found.");
                // return res.status(400).json({ error: "Variant not found." });
            }
        }

        if (requests.competitor_brand_id) {
            const brandExistss = await Brand.findByPk(requests.competitor_brand_id);
            if (!brandExistss) {
                return failed(res, "Comptiton brand not found.");
                // return res.status(400).json({ error: "Comptiton brand not found." });
            }
        }

        if (requests.competitor_variant_id) {
            const variantExistss = await Variant.findByPk(requests.competitor_variant_id);
            if (!variantExistss) {
                return failed(res, "Comptiton variant not found.");
                // return res.status(400).json({ error: "Comptiton variant not found." });
            }
        }

        let checkAttendence = await Attendence.findOne({
            where: {
                user_id: requests.user_id,
                activity_id: requests.activity_id
            }
        })

        if (!checkAttendence) {
            return failed(res, "This FWP is not checkedin.");
            // return res.status(400).json({ error: "This FWP is not checkedin." });
        }


        let reqData = {
            "user_id": requests.user_id ? requests.user_id : "",
            "activity_id": requests.activity_id ? requests.activity_id : "",
            "age": requests.age ? requests.age : "",
            "do_you_smoke": requests.do_you_smoke ? requests.do_you_smoke : "",
            "participate_survey": requests.participate_survey ? requests.participate_survey : "",
            "name": requests.name ? requests.name : "",
            "gender": requests.gender ? requests.gender : "",
            "brand_id": requests.brand_id ? requests.brand_id : "",
            "variant_id": requests.variant_id ? requests.variant_id : "",
            "other": requests.other ? requests.other : "",
            "latitude": checkAttendence && checkAttendence.checkin_latitude ? checkAttendence.checkin_latitude : null,
            "longitude": checkAttendence && checkAttendence.checkin_longitude ? checkAttendence.checkin_longitude : null,
            "competitor_brand_id": requests.competitor_brand_id ? requests.competitor_brand_id : "",
            "competitor_variant_id": requests.competitor_variant_id ? requests.competitor_variant_id : "",
            "competitor_other": requests.competitor_other ? requests.competitor_other : "",
            "product_rating": requests.product_rating ? requests.product_rating : "",
            "pack_rating": requests.pack_rating ? requests.pack_rating : "",
            "stick_rating": requests.stick_rating ? requests.stick_rating : "",
            "feedback": requests.feedback ? requests.feedback : "",
            // "createdBySpecialUser":1,
            // "specialUserId":req.userId
        }

        if (req.files && req.files.signature) {
            reqData = Object.assign(reqData, {
                signature: await uploadToS3(req.files.signature[0], 'PMI/signature')
            })
        }

        await Survey.update(reqData, {
            where: {
                id: id
            }
        })

        return success(res, await Survey.findByPk(id), "Success");
        // res.status(201).json(await Survey.findByPk(id));

    } catch (error) {
        console.log({ error });
        return failed(res, error.message);
        // next(error);
    }
};

const getSurvey = async (req, res, next) => {
    try {
        const batchSize = 10000; // Fetch 10K records at a time
        let offset = 0;
        let allRecords = []; // Store all fetched records

        while (true) {
            const records = await Survey.findAll({
                limit: batchSize,
                offset: offset,
                raw: true, // Optimize memory usage
            });

            if (records.length === 0) break; // Stop when no more records

            allRecords = allRecords.concat(records); // Append to main array
            offset += batchSize;

            console.log(`Fetched ${records.length} records from offset ${offset}`);
        }
        return success(res, { success: true, total: allRecords.length, data: allRecords }, "");
        // res.json({ success: true, total: allRecords.length, data: allRecords });
    } catch (error) {
        console.log({ error });
        return failed(res, error.message);
        // next(error);
    }
}

const deleteSurvey = async (req, res, next) => {
    try {
        let id = req.params.id ? req.params.id : ""
        if (!id) {
            return res.status(400).json({ error: "survey id is required" });
        }

        let survey = await Survey.findOne({
            where: { id: req.params.id },
            attributes: [
                ["id", "survey_id"],
                "activity_id",
                "user_id",
                "age",
                "do_you_smoke",
                "participate_survey",
                "name",
                "gender",
                "brand_id",
                "variant_id",
                "numberOfSticks",
                "other",
                "competitor_brand_id",
                "competitor_variant_id",
                "competitor_other",
                "latitude",
                "longitude",
                "signature",
                "feedback",
                "product_rating",
                "pack_rating",
                "stick_rating",
                "createdBySpecialUser",
                "specialUserId",
                "created_at",
                "updated_at",
                "deletedAt"
            ]
        });
        // return success(res, {survey}, "Deleted successfully");
        await DeletedSurvey.create(survey.dataValues, { silent: true })


        await Survey.destroy({
            where : {
            id : id
        },
        force: true})

        return success(res, {}, "Deleted successfully");
        // res.status(200).json(result);
    } catch (error) {
        return failed(res, error.message);
        // next(error);
    }
};

async function getRandomDateTime(startDate, startTime, endDate, endTime, timeZone = "Asia/Kolkata") {

    function parseDateTime(date, time) {
        if (!date || !time) throw new Error("Invalid date or time input.");

        const [year, month, day] = date.split("-").map(Number);
        const [hours, minutes, seconds] = time.split(":").map(Number);

        const parsedDate = new Date(year, month - 1, day, hours, minutes, seconds);

        if (isNaN(parsedDate.getTime())) {
            throw new Error(`Invalid Date: ${date} ${time}`);
        }

        return parsedDate;
    }

    const start = parseDateTime(startDate, startTime).getTime();
    const end = parseDateTime(endDate, endTime).getTime();

    if (start >= end) throw new Error("Start date-time must be before end date-time.");

    // Generate a random timestamp within the range
    const randomTimestamp = Math.floor(Math.random() * (end - start)) + start;
    const randomDate = new Date(randomTimestamp);

    // Extract the date-time components in the correct format
    const localDateString = randomDate.toLocaleDateString("en-GB", { timeZone }).split("/");
    const localTimeString = randomDate.toLocaleTimeString("en-US", {
        timeZone,
        hour12: false,
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit"
    });

    const [day, month, year] = localDateString;
    const milliseconds = String(randomDate.getMilliseconds()).padStart(3, "0");

    return `${year}-${month}-${day} ${localTimeString}.${milliseconds}+05:30`;

}

module.exports = {
    deleteSurvey,
    exportSurvey,
    createSurvey,
    getAllSurveys,
    getSurvey,
    getSurveyById,
    updateSurvey,
    createSurveyBySpecialUser,
    updateSurveyBySpecialUser,
    exportMIPSurveyData,
    exportStaticMIPSurveyData
};