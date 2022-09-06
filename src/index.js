'use strict';

/**
 * Imports
 */
import 'dotenv/config';
import express from 'express';
import bodyParser from 'body-parser';
import stability from 'stability-ts';

/**
 * Clients
 */
const app = express();
app.use(bodyParser.json());
const PORT = process.env.PORT || 8080;

const { generate } = stability;

app.post('/sms', async (req, res) => {
    try {
        const {body} = req;
        console.log(body);
        const response = await generateStableDiffusionImage('Shiba Inu wearing a top hat');
        const filePath = response.filePath.replace('/home/node/app/', '');
        const fullURL = `${process.env.BASE_URL}/${filePath}`;
        console.log(fullURL);
        res.send(fullURL);
    } catch (e) {
        res.send(e);
    }
});

const generateBannerBearImage = async ({imageURL, title}) => {

}

const generateStableDiffusionImage = async (prompt) => {
    return new Promise((resolve, reject) => {
        const stabilityClient = generate({
            prompt,
            apiKey: process.env.DREAMSTUDIO_API_KEY,
            width: 960,
            height: 960,
            samples: 1,
            outDir: 'public'
        });

        stabilityClient.on('image', ({buffer, filePath}) => {
            resolve({buffer, filePath})
        });
    
        stabilityClient.on('end', (response) => {
            if(!response.isOk) {
                reject(response);
            }
        });        
    });
}

app.use('/public', express.static('public'));
app.listen(PORT, () => console.log(`Listening on ${PORT}.\nNode Environment is on ${process.env.NODE_ENV} mode.`));