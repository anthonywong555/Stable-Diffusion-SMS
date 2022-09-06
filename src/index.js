'use strict';

/**
 * Imports
 */
import 'dotenv/config';
import express from 'express';
import bodyParser from 'body-parser';
import stability from 'stability-ts';
import { Bannerbear } from 'bannerbear';

/**
 * Clients
 */
const bbClient = new Bannerbear(process.env.BANNER_BEAR_API_KEY);

/**
 * Application
 */
const app = express();
app.use(bodyParser.json());
const PORT = process.env.PORT || 8080;

const { generate } = stability;

app.post('/sms', async (req, res) => {
    try {
        const {body} = req;
        const {text} = body;
        const generatedImages = await generateStableDiffusionImages(text);
        const generatedImagesLocalURLs = generatedImages.map((aGeneratedImage) => aGeneratedImage.filePath);
        
        console.log(`generatedImagesLocalURLs: ${generatedImagesLocalURLs}`);

        // Generate BannerBear Promies
        const bannerBearPromies = generatedImagesLocalURLs.map(async(localURLs) => {
            const filePath = localURLs.replace('/home/node/app/', '');
            const fullURL = `${process.env.BASE_URL}/${filePath}`;
            return await generateBannerBearImage({fullURL, text});
        });

        const bannerBearImages = await Promise.all(bannerBearPromies);
        const bannerBearImageURLs = bannerBearImages.map((aBBImage) => aBBImage.image_url_png);
        const bannerBearImageUIDs = bannerBearImages.map((aBBImage) => aBBImage.uid);

        console.log(`bannerBearImageUIDs: ${bannerBearImageUIDs}`);

        res.send(bannerBearImages);
    } catch (e) {
        res.send(e);
    }
});

const generateBannerBearImage = async ({fullURL, text}) => {
    return await bbClient.create_image(process.env.BANNER_BEAR_IMAGE_TEMPLATE_ID, {
        modifications: [
            {
                name: "image",
                image_url: fullURL
            },
            {
                text,
                name: "title",
            }
        ]
    }, true);
}

const generateStableDiffusionImages = async (prompt) => {
    return new Promise((resolve, reject) => {
        const stabilityClient = generate({
            prompt,
            apiKey: process.env.DREAMSTUDIO_API_KEY,
            width: process.env.BANNER_BEAR_IMAGE_TEMPLATE_IMAGE_WIDTH,
            height: process.env.BANNER_BEAR_IMAGE_TEMPLATE_IMAGE_HEIGHT,
            samples: process.env.STABLE_DIFFUSION_SAMPLES,
            outDir: 'public'
        });

        const results = [];

        stabilityClient.on('image', ({buffer, filePath}) => {
            results.push({buffer, filePath});

            if(results.length == process.env.STABLE_DIFFUSION_SAMPLES) {
                resolve(results);
            }
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