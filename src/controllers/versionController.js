const { success, failed, validationFailed } = require("../helper/response");
const { Validator } = require('node-input-validator');
const { uploadToS3, deleteFileFromS3, checkFileExists, listFilesInFolder, getPreSignedUrl } = require('../config/s3');
const Version = require("../models/versionModel");
const { Op , fn, col } = require("sequelize");

module.exports = {
  addApkAndVersion: async (req, res) => {
    try {
      let data = {};

      const v = new Validator(req.body, {
        version: 'required',
      });

      const matched = await v.check();

      if (!matched) {
        return validationFailed(res, v);
      }

      const v1 = new Validator(req.files, {
        apk: 'required',
      });

      const matched1 = await v1.check();

      if (!matched1) {
        return validationFailed(res, v1);
      }

      let version = req.body.version;
      let file = req.files && req.files.apk ? req.files.apk : "";
      let fileName = file[0].originalname;
      let extension = fileName.split('.').pop();
      if (extension != "apk") {
        return failed(res, "file must be apk");
      }

      let checkVersionExistance = await Version.findOne({
        where: {
          version: version
        }
      });

      if (checkVersionExistance) {
        return failed(res, `${version} already exist`);
      }

      // let checkMaxVersionExistance = await Version.findOne({
      //   order: [['version', 'DESC']],
      //   attributes: [
      //     "version"
      //   ]
      // });

      // if (checkMaxVersionExistance && checkMaxVersionExistance.version > parseFloat(version)) {
      //   return failed(res, `new version must be greater than ${checkMaxVersionExistance.version}`);
      // }

      let modifiedName = `pmi_${version}.${extension}`;
      
      let checkFileExist = await checkFileExists(`PMI/apk/${modifiedName}`);
      
      if (checkFileExist) {
          await deleteFileFromS3(`PMI/apk/${modifiedName}`);
        }
        
        // let folderPath = "PMI/apk/";
        // let allFiles = await listFilesInFolder(folderPath)
      let apkPath = await uploadToS3(file[0], `PMI/apk`, modifiedName);
        
      let requestData = {
        version: version,
        fileName: modifiedName,
        apkPath: apkPath
      };

      await Version.update(
        { status: false }, 
        { where: { status: true } }
      );

      await Version.create(requestData);

      return success(res, data, "Success");
    } catch (error) {
      console.log({ error });
      return failed(res, error.message);
    }
  },

  updatedVersion: async (req, res) => {
    try {
      let data = {};
      let path = process.env.AWS_URL || "https://philipmorrison.s3.ap-south-1.amazonaws.com/";
      let version = await Version.findOne({
        where: {
          status: true
        },
        attributes: [
          "version",
          "fileName",
          "apkPath",
          "created_at",
          [fn('CONCAT', path, col('apkPath')), 'apkUrl']
        ]
      });

      let signedUrl = await getPreSignedUrl(version.apkPath)
      let resData = {
        version : version.version,
        fileName : version.fileName,
        created_at : version.created_at,
        apkUrl : signedUrl,
      }

      return success(res, resData, "Success");
    } catch (error) {
      console.log({ error });
      return failed(res, error.message);
    }
  }
};