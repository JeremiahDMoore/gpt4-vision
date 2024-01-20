const OpenAI = require('openai');
const dotenv = require('dotenv');
const express = require('express');
const bodyParser = require('body-parser');
const axios = require('axios');

const app = express();
app.use(bodyParser.json({ limit: '50mb' }));

// PHOTO: prompt for extracting data from photo
// TODO: lean the prompt to cut API costs
const foodPrompt = "PERSONA=(You are an expert chef, foodie and nutritionist. You are able to generate gourmet recipes for all types of cuisine. You understand the nutritional value of all foods and drinks. Your tone is jovial, very humorous and funny. Your purpose is to create delicious recipes for all humans to enjoy, using expert skill and resources from recipe books, blogs, etc.) ; FOOD_DETAIL=(any cuisine, dish, meal, cocktail, beverage, food items, drink items, meals, food ingredients, food packages and labels, drink packages and labels; anything pertaining to food or food culture.) ; INSTRUCTIONS: Adhere to your PERSONA at all times. Examine the photo and determine if it contains a FOOD_DETAIL ; IF: FOOD_DETAIL = false, return ( a short description of the photo or name of object, Sorry but I can't make a good recipe from this);  ELSE IF: FOOD_DETAIL = true, return ({ a short description of the FOOD_DETAIL, Nutritional Value: the caloric and nutritional content of this FOOD_DETAIL; Recipe: a recipe with ingredient list to recreate this FOOD_DETAIL }) Make your responses as concise and consistent as possible"

// IMAGE: prompt for generating an image for the RECIPE
function generateImage(dishName, diet, otherConsiderations) {
  return `A lifelike food photo of edible and delicious ${dishName}, ${diet}, ${otherConsiderations}, plated fancy on a chef table, blurred background of ingredients, realistic indoor lighting`
}
// RECIPE: prompt takes user data from profile or other source and generates the recipe
function generatePrompt(dishName, diet, otherConsiderations) {
  return `generate a recipe based on ${dishName} and ${otherConsiderations} that is ${diet}, it is very important to be concise and consistent. Return (Recipe Name \n Nutritional Value \n Ingredients \n Instructions)`
}
// PHOTO: Generates recipe from photo
app.post('/process-image', async (req, res) => {
  try {
    const base64Image = req.body.image;
    const response = await askAboutImages(base64Image, foodPrompt); // uses askAboutImages function
    res.json({ message: 'Image processed', data: response });
  } catch (error) {
    res.status(500).send({ error: error.message });
  }
});
// RECIPE: Generates recipe from text
app.post('/generate-recipe', async (req, res) => {
  try {
    const { dishName, diet, otherConsiderations } = req.body;

    const recipe = await axios.post('https://api.openai.com/v1/chat/completions', {
      model: "gpt-3.5-turbo",
      temperature: 0,
      top_p: 1,
      messages: [
        { role: "system", content: generatePrompt(dishName, diet, otherConsiderations) } // uses generatePrompt to create recipe
      ]
    }, {
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json'
      }
    });

    if (recipe.data && recipe.data.choices && recipe.data.choices.length > 0) {
      const recipeText = recipe.data.choices[0].message.content;
      res.json({ success: true, recipe: recipeText });
    } else {
      res.status(500).json({ success: false, message: 'Failed to generate recipe' });
    }
  } catch (error) {
    res.status(500).send({ error: error.message });
  }
});

// IMAGE: generates an image of the recipe
app.post('/generate-image', async (req, res) => {
    try {
        const { dishName, diet, otherConsiderations } = req.body;
        const prompt = generateImage(dishName, diet, otherConsiderations);

        // Generate image using DALL-E
        const response = await axios.post('https://api.openai.com/v1/images/generations', {
            model: "dall-e-3",
            prompt: prompt,
            n: 1,
            size: "1024x1024"
        }, {
            headers: {
                'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
                'Content-Type': 'application/json'
            }
        });

        // Fetch the generated image
        const imageUrl = response.data.data[0].url;
        const imageResponse = await axios.get(imageUrl, { responseType: 'arraybuffer' });
        const imageBuffer = Buffer.from(imageResponse.data, 'binary');

        // Resize the image to 400x400 using Jimp
        const resizedImage = await Jimp.read(imageBuffer)
            .then(image => image.resize(400, 400))
            .then(image => image.getBufferAsync(Jimp.MIME_PNG));

        // Send the resized image directly to the client
        res.set('Content-Type', 'image/png');
        res.send(resizedImage);

    } catch (error) {
        console.error('Error generating image:', error);
        res.status(500).send({ error: error.message });
    }
});

dotenv.config();

// PHOTO: Asks LLM about the image using the prompt string
async function askAboutImages(base64Image, prompt) {
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const imageContent = {
    type: 'image_url',
    image_url: `data:image/png;base64,${base64Image}`,
  };

  const response = await openai.chat.completions.create({
    model: 'gpt-4-vision-preview',
    messages: [
      { role: 'system', content: prompt },
      {
        role: 'user',
        content: [
          imageContent,
        ],
      },
    ],
    max_tokens: 1000,
  });

  console.log('RESPONSE HERE', response.choices[0].message.content);
  return response.choices[0].message.content;
}
