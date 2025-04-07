const { GoogleGenerativeAI } = require('@google/generative-ai');
const fs = require('fs');
const path = require('path');
const config = require('../config/config');

const genAI = new GoogleGenerativeAI(config.geminiApiKey);

const compareImages = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No image uploaded' });
    }

    // Use the newer model (gemini-1.5-flash or gemini-1.5-pro)
    const model = genAI.getGenerativeModel({ 
      model: "gemini-1.5-flash", // or "gemini-1.5-pro"
    });
    
    // Read both images
    const referenceImage = fs.readFileSync(config.REFERENCE_IMAGE_PATH);
    const uploadedImage = fs.readFileSync(req.file.path);

    // Convert to base64
    const referenceImageBase64 = referenceImage.toString('base64');
    const uploadedImageBase64 = uploadedImage.toString('base64');

    const prompt = `
      Compare these two images and provide a similarity score out of 10. 
      Consider factors like composition, subject matter, colors, and overall visual similarity.
      The score should be a single number between 0 and 10, where 0 is completely different 
      and 10 is identical. Only respond with the number, no additional text or explanation.
    `;

    const result = await model.generateContent([
      prompt,
      {
        inlineData: {
          data: referenceImageBase64,
          mimeType: 'image/jpeg'
        }
      },
      {
        inlineData: {
          data: uploadedImageBase64,
          mimeType: 'image/jpeg'
        }
      }
    ]);

    const response = await result.response;
    const text = response.text().trim();
    const score = parseFloat(text);

    // Clean up the uploaded file
    fs.unlinkSync(req.file.path);

    res.json({ score: isNaN(score) ? 0 : score });
  } catch (error) {
    console.error('Error comparing images:', error);
    res.status(500).json({ 
      error: 'Failed to compare images',
      details: error.message,
      modelError: error.errorDetails
    });
  }
};

module.exports = {
  compareImages
};