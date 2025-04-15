const TableEntry = require('../models/TableEntry');
const fetch = require('node-fetch');
const config = require('../config/config');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const fs = require('fs');
const path = require('path');
// Create a new table entry
const genAI = new GoogleGenerativeAI(config.geminiApiKey);

// Maximum submissions per row per user
const MAX_SUBMISSIONS_PER_ROW = 5;

exports.createEntry = async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: 'No image uploaded' });
      }
  
      const { serialNumber } = req.body;
      if (!serialNumber) {
        return res.status(400).json({ message: 'Serial number is required' });
      }

      // Check if user has already submitted the maximum number of entries for this row
      const submissionCount = await TableEntry.countDocuments({
        user: req.user.id,
        serialNumber: parseInt(serialNumber)
      });

      if (submissionCount >= MAX_SUBMISSIONS_PER_ROW) {
        // Remove the uploaded file to avoid cluttering storage
        if (req.file && req.file.path) {
          fs.unlinkSync(req.file.path);
        }
        return res.status(400).json({ 
          message: `You've reached the maximum limit of ${MAX_SUBMISSIONS_PER_ROW} submissions for row #${serialNumber}`
        });
      }

      // Process with Gemini AI
      const model = genAI.getGenerativeModel({ 
        model: "gemini-1.5-flash",
      });
  
      const referenceImage = fs.readFileSync(config.REFERENCE_IMAGE_PATH);
      const uploadedImage = fs.readFileSync(req.file.path);
  
      const referenceImageBase64 = referenceImage.toString('base64');
      const uploadedImageBase64 = uploadedImage.toString('base64');
  
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
      Do not include any text, explanation, or analysis in your response.`;
  
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
        aiResponse: `${score.toFixed(1)}`,
        aiScore: score
      });
      await newEntry.save();

    res.status(201).json({
      ...newEntry.toObject(),
      aiResponse: `Similarity score: ${score}/10`,
      aiScore: score,
      submissionsRemaining: MAX_SUBMISSIONS_PER_ROW - (submissionCount + 1)
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
    
    // Get submission counts for each row
    const submissionCounts = {};
    for (let i = 1; i <= 11; i++) {
      const count = await TableEntry.countDocuments({ 
        user: req.user.id, 
        serialNumber: i 
      });
      submissionCounts[i] = {
        count,
        remaining: MAX_SUBMISSIONS_PER_ROW - count
      };
    }
    
    res.json({
      entries,
      submissionLimits: submissionCounts,
      maxSubmissionsPerRow: MAX_SUBMISSIONS_PER_ROW
    });
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
    
    await TableEntry.deleteOne({ _id: entry._id });
    res.json({ message: 'Entry removed' });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
};

// Update admin score
exports.updateAdminScore = async (req, res) => {
  try {
    const { adminScore } = req.body;
    
    // Validate admin score
    if (adminScore === undefined || adminScore === null) {
      return res.status(400).json({ message: 'Admin score is required' });
    }
    
    const score = parseFloat(adminScore);
    
    // Validate score is a number between 0 and 10
    if (isNaN(score) || score < 0 || score > 10) {
      return res.status(400).json({ message: 'Score must be a number between 0 and 10' });
    }
    
    // Check if user is admin
    if (!req.user.isAdmin) {
      return res.status(403).json({ message: 'Not authorized' });
    }
    
    // Find and update entry
    const entry = await TableEntry.findById(req.params.id);
    
    if (!entry) {
      return res.status(404).json({ message: 'Entry not found' });
    }
    
    entry.adminScore = score;
    await entry.save();
    
    res.json({ 
      success: true, 
      entry
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
};