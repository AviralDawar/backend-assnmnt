const express = require('express');
const router = express.Router();
const controller = require('./controller');
const authMiddleware = require('./middleware');
const multer = require('multer');
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// Sample route
router.get('/', (req, res) => {
    res.send('using api routes');
});

router.post('/register', controller.registerUser);
router.post('/login', controller.loginUser);
router.post('/create-folder', authMiddleware, controller.createFolder);
router.post('/create-sub-folder', authMiddleware, controller.createSubFolder);
//i have created a functionality to create a file inside the folders as mentioned in the assignment.
router.post('/create-file',upload.single('file') ,authMiddleware, controller.createFile);
router.post('/remove-file', authMiddleware, controller.removeFile);
router.post('/rename-file', authMiddleware, controller.renameFile);
router.post('/move-file', authMiddleware, controller.moveFile);


module.exports = router;
