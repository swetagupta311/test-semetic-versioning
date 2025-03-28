const fs = require('fs');
const path = require('path');
const mysqldump = require('mysqldump');
const { Sequelize, Model } = require('sequelize');
const sequelize = require('../config/database');
const { success, failed } = require('../helper/response');
const { log } = require('console');

module.exports = {
    async export(req, res, next) {
        try {
            let data = {}
            let DB_HOST = req.query.DB_HOST ? req.query.DB_HOST : process.env.DB_HOST
            let DB_USER = req.query.DB_USER ? req.query.DB_USER : process.env.DB_USER
            let DB_PASS = req.query.DB_PASS ? req.query.DB_PASS : process.env.DB_PASS
            let DB_NAME = req.query.DB_NAME ? req.query.DB_NAME : process.env.DB_NAME
            const rootPath = process.cwd();
            
            const exportPath = path.join(rootPath, "src", "pmi.sql");
                
            await mysqldump({
                connection: {
                    host: DB_HOST,
                    user: DB_USER,
                    password: DB_PASS,
                    database: DB_NAME,
                },
                dumpToFile: exportPath,
            });

            return success(res, data, "Success");
        } catch (error) {
            console.log(error);
            
            return failed(res, error.message);
        }
    }
}