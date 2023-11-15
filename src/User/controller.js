const pool = require('../../db');
const bcrypt = require('bcrypt');
const queries = require('./queries');
const jwt = require('jsonwebtoken');
const AWS = require('aws-sdk');
const multer = require('multer');
const s3 = new AWS.S3();

AWS.config.update({
  accessKeyId: '',
  secretAccessKey: '',
  region: '',
});
//not putting here due to security reasons

const registerUser = async (req, res) => {
    const { username, email, password } = req.body;
    const userAlreadyExists = await pool.query(queries.checkIfUserExistsRegister, [username, email]);
    if(userAlreadyExists.rows.length > 0) {
        return res.status(409).json({ message: 'User already exists' });
    }

    const saltRounds = 10;
    const salt = await bcrypt.genSaltSync(saltRounds);
    const hashedPassword = bcrypt.hashSync(password, salt);
    
    // Insert user into the database
    await pool.query(queries.registerUser, [username, email, hashedPassword, salt], (error, results) => {
        if (error) {
            throw error;
        }
        const userId = results.rows[0].user_id;
        res.status(201).json({ userId, message: 'User registered successfully' });
    })
    
  };

const loginUser = async (req, res) => {
    const { username,email,password } = req.body;
    const user = await pool.query(queries.checkIfUserExistsLogin, [username, email]);
    if(user.rows.length === 0) {
        return res.status(401).json({ message: 'Invalid username or emailid' });
    }

    const hashedPassword = user.rows[0].password_hash;
    const salt = user.rows[0].salt;
    const validPassword = bcrypt.compareSync(password, hashedPassword);
    if(!validPassword) {
        return res.status(401).json({ message: 'Invalid password' });
    }
    
    const token = jwt.sign({ _id: user.rows[0].user_id }, process.env.JWT_SECRET, { expiresIn: '31 days' });
    res.send({ token, username: user.rows[0].username, email: user.rows[0].email });
  
}

const createFolder = async (req, res) => {
    console.log("entered create folder")
    const { folderName } = req.body;
    const userId = req.user.user_id; // Assuming you have a middleware to extract user information from the request
  
    // Check if the folder name is provided
    if (!folderName) {
      return res.status(400).json({ message: 'Folder name is required' });
    }
  
    // Check if the folder name is unique for the user
    const isFolderNameUnique = await checkFolderNameUnique(userId, folderName);
  
    if (!isFolderNameUnique) {
      return res.status(409).json({ message: 'Folder name must be unique for the user' });
    }
  
    // Insert folder into the database
    try {
      const result = await pool.query(
        'INSERT INTO folders (user_id, folder_name) VALUES ($1, $2) RETURNING folder_id',
        [userId, folderName]
      );
      const folderId = result.rows[0].folder_id;
      res.status(201).json({ folderId, message: 'Folder created successfully' });
    } catch (error) {
      console.error('Error creating folder:', error);
      res.status(500).json({ message: 'Internal Server Error' });
    }
  };
  
  const checkFolderNameUnique = async (userId, folderName) => {
    const result = await pool.query('SELECT * FROM folders WHERE user_id = $1 AND folder_name = $2', [userId, folderName]);
    return result.rows.length === 0;
  };
  

