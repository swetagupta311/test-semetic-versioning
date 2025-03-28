const multer = require('multer');

const storage = multer.memoryStorage();
const upload = multer({ storage });

// const upload = multer({
//     storage: storage,
//     limits: { fileSize: 10 * 1024 * 1024 }, // 10MB file size limit
//     fileFilter: (req, file, cb) => {
//         if (file.size > 10 * 1024 * 1024) {
//             return cb(new Error('File size exceeds 10MB'), false);
//         }
//         cb(null, true);
//     }
// });

module.exports = { upload };