const { S3Client, PutObjectCommand, DeleteObjectCommand, HeadObjectCommand, ListObjectsV2Command, GetObjectCommand } = require('@aws-sdk/client-s3');
const { Upload } = require('@aws-sdk/lib-storage');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const { v4: uuidv4 } = require('uuid');
const path = require('path');
require('dotenv').config();

const s3 = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

const uploadToS3 = async (file, folderPath, modifiedName = "") => {
  const fileContent = Buffer.from(file.buffer, 'binary');
  const fileName = modifiedName ? modifiedName : `${uuidv4()}${path.extname(file.originalname)}`;

  let params = {
    Bucket: process.env.AWS_S3_BUCKET_NAME,
    Key: `${folderPath}/${fileName}`, 
    Body: fileContent,
    ContentType: file.mimetype,
    // ACL: 'public-read', // Note: ACLs are now managed with bucket policies
  };

  if (modifiedName) {
    params = Object.assign(params, {
      ACL: "private"
    })
  }

  const parallelUploads3 = new Upload({
    client: s3,
    params,
  });
  let filePath = folderPath+"/"+fileName
  const data = await parallelUploads3.done();
  return modifiedName ? filePath : data.Location;
};

const deleteFileFromS3 = async (filePath) => {
  try {
    const deleteParams = {
      Bucket: process.env.AWS_S3_BUCKET_NAME, // Your S3 bucket name
      Key: filePath       // File name (object key) to delete
    };

    const command = new DeleteObjectCommand(deleteParams);
    await s3.send(command);

    console.log(`File "${filePath}" deleted successfully from "${process.env.AWS_S3_BUCKET_NAME}"`);
  } catch (error) {
    console.error("Error deleting file from S3:", error);
  }
};

const checkFileExists = async (filePath) => {
  try {
    const command = new HeadObjectCommand({
      Bucket: process.env.AWS_S3_BUCKET_NAME,
      Key: filePath
    });

    await s3.send(command);
    return true;
  } catch (error) {
    if (error.name === "NotFound") {
      console.log(`File "${filePath}" does not exist in "${process.env.AWS_S3_BUCKET_NAME}"`);
      return false;
    }
    console.error("Error checking file existence:", error);
    return false;
  }
};

// Function to List All Files in a Folder
const listFilesInFolder = async (folderPath) => {
  try {
    const command = new ListObjectsV2Command({
      Bucket: process.env.AWS_S3_BUCKET_NAME,
      Prefix: folderPath // The folder path (e.g., "apk/")
    });

    const response = await s3.send(command);

    if (!response.Contents || response.Contents.length === 0) {
      console.log(`No files found in "${folderPath}"`);
      return [];
    }

    const files = response.Contents.map(file => file.Key);
    return files;
  } catch (error) {
    console.error("Error listing files:", error);
    return [];
  }
};

const getPreSignedUrl = async (filePath) => {
  try {
    const command = new GetObjectCommand({
      Bucket: process.env.AWS_S3_BUCKET_NAME,
      Key: filePath
    });

    const signedUrl = await getSignedUrl(s3, command, { expiresIn: 600 }); // URL valid for 1 minute
    return signedUrl;
  } catch (error) {
    console.error("Error generating pre-signed URL:", error);
    throw error;
  }
};

module.exports = {
  uploadToS3,
  deleteFileFromS3,
  checkFileExists,
  listFilesInFolder,
  getPreSignedUrl
};