const createSubFolder = async (req, res) => {
  // To check for the user permission -> The middleware will check if the user is logged in
  // if the user is logged in then we will have his id
  // from this id we will check if the parent folder belongs to the user
  console.log("entered create folder")
  const { parentFolderName, subFolderName } = req.body;
  const userId = req.user.user_id;

  if (!subFolderName || !parentFolderName) {
    return res.status(400).json({ message: 'Folder name is required' });
  }

  // Check if the folder name is unique for the user
  const isSubFolderNameUnique = await checkSubFolderNameUnique(userId, parentFolderName,subFolderName);

  if (!isSubFolderNameUnique) {
    return res.status(409).json({ message: 'Sub Folder name must be unique for the user' });
  }

  const isParentFolderExists = await checkUserPermission(userId, parentFolderName);

  if (!isParentFolderExists) {
    return res.status(409).json({ message: 'The parent folder does not belong to the user' });
  }

  // Insert sub - folder into the database

  try {
    const result = await pool.query(
      'INSERT INTO subfolders (user_id, parent_folder_name, sub_folder_name) VALUES ($1, $2, $3) RETURNING sub_folder_id',
      [userId, parentFolderName, subFolderName]
    );
    const subFolderId = result.rows[0].sub_folder_id;
    res.status(201).json({ subFolderId, message: 'Sub Folder created successfully' });
  } catch (error) {
    console.error('Error creating sub folder:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }

};

const checkSubFolderNameUnique = async (userId, parentFolderName, subFolderName) => {
  const result = await pool.query(
    'SELECT * FROM subfolders WHERE user_id = $1 AND parent_folder_name = $2 AND sub_folder_name = $3',
    [userId, parentFolderName, subFolderName]
  );
  return result.rows.length === 0;
};


  
const createFile = async  (req, res) => {
  const userId = req.user.user_id;
  const parentFolderId = req.body.parentFolderId; // Assuming you pass the parent folder ID in the request body

  try {
    // Check if the user has permission to upload files to the given folder
    const hasPermission = await checkUserPermission(userId, parentFolderId);

    if (!hasPermission) {
      return res.status(403).json({ message: 'You do not have permission to upload files to this folder.' });
    }

    const file = req.file;
    const fileName = file.originalname;
    const fileSize = file.size;

    // Upload the file to AWS S3
    const uploadParams = {
      Bucket: 'sample-bucket',
      Key: `${parentFolderId}/${fileName}`, 
      Body: file.buffer,
      ContentType: file.mimetype,
      ACL: 'secret', 
    };

    const s3UploadResult = await s3.upload(uploadParams).promise();

    // Record file metadata in PostgreSQL
    const insertQuery = 'INSERT INTO files (user_id, parent_folder_id, file_name, file_size, s3_object_key) VALUES ($1, $2, $3, $4, $5) RETURNING *';
    const result = await pool.query(insertQuery, [userId, parentFolderId, fileName, fileSize, s3UploadResult.Key]);

    const uploadedFile = result.rows[0];
    res.status(201).json({ uploadedFile, message: 'File uploaded successfully.' });
  } catch (error) {
    console.error('Error uploading file:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
}

const checkUserPermission = async (userId, parentFolderName) => {
  const result = await pool.query('SELECT * FROM folders WHERE user_id = $1 AND folder_name = $2', [userId, parentFolderName]);
  return result.rows.length === 1;
};




const renameFile = async(req, res) => {
  const userId = req.user.user_id;
  const fileId = req.params.fileId; // Assuming you pass the file ID in the URL
  const { newFileName } = req.body;

  try {
    const file = await getFileDetails(fileId);

    if (!file) {
      return res.status(404).json({ message: 'File not found.' });
    }

    const hasPermission = await checkUserPermission(userId, file.parent_folder_id);

    if (!hasPermission) {
      return res.status(403).json({ message: 'You do not have permission to rename this file.' });
    }

    const s3ObjectKey = `${file.parent_folder_id}/${file.file_name}`;
    const newS3ObjectKey = `${file.parent_folder_id}/${newFileName}`;

    await s3.copyObject({ Bucket: '', CopySource: `your_s3_bucket_name/${s3ObjectKey}`, Key: newS3ObjectKey }).promise();
    await s3.deleteObject({ Bucket: 'your_s3_bucket_name', Key: s3ObjectKey }).promise();

    const updateQuery = 'UPDATE files SET file_name = $1, s3_object_key = $2 WHERE file_id = $3 RETURNING *';
    const result = await pool.query(updateQuery, [newFileName, newS3ObjectKey, fileId]);

    const renamedFile = result.rows[0];
    res.status(200).json({ renamedFile, message: 'File renamed successfully.' });
  } catch (error) {
    console.error('Error renaming file:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
}

const moveFile = async(req, res) => {
  const userId = req.user.user_id;
  const fileId = req.params.fileId;
  const { newParentFolderId } = req.body;

  try {
    const file = await getFileDetails(fileId);

    if (!file) {
      return res.status(404).json({ message: 'File not found.' });
    }

    const hasPermission = await checkUserPermission(userId, newParentFolderId);

    if (!hasPermission) {
      return res.status  (403).json({ message: 'You do not have permission to move this file.' });
    }

    const s3ObjectKey = `${file.parent_folder_id}/${file.file_name}`;
    const newS3ObjectKey = `${newParentFolderId}/${file.file_name}`;

    await s3.copyObject({ Bucket: 'your_s3_bucket_name', CopySource: `your_s3_bucket_name/${s3ObjectKey}`, Key: newS3ObjectKey }).promise();
    await s3.deleteObject({ Bucket: 'your_s3_bucket_name', Key: s3ObjectKey }).promise();

    const updateQuery = 'UPDATE files SET parent_folder_id = $1, s3_object_key = $2 WHERE file_id = $3 RETURNING *';
    const result = await pool.query(updateQuery, [newParentFolderId, newS3ObjectKey, fileId]);

    const movedFile = result.rows[0];
    res.status(200).json({ movedFile, message: 'File moved successfully.' });
  } catch (error) {
    console.error('Error moving file:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
}

const removeFile = async (req, res) => {
  const userId = req.user.user_id;
  const fileId = req.params.fileId;

  try {
    const file = await getFileDetails(fileId);

    if (!file) {
      return res.status(404).json({ message: 'File not found.' });
    }

    const hasPermission = await checkUserPermission(userId, file.parent_folder_id);

    if (!hasPermission) {
      return res.status(403).json({ message: 'You do not have permission to delete this file.' });
    }

    const s3ObjectKey = `${file.parent_folder_id}/${file.file_name}`;

    await s3.deleteObject({ Bucket: 'your_s3_bucket_name', Key: s3ObjectKey }).promise();

    const deleteQuery = 'DELETE FROM files WHERE file_id = $1 RETURNING *';
    const result = await pool.query(deleteQuery, [fileId]);

    const deletedFile = result.rows[0];
    res.status(200).json({ deletedFile, message: 'File deleted successfully.' });
  } catch (error) {
    console.error('Error deleting file:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
}

async function getFileDetails(fileId) {
  const query = 'SELECT * FROM files WHERE file_id = $1';
  const result = await pool.query(query, [fileId]);

  return result.rows[0];
}



module.exports = {registerUser,loginUser,createFolder,createSubFolder,createFile,renameFile,moveFile,removeFile};

