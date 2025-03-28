
const { City, Brand, CityBrand, Variant } = require('../models/cityModel');
const Outlet = require('../models/outletModel');
const Activity = require('../models/activityModel');
const { Op, fn, col, literal } = require('sequelize');

const createCity = async (data) => {
    try {
        // Check if city already exists
        const city = await City.findOne({ where: { city_name: data.city_name } });
        if (city) {
            return { error: 'City Already Exists' };
        }

        // Create new city
        const newCity = await City.create({
            city_name: data.city_name,
            state_name: data.state_name
        });

        let ignoredBrandIds = [];

        if (data.brands && Array.isArray(data.brands)) {
            // Fetch valid brand IDs from the database
            const existingBrands = await Brand.findAll({
                where: { id: data.brands }
            });

            const validBrandIds = existingBrands.map(brand => brand.id);
            ignoredBrandIds = data.brands.filter(id => !validBrandIds.includes(id));

            if (validBrandIds.length > 0) {
                const cityBrandEntries = validBrandIds.map(brandId => ({
                    city_id: newCity.id,
                    brand_id: brandId
                }));

                await CityBrand.bulkCreate(cityBrandEntries);
            }

            // Use ignoredBrandIds instead of invalidBrandIds
            if (ignoredBrandIds.length > 0) {
                console.warn(`Ignored brand IDs (not found):`, ignoredBrandIds);
            }
        }

        return {
            msg: "City created successfully",
            city: newCity,
            ignored_brands: ignoredBrandIds.length > 0 ? ignoredBrandIds : null
        };
    } catch (error) {
        throw new Error(error.message);
    }
};


const getCities = async () => {
    try {
        return await City.findAll({
            include: [
                {
                    model: Brand,
                    as: "brands",
                    through: CityBrand,
                    attributes: ['id', 'brand_name'],
                }
            ]
        });
    } catch (error) {
        throw new Error(error.message);
    }
};


const getCityDetails = async (city_id) => {
    try {
        return await City.findOne({
            where: { id: city_id },
            include: [
                {
                    model: Outlet,
                    as: "outlets",
                    include: [
                        {
                            model: Activity,
                            as: "activities",
                            attributes: ["id", "activity_type", "activity_date", "supervisor_id", "fwp1_id", "fwp2_id"],
                        },
                    ],
                    attributes: ["id", "outlet_name", "outlet_code", "outlet_address"],
                },
            ],
        });
    } catch (error) {
        throw new Error(error.message);
    }
};


const getCityBrands = async (city_id) => {
    try {
        const city = await City.findOne({
            where: { id: city_id },
            attributes: ["id", "state_name", "city_name", "created_at", "updated_at"],
            include: [
                {
                    model: Brand,
                    as: "brands",
                    attributes: ["id", "brand_name"],
                    through: { attributes: [] },
                },
            ],
        });

        if (city) {
            city.brands = city.brands.sort((a, b) => a.brand_name.localeCompare(b.brand_name));
        }

        return city;
    } catch (error) {
        throw new Error(error.message);
    }
};

const updateCity = async (id, data) => {
    try {
        const city = await City.findOne({ where: { id } });
        if (!city) {
            return { error: 'City Not Found' };
        }

        await City.update(data, { where: { id } });

        let ignoredBrandIds = [];

        if (data.brands && Array.isArray(data.brands)) {
            // Get existing brand IDs from the database
            const existingBrands = await Brand.findAll({
                where: { id: data.brands }
            });

            const validBrandIds = existingBrands.map(brand => brand.id);
            ignoredBrandIds = data.brands.filter(id => !validBrandIds.includes(id));

            // Remove all existing CityBrand associations for this city
            await CityBrand.destroy({ where: { city_id: id } });

            // Insert only valid brand IDs
            if (validBrandIds.length > 0) {
                const cityBrandEntries = validBrandIds.map(brandId => ({
                    city_id: id,
                    brand_id: brandId
                }));

                await CityBrand.bulkCreate(cityBrandEntries);
            }
        }

        const updatedCity = await City.findByPk(id, {
            include: [
                {
                    model: Brand,
                    as: "brands",
                    through: CityBrand,
                    attributes: ["id", "brand_name"]
                }
            ]
        });

        return {
            msg: "City updated successfully",
            city: updatedCity,
            ignored_brands: ignoredBrandIds.length > 0 ? ignoredBrandIds : null
        };
    } catch (error) {
        throw new Error(error.message);
    }
};

