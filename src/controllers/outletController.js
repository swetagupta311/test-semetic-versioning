const outletService = require('../services/outletService');
const { success, failed, validationFailed } = require('../helper/response');

const createOutlet = async (req, res, next) => {
    try {
        const response = await outletService.createOutlet(req.body);
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

const getOutlets = async (req, res, next) => {
    try {
        const response = await outletService.getOutlets(req.query);
        if (response.error) {
            return failed(res, response.error);
            // return res.status(400).json({ error: response.error });
        }
        return success(res, response, "");
        // res.status(200).json(response);
    } catch (error) {
        return failed(res, error.message);
        // next(error);
    }
};

const getOutletById = async (req, res, next) => {
    try {
        const { id } = req.params;
        const response = await outletService.getOutletById(id);
        if (response.error) {
            return failed(res, response.error);
            // return res.status(400).json({ error: response.error });
        }
        return success(res, response, "");
        // res.status(200).json(response);
    } catch (error) {
        return failed(res, error.message);
        // next(error);
    }
};

const updateOutlet = async (req, res, next) => {
    try {
        const { id } = req.params;
        const result = await outletService.updateOutlet(id, req.body);
        if (result.error) {
            return failed(res, result.error);
            // return res.status(400).json({ error: result.error });
        }
        return success(res, result, "");
        // res.status(200).json(result);
    } catch (error) {
        return failed(res, error.message)
        // next(error);
    }
};


const deleteOutlet = async (req, res, next) => {
    try {
        const { id } = req.params;
        const result = await outletService.deleteOutlet(id);
        if (result.error) {
            return res.status(400).json({ error: result.error });
        }
        res.status(200).json(result);
    } catch (error) {
        next(error);
    }
};


module.exports = {
    createOutlet,
    getOutlets,
    getOutletById,
    updateOutlet,
    deleteOutlet,
};