const checkIfUserExistsRegister = 'SELECT * FROM users WHERE username = $1 OR email = $2';
const checkIfUserExistsLogin = 'SELECT * FROM users WHERE username = $1 AND email = $2';
const registerUser = 'INSERT INTO users (username, email, password_hash, salt) VALUES ($1, $2, $3, $4) RETURNING user_id'
const findUserById = 'SELECT * FROM users WHERE user_id = $1';

module.exports = {checkIfUserExistsRegister,checkIfUserExistsLogin,registerUser,findUserById,};