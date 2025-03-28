const rateLimit = require('express-rate-limit');

const limitRequests = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 200, // Limit each IP to 60 requests per windowMs
  handler: (req, res) => {
    res.status(429).json({
      msg: 'Too many requests from this IP, please try again after a minute'
    });
  }
});

module.exports = limitRequests;