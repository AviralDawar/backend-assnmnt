# backend-assnmnt
File Manager System
# Overview
The File Manager System is a web application that provides users with a secure and efficient way to manage their files and folders. The system is built using Node.js as the server-side runtime environment, PostgreSQL as the database for storing user information and file metadata, and AWS S3 for secure storage of uploaded files.

# Features
User Authentication: Allows users to register and log in securely.
File Upload: Provides an API endpoint for users to upload files to an AWS S3 bucket, recording metadata in PostgreSQL.
File Management: Enables users to rename, move, and delete files within the file manager system.
Folder Creation: Allows users to create new folders, each associated with a unique name and the user who created it.
Subfolder Creation: Enables users to create subfolders inside existing folders, with proper permission checks.
Secure Access: Implements authentication middleware to ensure secure access to API endpoints.
Technologies Used
Node.js: Server-side runtime environment.
Express: Web application framework for Node.js.
PostgreSQL: Database for storing user information and file metadata.
AWS S3: Secure storage for uploaded files.
JWT (JSON Web Tokens): Used for secure user authentication.
Getting Started
Clone the repository.
Install dependencies using npm install.
Set up PostgreSQL and create the necessary database tables.
Configure AWS S3 and update your AWS credentials in the project.
Set up environment variables for sensitive information.
Run the application using npm start.
API Endpoints
User Authentication:

POST /register: Register a new user.
POST /login: Log in and obtain an authentication token.
File Management:

POST /create-file: Upload a file to the system.
PUT /rename-file: Rename a file.
PUT /move-file: Move a file to a different folder.
DELETE /remove-file: Delete a file.
Folder Management:

POST /create-folder: Create a new folder.
POST /create-subfolder: Create a subfolder inside an existing folder.


#TABLE SCHEMAS->
CREATE TABLE users (
  user_id SERIAL PRIMARY KEY,
  username VARCHAR(50) UNIQUE NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  salt VARCHAR(50) NOT NULL
);
CREATE TABLE folders (
  folder_id SERIAL PRIMARY KEY,
  user_id INT REFERENCES users(user_id) ON DELETE CASCADE,
  folder_name VARCHAR(255) NOT NULL
);
CREATE TABLE files (
  file_id SERIAL PRIMARY KEY,
  user_id INT REFERENCES users(user_id) ON DELETE CASCADE,
  parent_folder_id INT REFERENCES folders(folder_id) ON DELETE CASCADE,
  file_name VARCHAR(255) NOT NULL,
  file_size INT NOT NULL,
  s3_object_key VARCHAR(255) NOT NULL,
  upload_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE subfolders (
  subfolder_id SERIAL PRIMARY KEY,
  user_id INT REFERENCES users(user_id) ON DELETE CASCADE,
  parent_folder_id INT REFERENCES folders(folder_id) ON DELETE CASCADE,
  subfolder_name VARCHAR(255) NOT NULL
);

