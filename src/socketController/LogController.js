const fs = require('fs');
const moment = require('moment');
const path = require('path');
const { success, failed } = require("../helper/response");

module.exports = (io) => {
  console.log("Socket.IO server initialized");

  io.on("connection", (socket) => {
    console.log("Client connected");

    socket.on("createLog", async (log) => {
      try {
        await appendToJsonFileSocket(log, 'logs.json');
        io.emit("response", { type: "new-message" });
      } catch (error) {
        console.error("Error handling createLog event:", error);
      }
    });

    socket.on("disconnect", () => {
      console.log("Client disconnected");
    });
  });
};

const appendToJsonFileSocket = async (newData, filename) => {
  try {
    let data = [];
    const parsedData = JSON.parse(newData);

    const newDate = moment().format('YYYY-MM-DD HH:mm:ss');
    const logEntry = {
      [newDate]: parsedData.new_logs,
    };

    // Check if file exists and read it
    if (fs.existsSync(filename)) {
      const fileContent = fs.readFileSync(filename, 'utf8');
      data = JSON.parse(fileContent);

      if (!Array.isArray(data)) {
        data = []; // Ensure it's an array
      }
    }

    // Append new data
    data.push(logEntry);

    // Write updated data back to the file
    fs.writeFileSync(filename, JSON.stringify(data, null, 2), 'utf8');

    console.log('Data appended successfully!');
  } catch (error) {
    console.error('Error appending to JSON file:', error);
  }
};

// const appendToJsonFile = async (req, res) => {
//   try {
//     let data = [];
//     let options = { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' };
//     let formattedDate = new Intl.DateTimeFormat('en-CA', options).format(new Date());

//     // Replace slashes with hyphens
//     let currentDate = formattedDate.replace(/\//g, '-');
//     const filename = `Logs/${currentDate}.json`;
//     const parsedData = req.body.log;

//     // Check if file exists and read it
//     if (fs.existsSync(filename)) {
//       const fileContent = fs.readFileSync(filename, 'utf8');
//       data = JSON.parse(fileContent);

//       if (!Array.isArray(data)) {
//         data = []; // Ensure it's an array
//       }
//     }


//     // Append new data
//     data.push(parsedData);

//     // Write updated data back to the file
//     fs.writeFileSync(filename, JSON.stringify(data, null, 2), 'utf8');
//     return res.status(200).json({ msg: "Success" });
//   } catch (error) {
//     console.error('Error appending to JSON file:', error);
//     next(error);
//   }
// };

const appendToJsonFile = async (req, res, next) => {
  try {
    let data = [];


    
    let options = { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' };
    let formattedDate = new Intl.DateTimeFormat('en-CA', options).format(new Date());

    // Replace slashes with hyphens to match file format
    let currentDate = formattedDate.replace(/\//g, '-');
    const dirPath = 'Logs';  // Ensure Logs folder exists
    // const filename = path.join(dirPath, `${currentDate}.json`);
    const filename = `Logs/${currentDate}.json`;
    // Ensure the Logs directory exists
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });  // Create Logs directory if not exists
    }
    
    // If file does not exist, create it with empty array and set read/write permissions
    if (!fs.existsSync(filename)) {
      fs.writeFileSync(filename, JSON.stringify([], null, 2), { flag: 'w', mode: 0o666 });
    }

    // Read the existing file content
    const fileContent = fs.readFileSync(filename, 'utf8');
    data = JSON.parse(fileContent);

    if (!Array.isArray(data)) {
      data = []; // Ensure it's an array
    }

    // Append new log data
    const parsedData = req.body.log;
    data.push(parsedData);

    // Write updated data back to the file
    fs.writeFileSync(filename, JSON.stringify(data, null, 2), 'utf8');

    return res.status(200).json({ msg: "Success" });
  } catch (error) {
    console.error('Error appending to JSON file:', error);
    next(error);
  }
};

const getAllLogsFile = async (req, res, next) => {
  try {
    const directoryPath = 'Logs';
    const fileList = fs.readdirSync(directoryPath);
    return res.status(200).json({ msg: "Success", files : fileList });
  } catch (error) {
    next(error);
  }
}

const readLogFile = async (req, res, next) => {
  try {
    let file = req.query.fileName
    if (!file) {
      return res.status(401).json({ msg: "file name is required" });
    }
    const directoryPath = 'Logs';
    const filePath = `${directoryPath}/${file}`;
    const fileContent = fs.readFileSync(filePath, 'utf-8');
    return res.status(200).json({ msg: "Success", file : JSON.parse(fileContent) });
  } catch (error) {
    next(error);
  }
}

const removeLogFile = async (req, res, next) => {
  try {
    let file = req.query.fileName
    if (!file) {
      return res.status(401).json({ msg: "file name is required" });
    }
    const directoryPath = 'Logs';
    const filePath = `${directoryPath}/${file}`;
    const fileContent = fs.rmSync(filePath, {
      force: true,
    });
    return res.status(200).json({ msg: "Deletion Success" });
  } catch (error) {
    next(error);
  }
}

module.exports = { appendToJsonFile, getAllLogsFile, readLogFile, removeLogFile };
