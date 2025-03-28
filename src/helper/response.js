const Logs = require('../models/logsModel')

exports.success = function (res, data = {}, message = "", code = 200) {
    let resData = data;

    if (message != "" && Object.keys(resData).length > 0) {
        resData = {
            msg : message,
            data: data
        };
    } else if (Object.keys(resData).length == 0 && message != "") {
      resData = {
        msg : message
      }
    }
    //  else if (Object.keys(resData).length != 0 && message == "") {
    //   resData = data
    // }

    generateLogs(1, message)
    res.status(code).json(resData);
};

exports.failed = function (res, message, code = 400, data) {
    generateLogs(0, message)
    res.status(code).json({
        error: message
    });
};

exports.validationFailed = function (res, v) {
    let first_key = Object.keys(v.errors)[0];
    let err = v.errors[first_key]["message"];

    let response = {
        error: err
    };
    res.status(400).json(response);
};

const generateLogs = function (status, message) {
    try {
      let globalRequest = globalRequests()
      let req = globalRequest.req
      const baseUrl = req.protocol + '://' + req.get('host') + '/v1/';
      let endpoint = req.path.replace(/^\/+/, "");
      endpoint = endpoint.replace(/\/\d+\/?$/, "");
      const fullUrl = req.protocol + '://' + req.get('host') + req.originalUrl;
      const method = req.method;
      let requests = req.query && Object.keys(req.query).length > 0 ? req.query : req.body
      
      let params = req.params && Object.keys(req.params).length > 0 ? req.params : {}
      let merged = {...params, ...requests};
      let requestData = {
        status : status,
        message : message,
        method : method,
        userId : req.userId,
        baseUrl : baseUrl,
        urlEndPoint : endpoint,
        fullUrl : fullUrl,
        requests : JSON.stringify(merged),
      }
  
      Logs.create(requestData).then(data => {
        return true
      })
    } catch (error) {
      console.log({error});
      
    }
}