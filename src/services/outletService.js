
const Outlet = require('../models/outletModel');
const { City } = require('../models/cityModel');
const sequelize = require('../config/database');
const { Op } = require('sequelize');


const createOutlet = async (data) => {
    try {
        const city = await City.findByPk(data.city_id);
        if (!city) {
            return { error: 'City Not Found' };
        }

        const existingOutlet = await Outlet.findOne({
            where: {
                city_id: data.city_id,
                outlet_name: data.outlet_name
            }
        });

        if (existingOutlet) {
            return { error: 'Outlet name already exists in this city' };
        }

        let outletCode = data.outlet_code ? (data.outlet_code).toUpperCase() : "";
        const outletExists = await Outlet.findOne({ where: { outlet_code: outletCode } });
        if (outletExists) {
            return { error: 'Outlet code already exists' };
        }
        data.outlet_code = outletCode
        // while (!isUnique) {
        //     const randomNum = Math.floor(1000 + Math.random() * 9000);
        //     outletCode = `MIP-OT-${randomNum}`;

        //     const outletExists = await Outlet.findOne({ where: { outlet_code: outletCode } });
        //     if (!outletExists) {
        //         isUnique = 1;
        //     }
        // }
        let isTestOutlet = data.isTestingOutlet == 1 ? 0 : 1 // reverse value
        let lat = data.outlet_latitude ? data.outlet_latitude : ""
        let long = data.outlet_longitude ? data.outlet_longitude : ""
        console.log({isTestOutlet});
        
        if (isTestOutlet == 0) {
            if (lat == "") {
                return { error: 'Latitude is required' };
            }
            if (long == "") {
                return { error: 'Longitude is required' };
            }
        }

        data.isTestingOutlet = isTestOutlet
        
        const newOutlet = await Outlet.create({
            ...data,
            outlet_code: outletCode
        });

        return {
            msg: "Outlet created successfully",
            outlet: "newOutlet"
        };
    } catch (error) {
        throw new Error(error.message);
    }
};

const getOutlets = async (req) => {
    try {
        let params = {}
        let cityId = req.city_id ? req.city_id : "" 
        let search = req.search ? req.search : "" 
        if (cityId) {
            params = Object.assign(params, {
                city_id : cityId
            })
        }
        if (search) {
            params = Object.assign(params, {
                [Op.or] : [
                    {
                        outlet_name : {
                            [Op.iLike] : `%${search}%`
                        }
                    },
                    {
                        outlet_code : {
                            [Op.iLike] : `%${search}%`
                        }
                    },
                    {
                        "$city.city_name$" : {
                            [Op.iLike] : `%${search}%`
                        }
                    },
                    {
                        outlet_latitude : {
                            [Op.iLike] : `%${search}%`
                        }
                    },
                    {
                        outlet_longitude : {
                            [Op.iLike] : `%${search}%`
                        }
                    }
                ]
            })
        }
        return await Outlet.findAll({
            attributes : [
                "id",
                "city_id",
                "outlet_name",
                "outlet_code",
                "outlet_address",
                "outlet_area",
                "outlet_latitude",
                "outlet_longitude",
                [sequelize.literal(`CASE WHEN "isTestingOutlet" = 0 THEN 1 ELSE 0 END`), 'isTestingOutlet'],
                // "isTestingOutlet",
                "created_at",
                "updated_at"
            ],
            include: {
                model: City,
                as: "city",
                attributes: ["id", "city_name"]
            },
            where : params
        });
    } catch (error) {
        throw new Error(error.message);
    }
};



const getOutletById = async (id) => {
    try {
        const outlet = await Outlet.findByPk(id, {
            attributes : [
                "id",
                "city_id",
                "outlet_name",
                "outlet_code",
                "outlet_address",
                "outlet_area",
                "outlet_latitude",
                "outlet_longitude",
                [sequelize.literal(`CASE WHEN "isTestingOutlet" = 0 THEN 1 ELSE 0 END`), 'isTestingOutlet'],
                // "isTestingOutlet",
                "created_at",
                "updated_at"
            ],
            include: {
                model: City,
                as: "city",
                attributes: ["id", "city_name"]
            }
        });

        if (!outlet) {
            return { error: "Outlet Not Found" };
        }

        return outlet;
    } catch (error) {
        throw new Error(error.message);
    }
};


const updateOutlet = async (id, data) => {
    try {
        const outlet = await Outlet.findByPk(id);
        if (!outlet) {
            return { error: "Outlet Not Found" };
        }

        if (data.city_id) {
            const city = await City.findByPk(data.city_id);
            if (!city) {
                return { error: "City Not Found" };
            }
        }

        let isTestOutlet = data.isTestingOutlet == 1 ? 0 : 1 // reverse value
        let lat = data.outlet_latitude ? data.outlet_latitude : ""
        let long = data.outlet_longitude ? data.outlet_longitude : ""
        if (isTestOutlet == 0) {
            if (lat == "") {
                return { error: 'Latitude is required' };
            }
            if (long == "") {
                return { error: 'Longitude is required' };
            }
        } else {
            data.outlet_latitude = null
            data.outlet_longitude = null
        }


        data.isTestingOutlet = isTestOutlet

        await Outlet.update(data, { where: { id } });

        return {
            msg: "Outlet updated successfully",
            outlet: await Outlet.findByPk(id)
        };
    } catch (error) {
        throw new Error(error.message);
    }
};


const deleteOutlet = async (id) => {
    try {
        const outlet = await Outlet.findByPk(id);
        if (!outlet) {
            return { error: "Outlet Not Found" };
        }

        await Outlet.destroy({ where: { id } });

        return { msg: "Outlet deleted successfully" };
    } catch (error) {
        throw new Error(error.message);
    }
};


module.exports = {
    createOutlet,
    getOutlets,
    getOutletById,
    updateOutlet,
    deleteOutlet,
};