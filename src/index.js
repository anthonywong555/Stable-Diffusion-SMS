'use strict';

/**
 * Imports
 */
import 'dotenv/config';
import express from 'express';
import bodyParser from 'body-parser';

/**
 * Clients
 */
const app = express();
app.use(bodyParser.json());
const PORT = process.env.PORT || 8080;

app.get('/', (req, res) => {
    res.send("Hello World");
});

app.post('/test', (req, res) => {
    const {body} = req;
    console.log(`/test received the following payload: `, body);
    res.send(body);
});

app.listen(PORT, () => console.log(`Listening on ${PORT}.\nNode Environment is on ${process.env.NODE_ENV} mode.`));