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

    // Improved prompt for more consistent scoring
    const prompt = `
      You are an expert image comparison system designed to provide consistent similarity scores.
      
      Your task is to compare two images and assign a similarity score from 0 to 10, where:
      - 10: Identical or nearly identical images (>95% similarity)
      - 8-9: Very high similarity with only minor differences
      - 6-7: Strong similarity with noticeable differences
      - 4-5: Moderate similarity with significant differences
      - 2-3: Low similarity with major differences
      - 0-1: Very different images with little to no similarity
      
      Follow this structured assessment approach:
      1. Analyze structural similarity (50% of score):
         - Object/subject positioning and alignment
         - Proportions and scale
         - Shape contours and boundaries
         - Spatial arrangement of elements
      
      2. Analyze color similarity (25% of score):
         - Overall color palette
         - Color distribution
         - Brightness, contrast, and saturation
         - Color gradients and transitions
      
      3. Analyze detail similarity (25% of score):
         - Texture patterns
         - Fine details and small elements
         - Sharpness and clarity
         - Edge definition
      
      If the images are exactly the same or appear to be the same image, score 10.
      If the images are completely different with no shared elements, score 0.
      
      Return ONLY a decimal number between 0 and 10, with one decimal place precision (e.g., 7.8).
      Do not include any text, explanation, or analysis in your response.
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