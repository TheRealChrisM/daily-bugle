//ad microservice
const express = require('express');
const app = express();

let port = 3012;

app.use(express.json());





app.listen(port, ()=> console.log(`listening on port ${port}`));