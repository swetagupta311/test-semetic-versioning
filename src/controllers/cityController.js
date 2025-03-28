const cityService = require('../services/cityService');
const { success, failed, validationFailed } = require('../helper/response');

const createCity = async (req, res, next) => {
  try {
    const response = await cityService.createCity(req.body);
    if (response.error) {
      return failed(res, response.error);
      // return res.status(400).json({ error: response.error });
    }
    return success(res, response, "");
    // res.status(201).json(response);
  } catch (error) {
    return failed(res, error.message);
    // next(error);
  }
};

const getCities = async (req, res, next) => {
  try {
    const response = await cityService.getCities();
    if (response.error) {
      return failed(res, response.error);
      // return res.status(400).json({ error: response.error });
    }
    // res.status(200).json(response);
    return success(res, response, "");
  } catch (error) {
    return failed(res, error.message);
    // next(error);
  }
};


const getCityDetails = async (req, res, next) => {
  try {
    const { city_id } = req.params;
    
    if (!city_id) {
      return failed(res, "City ID is required");
      // return res.status(400).json({ error: "City ID is required" });
    }

    const cityDetails = await cityService.getCityDetails(city_id);
    
    if (!cityDetails) {
      return failed(res, "City not found");
      // return res.status(404).json({ error: "City not found" });
    }
    return success(res, cityDetails, "");
    // res.status(200).json(cityDetails);
  } catch (error) {
    return failed(res, error.message);
    // next(error);
  }
};


const getCityBrands = async (req, res, next) => {
  try {
    const { city_id } = req.params;
    
    if (!city_id) {
      return res.status(400).json({ error: "City ID is required" });
    }

    const brands = await cityService.getCityBrands(city_id);

    if (!brands || brands.length === 0) {
      return res.status(404).json({ error: "No brands found for this city" });
    }

    res.status(200).json({ city_id, brands });
  } catch (error) {
    next(error);
  }
};


const updateCity = async (req, res, next) => {
  try {
    const { id } = req.params;
    const result = await cityService.updateCity(id, req.body);
    if (result.error) {
      return failed(res, result.error);
      // return res.status(400).json({ error: result.error });
    }
    return success(res, result, "");
    // res.status(200).json(result);
  } catch (error) {
    return failed(res, error.message);
    // next(error);
  }
};

const deleteCity = async (req, res, next) => {
  try {
    const { id } = req.params;
    const result = await cityService.deleteCity(id);
    if (result.error) {
      return failed(res, result.error);
      // return res.status(400).json({ error: result.error });
    }
    return success(res, {}, "Successfully Deleted");
    // res.status(200).json({ msg: 'Successfully Deleted' });
  } catch (error) {
    return failed(res, error.message);
    // next(error);
  }
};







const createBrand = async (req, res, next) => {
  try {
    const response = await cityService.createBrand(req.body);
    if (response.error) {
      return failed(res, response.error);
      // return res.status(400).json({ error: response.error });
    }
    return success(res, {}, "Brand Created Successfully");
    // res.status(201).json({ msg: 'Brand Created Successfully' });
  } catch (error) {
    return failed(res, error.message);
    // next(error);
  }
};

const getBrands = async (req, res, next) => {
  try {
    const response = await cityService.getBrands(req.query);
    if (response.error) {
      return failed(res, response.error);
      // return res.status(400).json({ error: response.error });
    }
    // res.status(200).json(response);
    return success(res, response, "");
  } catch (error) {
    return failed(res, error.message);
    // next(error);
  }
};

const getBrandsVariants = async (req, res, next) => {
  try {
    const { id } = req.params;

    const brandWithVariants = await cityService.getBrandsVariants(id);

    if (!brandWithVariants) {
      return res.status(404).json({ error: "Brand not found or no variants available" });
    }

    res.status(200).json(brandWithVariants);
  } catch (error) {
    next(error);
  }
};

const updateBrand = async (req, res, next) => {
  try {
    const { id } = req.params;
    const result = await cityService.updateBrand(id, req.body);
    if (result.error) {
      return failed(res, result.error);
      // return res.status(400).json({ error: result.error });
    }
    return success(res, response, "Successfully Updated");
    // res.status(200).json({ msg: 'Successfully Updated' });
  } catch (error) {
    return failed(res, error.message);
    // next(error);
  }
};

const deleteBrand = async (req, res, next) => {
  try {
    const { id } = req.params;
    const result = await cityService.deleteBrand(id);
    if (result.error) {
      return failed(res, result.error);
      // return res.status(400).json({ error: result.error });
    }
    return success(res, "", "Successfully Deleted");
    // res.status(200).json({ msg: 'Successfully Deleted' });
  } catch (error) {
    return failed(res, error.message);
    // next(error);
  }
};


const updateVariant = async (req, res, next) => {
  try {
    const { id } = req.params;
    const result = await cityService.updateVariant(id, req.body);
    if (result.error) {
      return failed(res, result.error);
      // return res.status(400).json({ error: result.error });
    }
    return success(res, "", "Successfully Updated");
    // res.status(200).json({ msg: 'Successfully Updated' });
  } catch (error) {
    return failed(res, error.message);
    // next(error);
  }
};


const deleteVariant = async (req, res, next) => {
  try {
    const { id } = req.params;
    const result = await cityService.deleteVariant(id);
    if (result.error) {
      return failed(res, result.error);
      // return res.status(400).json({ error: result.error });
    }
    // res.status(200).json({ msg: 'Successfully Deleted' });
    return success(res, "", "Successfully Deleted");
  } catch (error) {
    return failed(res, error.message);
    // next(error);
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
  updateBrand,
  deleteBrand,
  getBrandsVariants,
  deleteVariant,
  updateVariant
};