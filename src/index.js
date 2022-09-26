'use strict';

/**
 * Imports
 */
import 'dotenv/config';
import express from 'express';
import bodyParser from 'body-parser';
import stability from 'stability-client';
import { Bannerbear } from 'bannerbear';
import twilio from 'twilio';

/**
 * Clients
 */
const twilioClient = twilio( 
  process.env.TWILIO_API_KEY, 
  process.env.TWILIO_API_KEY_SECRET, 
  { accountSid: process.env.TWILIO_ACCOUNT_SID }
);

const bbClient = new Bannerbear(process.env.BANNER_BEAR_API_KEY);

const { generateAsync } = stability;

/**
 * Application
 */
const app = express();
app.use(bodyParser.urlencoded({ extended: true }));
const PORT = process.env.PORT || 8080;

app.post('/sms', async (req, res) => {
  const {headers, body} = req;
  try {
    const twilioSignature = headers['x-twilio-signature'];
    const url = `${process.env.PRODUCTION_BASE_URL}/sms`;
    const requestIsValid = twilio.validateRequest(
      process.env.TWILIO_AUTH_TOKEN,
      twilioSignature,
      url,
      body
    );
      
    if (process.env.NODE_ENV === 'production') {
      if(!requestIsValid) {
        return res.status(403).send('Forbidden');
      }
    }

    if(body.Body.length) {
      res.send('<Response><Message>Processing...</Message></Response>');
      await driver(body);
    } else {
      res.send('<Response><Message>Please send a detailed description of what you want to see.</Message></Response>');
    }
  } catch (e) {
    console.error(`An error has occurred: \n${e}`);
    const twilioRequest = body;
    const {To, From} = twilioRequest;

    try {
      return await twilioClient.messages.create({
        body: 'Sorry, it looks like an error has occured. Please try again later.',
        to: From,
        from: To
      });
    } catch(e) {
      console.error(`An error has occurred when sending out the sms: \n${e}`);
    }
  }
});

const driver = async (twilioRequest) => {
  try {
    const {To, From, Body} = twilioRequest;
    const generatedImages = await generateStableDiffusionImages(Body);
    const generatedImagesLocalURLs = generatedImages.map((aGeneratedImage) => aGeneratedImage.filePath);
    
    console.log(`generatedImagesLocalURLs: ${generatedImagesLocalURLs}`);

    // Generate BannerBear Promies
    const bannerBearPromies = generatedImagesLocalURLs.map(async(localURLs) => {
      const filePath = localURLs.replace('/home/node/app/', '');
      const fullURL = `${process.env.PRODUCTION_BASE_URL}/${filePath}`;
      return await generateBannerBearImage(fullURL, Body, process.env.BANNER_BEAR_IMAGE_TEMPLATE_ID);
    });

    const bannerBearImages = await Promise.all(bannerBearPromies);
    const bannerBearImageURLs = bannerBearImages.map((aBBImage) => aBBImage.image_url_png);
    const bannerBearImageUIDs = bannerBearImages.map((aBBImage) => aBBImage.uid);

    console.log(`bannerBearImageUIDs: ${bannerBearImageUIDs}`);

    // Generate Twilio SMS Promies
    const TwilioPromies = bannerBearImageURLs.map(async (mediaUrl) => {
      return await twilioClient.messages.create({
        mediaUrl,
        to: From,
        from: To
      });
    });

    const twilioSMSResponses = await Promise.all(TwilioPromies);
    const twilioSMSSIDs = twilioSMSResponses.map((aSMSResponse) => aSMSResponse.sid);
      
    console.log(`twilioSMSSIDs: ${twilioSMSSIDs}`);
  } catch (e) {
    throw e;
  }
}

const generateBannerBearImage = async (image_url, text, templateId) => {
  return await bbClient.create_image(templateId, {
    modifications: [
      {
        image_url,
        name: "image",
      },
      {
        text,
        name: "title",
      }
    ]
  }, true);
}

const generateStableDiffusionImages = async (prompt) => {
  try {
    const samples = process.env.STABLE_DIFFUSION_SAMPLES ? parseInt(process.env.STABLE_DIFFUSION_SAMPLES) : 1;

    const results = await generateAsync({
      prompt,
      samples,
      apiKey: process.env.DREAMSTUDIO_API_KEY,
      width: process.env.BANNER_BEAR_IMAGE_TEMPLATE_IMAGE_WIDTH,
      height: process.env.BANNER_BEAR_IMAGE_TEMPLATE_IMAGE_HEIGHT,
      outDir: 'public'
    });
    
    return results.images; 
  } catch (e) {
    throw e;
  }
}

app.use('/public', express.static('public'));
app.listen(PORT, () => console.log(`Listening on ${PORT}.\nNode Environment is on ${process.env.NODE_ENV} mode.`));