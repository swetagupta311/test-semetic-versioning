const parseArrayFields = (fields) => {
    return (req, res, next) => {
        fields.forEach(field => {
            if (req.body[field]) {
                try {
                    req.body[field] = JSON.parse(req.body[field]);
                } catch (error) {
                    return res.status(400).json({ error: `${field} must be a valid JSON array` });
                }
            }
        });
        next();
    };
};

const parseNormalFields = (fields) => {
    return (req, res, next) => {
        fields.forEach(field => {
            if (req.body[field]) {
                req.body[field] = String(req.body[field]).trim();
            }
        });
        next();
    };
};

module.exports = { parseArrayFields, parseNormalFields };
