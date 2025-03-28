const { success, failed } = require('../helper/response');

module.exports = {
    index : (req, res) => {
        try {
            let data = {}
            
            return success(res, data);
        } catch (error) {
            return failed(res, error.message);
        }
    }
}