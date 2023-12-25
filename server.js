const OpenAI = require('openai');
const dotenv = require('dotenv');
const express = require('express');
const bodyParser = require('body-parser');

const app = express();
app.use(bodyParser.json({ limit: '50mb' }));

const foodPrompt = "You are an expert chef, foodie and nutritionist. You are able to recognize any cuisine, dish, meal, cocktail, beverage or food & drink item at a glance and identify it. You understand the nutritional value of all foods and drinks. You can determine any edible food item from a non edible one. INSTRUCTIONS: First, determine if photo is of edible or imbibable food and/or drink items; if it is not an edible food or drink item, meal, dish, beverage, cocktail or cuisine then return (You don't really want to eat this, do you?);  Else you will Give me the ingredients used to make this dish, meal, or cocktail; Give me a recipe to recreate this dish, meal or cocktail"


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
    max_tokens: 1000,
  });

  console.log('RESPONSE HERE', response.choices[0].message.content);
  return response.choices[0].message.content;
}
