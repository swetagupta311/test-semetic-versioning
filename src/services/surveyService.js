const Survey = require('../models/surveyModel');
const demoSurvey = require('../models/demoSurveyModel');
const Activity = require('../models/activityModel');
const User = require('../models/userModel');
const { Brand, Variant } = require('../models/cityModel');
const { uploadToS3 } = require('../config/s3');
const { Op } = require("sequelize");
const moment = require('moment')
const folder = process.env.AWS_S3_BUCKET_FOLDER || 'PMI'

const createSurvey = async (data) => {
    try {
        if (!data.activity_id) {
            return { error: "Activity ID is required" };
        }
        
        // Check if activity exists
        const activityExists = await Activity.findByPk(data.activity_id);
        if (!activityExists) {
            return { error: "Activity not found" };
        }
        let survey = {}
        if (data.appMode == 'demo') {
            survey = await demoSurvey.create(data);
        } else {
            survey = await Survey.create(data);
        }        
        return survey;
    } catch (error) {
        throw new Error(error.message);
    }
};

const getAllSurveys = async (req, role, currentUserId) => {
    try {

        let pageSize = req.limit ? parseInt(req.limit) : 10;
        let page = req.page ? parseInt(req.page) : 1;
        let offset = pageSize * (page - 1);
        let City_id = req.City_id ? req.City_id : "";
        let outlet_id = req.outlet_id ? JSON.parse(req.outlet_id) : "";
        let start_date = req.start_date ? req.start_date : "";
        let end_date = req.end_date ? req.end_date : "";
        
        let params = {}
        
        if (City_id) {
            params = Object.assign(params, {
                "$activity.city_id$" : City_id 
            })
        }
        
        if (outlet_id && outlet_id.length > 0) {
            params = Object.assign(params, {
                "$activity.outlet_id$" : {
                    [Op.in]: outlet_id
                } 
            })
        }
        // start_date = new Date(start_date).toISOString().split('T')[0];  // Convert to yyyy-mm-dd
        // end_date = new Date(end_date).toISOString().split('T')[0]; 
        // console.log({start_date, end_date});
        
        // if (start_date && end_date) {
        //     params = Object.assign(params, {
        //         [Op.and]: [
        //             {
        //                 "$activity.start_date$": {
        //                     [Op.gte]: moment(start_date).format("YYYY-MM-DD")
        //                 }
        //             }, 
        //             {
        //                 "$activity.end_date$": {
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
        
        let surveys = await Survey.findAll({
            where : params,
            include: [
                { model: Activity, as: 'activity' },
                { model: Brand, as: 'brand' },
                { model: Variant, as: 'variant' },
                { model: Brand, as: 'competitonBrand' },
                { model: Variant, as: 'comptitonVariant' },
                {
                    model : User,
                    as : 'user',
                    attributes : [
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
        });
        let servayArray = []
        for (let index = 0; index < surveys.length; index++) {
            let data = {
                "id" : surveys[index].id ? surveys[index].id : "" ,
                "activity_id" : surveys[index].activity_id ? surveys[index].activity_id : "" ,
                "user_id" : surveys[index].user_id ? surveys[index].user_id : "" ,
                "age" : surveys[index].age ? surveys[index].age : "" ,
                "do_you_smoke" : surveys[index].do_you_smoke ? surveys[index].do_you_smoke : "" ,
                "participate_survey" : surveys[index].participate_survey ? surveys[index].participate_survey : "" ,
                "name" : surveys[index].name ? surveys[index].name : "" ,
                "gender" : surveys[index].gender ? surveys[index].gender : "" ,
                "brand_id" : surveys[index].brand_id ? surveys[index].brand_id : "" ,
                "variant_id" : surveys[index].variant_id ? surveys[index].variant_id : "" ,
                "other" : surveys[index].other ? surveys[index].other : "" ,
                "competitor_brand_id" : surveys[index].competitor_brand_id ? surveys[index].competitor_brand_id : "" ,
                "competitor_variant_id" : surveys[index].competitor_variant_id ? surveys[index].competitor_variant_id : "" ,
                "competitor_other" : surveys[index].competitor_other ? surveys[index].competitor_other : "" ,
                "latitude" : surveys[index].latitude ? surveys[index].latitude : "" ,
                "longitude" : surveys[index].longitude ? surveys[index].longitude : "" ,
                "signature" : surveys[index].signature ? surveys[index].signature : "" ,
                "feedback" : surveys[index].feedback ? surveys[index].feedback : "" ,
                "product_rating" : surveys[index].product_rating ? surveys[index].product_rating : "" ,
                "pack_rating" : surveys[index].pack_rating ? surveys[index].pack_rating : "" ,
                "stick_rating" : surveys[index].stick_rating ? surveys[index].stick_rating : "" ,
                "created_at" : surveys[index].created_at ? surveys[index].created_at : "" ,
                "updated_at": surveys[index].updated_at ? surveys[index].updated_at : "",
                "activity" : surveys[index].activity ? surveys[index].activity : "",
                "brand" : surveys[index].brand ? surveys[index].brand : "",
                "variant" : surveys[index].variant ? surveys[index].variant : "",
                "competitonBrand" : surveys[index].competitonBrand ? surveys[index].competitonBrand : "",
                "comptitonVariant" : surveys[index].comptitonVariant ? surveys[index].comptitonVariant : "",
                "user" : surveys[index].user ? surveys[index].user : "",
            }
            
            if (role == "special_user") {
                let isEditable = false
                
                if (surveys[index].createdBySpecialUser == 1 && surveys[index].specialUserId == currentUserId) {
                    isEditable = true
                }
                
                data = Object.assign(data, {
                        "isEditable" : isEditable
                })
            }

            servayArray.push(data)
        }
        
        return servayArray;
    } catch (error) {
        throw new Error(error.message);
    }
};

const getSurveyById = async (id) => {
    try {
        const survey = await Survey.findByPk(id, {
            include: [
                { model: Activity, as: 'activity' },
                { model: Brand, as: 'brand' },
                { model: Variant, as: 'variant' }
            ],
        });

        if (!survey) {
            return { error: "Survey not found" };
        }
        return survey;
    } catch (error) {
        throw new Error(error.message);
    }
};

const updateSurvey = async (id, data, files) => {
    try {
        let survey = ""
        if (data.appMode == 'demo') {
            survey = await demoSurvey.findByPk(id);
        } else {
            survey = await Survey.findByPk(id);
        }
        
        if (!survey) {
            return { error: "Survey not found" };
        }

        if (files.signature) {
            data.signature = await uploadToS3(files.signature[0], `${folder}/signature`);
        }

        if (data.brand_id) {
            const brandExists = await Brand.findByPk(data.brand_id);
            if (!brandExists) {
                return { error: "Brand not found" };
            }
        }
        
        if (data.variant_id) {
            const variantExists = await Variant.findByPk(data.variant_id);
            if (!variantExists) {
                return { error: "Variant not found" };
            }
        }

        await survey.update(data);
        return survey;
    } catch (error) {
        throw new Error(error.message);
    }
};

module.exports = {
    createSurvey,
    getAllSurveys,
    getSurveyById,
    updateSurvey
};
