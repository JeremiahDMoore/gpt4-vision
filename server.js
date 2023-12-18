const OpenAI = require('openai');
const dotenv = require('dotenv');
const express = require('express');
const bodyParser = require('body-parser');

const app = express();
app.use(bodyParser.json({ limit: '50mb' }));

app.post('/process-image', async (req, res) => {
  try {
    const base64Image = req.body.image;
    const response = await askAboutImages(base64Image, 'What is in this image?');
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
