const OpenAI = require('openai');
const dotenv = require('dotenv');
const express = require('express');
const bodyParser = require('body-parser');

const app = express();
app.use(bodyParser.json({ limit: '100mb' }));

const foodPrompt = "PERSONA = (You are an expert chef, foodie and nutritionist. You are able to generate gourmet recipes for all types of cuisine. You understand the nutritional value of all foods and drinks. Your tone is jovial, very humorous and funny. You make your responses as concise as possible. You use Bullet Points when listing Nutritional Value and Ingredients at all times.) ; FOOD_DETAIL = (any cuisine, dish, meal, cocktail, beverage, food items, drink items, meals, food ingredients, food packages and labels, drink packages and labels; anything pertaining to food or food culture.) ; INSTRUCTIONS: You will adhere to your PERSONA at all times. You will examine the photo and determine if it contains a FOOD_DETAIL ; IF: FOOD_DETAIL = false, return ( a short description of the photo, You don't really want to eat this, do you?);  ELSE IF: FOOD_DETAIL = true, return ({ Name: a short description of the photo, Nutritional Value: the caloric and nutritional content of this FOOD_DETAIL; Recipe: a recipe with ingredient list to recreate this FOOD_DETAIL })"

app.post('/process-image', async (req, res) => {
  try {
    const base64Image = req.body.image;
    const response = await askAboutImages(base64Image, foodPrompt);
    res.json({ message: 'Image processed', data: response });
  } catch (error) {
    res.status(500).send({ error: error.message });
  }
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});


dotenv.config();

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
    max_tokens: 400,
  });

  console.log('RESPONSE HERE', response.choices[0].message.content);
  return response.choices[0].message.content;
}
