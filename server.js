const express = require('express');
const app = express();
const port = process.env.PORT || 3000;
const userRoutes = require('./src/User/routes');
require('dotenv').config();


app.get('/', (req, res) => {
    res.send('Hello World!');
});

app.use(express.json());

app.use('/api/v1/user', userRoutes);

app.listen(port, () => {
    console.log(`Server listening on port ${port}`);
});
