const TableEntry = require('../models/TableEntry');
const fetch = require('node-fetch');
const config = require('../config/config');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const fs = require('fs');
const path = require('path');
// Create a new table entry
// In tableController.js - modify the createEntry function
const genAI = new GoogleGenerativeAI(config.geminiApiKey);


exports.createEntry = async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: 'No image uploaded' });
      }
  
      const { serialNumber } = req.body;
      if (!serialNumber) {
        return res.status(400).json({ message: 'Serial number is required' });
      }
  
      // Construct proper URL (works for both dev and production)
      const imageUrl = `/uploads/${req.file.filename}`;

      // Process with Gemini AI
      const model = genAI.getGenerativeModel({ 
        model: "gemini-1.5-flash",
      });
  
      const referenceImage = fs.readFileSync(config.REFERENCE_IMAGE_PATH);
      const uploadedImage = fs.readFileSync(req.file.path);
  
      const referenceImageBase64 = referenceImage.toString('base64');
      const uploadedImageBase64 = uploadedImage.toString('base64');
  
      const prompt = `
      Analyze the similarity between two images on a scale of 1.00-10.00. 
      Consider shape, color, composition, and overall visual resemblance. 
      Provide a decimal score that reflects partial matching, not just binary matching. 
      Penalize significant differences but allow for color and minor stylistic variations.
      
      Only respond with the number, no additional text or explanation.`;
  
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
  
      // Create new table entry with the provided serial number and AI response
      const newEntry = new TableEntry({
        user: req.user.id,
        serialNumber: parseInt(serialNumber), // Ensure it's stored as a number
        imageUrl: `/uploads/${req.file.filename}`,
        aiResponse: `Similarity score: ${score.toFixed(1)}/10`,
        aiScore: score
      });
      await newEntry.save();

    res.status(201).json({
      ...newEntry.toObject(),
      aiResponse: `Similarity score: ${score}/10`,
      aiScore: score
    });

  } catch (err) {
    console.error('Error in createEntry:', err);
    
    // Clean up uploaded file if something went wrong
    if (req.file) {
      fs.unlinkSync(req.file.path);
    }

    res.status(500).json({ 
      message: 'Server Error',
      error: err.message 
    });
  }
};
// Get all entries for current user
exports.getUserEntries = async (req, res) => {
  try {
    const entries = await TableEntry.find({ user: req.user.id }).sort({ serialNumber: -1 });
    res.json(entries);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
};

// Get all entries (admin only)
exports.getAllEntries = async (req, res) => {
  try {
    // Check if user is admin
    if (!req.user.isAdmin) {
      return res.status(403).json({ message: 'Not authorized' });
    }
    
    const entries = await TableEntry.find().populate('user', 'username').sort({ serialNumber: -1 });
    res.json(entries);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
};

// Delete entry
exports.deleteEntry = async (req, res) => {
  try {
    // Find entry
    const entry = await TableEntry.findById(req.params.id);
    
    // Check if entry exists
    if (!entry) {
      return res.status(404).json({ message: 'Entry not found' });
    }
    
    // Check if user owns the entry or is admin
    if (entry.user.toString() !== req.user.id && !req.user.isAdmin) {
      return res.status(403).json({ message: 'Not authorized' });
    }
    
    await entry.remove();
    res.json({ message: 'Entry removed' });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
};