const deleteCity = async (id) => {
    try {
        const city = await City.findOne({ where: { id } });
        if (!city) {
            return { error: 'City Not Found' };
        }

        return await City.destroy({ where: { id } });
    } catch (error) {
        throw new Error(error.message);
    }
};

const createBrand = async (data) => {
    try {
        const existingBrand = await Brand.findOne({ where: { brand_name: data.brand_name } });
        if (existingBrand) {
            return { error: 'Brand Already Exists' };
        }

        const brand = await Brand.create({ brand_name: data.brand_name });

        if (data.variants && Array.isArray(data.variants)) {
            const variants = data.variants.map(variant_name => ({ brand_id: brand.id, variant_name }));
            await Variant.bulkCreate(variants);
        }

        return brand;
    } catch (error) {
        throw new Error(error.message);
    }
};

const getBrands = async (request) => {
    try {
        let params = {}
        let search = request.search
        if (search) {
            console.log({search});
            
            params = Object.assign(params, {
                brand_name : {
                    [Op.iLike] : `%${search}%`
                }
            })
        }
        return await Brand.findAll({
            where : params,
            include: [{ model: Variant, as: 'variants', attributes: ['id', 'variant_name'] }],
        });
    } catch (error) {
        throw new Error(error.message);
    }
};

const getBrandsVariants = async (brand_id) => {
    try {

        let brand = await Brand.findOne({
            where: { id: brand_id },
            include: [
                {
                    model: Variant,
                    as: "variants",
                    attributes: ["id", "variant_name", "packSize"],
                    separate: true,
                    order: [["variant_name", "ASC"]],
                },
            ],
        });
        let variants = brand.variants;
        for (let index = 0; index < variants.length; index++) {
            variants[index].packSize = variants[index].packSize ? JSON.parse(variants[index].packSize) :[]    
        }

        brand.variants = variants

        return brand;
    } catch (error) {
        throw new Error(error.message);
    }
};

const updateBrand = async (id, data) => {
    try {
        const brand = await Brand.findByPk(id, {
            include: [{ model: Variant, as: 'variants', attributes: ['id', 'variant_name'] }],
        });

        if (data.brand_name) {
            await Brand.update({ brand_name: data.brand_name }, { where: { id } });
        }
        const existingVariants = brand.variants.map(v => v.variant_name.trim());
        const newVariants = data.variants ? data.variants.map(v => v.trim()) : [];
        const variantsToRemove = existingVariants.filter(v => !newVariants.includes(v));
        if (variantsToRemove.length > 0) {
            console.log("Removing Variants:", variantsToRemove);
            await Variant.destroy({
                where: {
                    brand_id: id,
                    variant_name: { [Op.in]: variantsToRemove },
                },
            });
        }

        for (const variant_name of newVariants) {
            await Variant.findOrCreate({
                where: { brand_id: id, variant_name },
                defaults: { brand_id: id, variant_name },
            });
        }

        return await Brand.findByPk(id, {
            include: [{ model: Variant, as: 'variants', attributes: ['id', 'variant_name'] }],
        });
    } catch (error) {
        throw new Error(error.message);
    }
};

const deleteBrand = async (id) => {
    try {
        const brand = await Brand.findByPk(id);
        if (!brand) {
            return { error: 'Brand Not Found' };
        }

        await Variant.destroy({ where: { brand_id: id } });
        await Brand.destroy({ where: { id } });

        return { msg: 'Brand and its variants deleted successfully' };
    } catch (error) {
        throw new Error(error.message);
    }
};

const updateVariant = async (id, data) => {
    try {
        const variant = await Variant.findByPk(id);
        if (!variant) {
            return { error: 'Variant Not Found' };
        }

        if (data.variant_name) {
            await Variant.update({ variant_name: data.variant_name }, { where: { id } });
        }
        return await Variant.findByPk(id);
    } catch (error) {
        throw new Error(error.message);
    }
};

const deleteVariant = async (id) => {
    try {
        const variant = await Variant.findByPk(id);
        if (!variant) {
            return { error: 'Variant Not Found' };
        }

        await Variant.destroy({ where: { id } });

        return { msg: 'Variant deleted successfully' };
    } catch (error) {
        throw new Error(error.message);
    }
};



module.exports = {
    createCity,
    getCities,
    getCityDetails,
    getCityBrands,
    updateCity,
    deleteCity,
    createBrand,
    getBrands,
    getBrandsVariants,
    updateBrand,
    deleteBrand,
    updateVariant,
    deleteVariant
};