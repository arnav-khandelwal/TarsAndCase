const TableEntry = require('../models/TableEntry');
const User = require('../models/User');

// Get leaderboard data
exports.getLeaderboard = async (req, res) => {
  try {
    // Fetch all entries with user information
    // No need to sort here as we'll be calculating totals and sorting later
    const entries = await TableEntry.find().populate('user', 'username');

    if (!entries || entries.length === 0) {
      return res.json({
        overall: [],
        byRow: {}
      });
    }

    // Calculate overall stats per user
    const userStats = {};
    
    entries.forEach(entry => {
      if (!entry.user) return; // Skip entries without user info
      
      const userId = entry.user._id.toString();
      const username = entry.user.username;
      const aiScore = parseFloat(entry.aiResponse) || 0;
      const adminScore = parseFloat(entry.adminScore) || 0;
      const totalScore = aiScore + adminScore; // Calculate total score for each entry
      
      if (!userStats[userId]) {
        userStats[userId] = {
          userId,
          username,
          scores: [totalScore], // Store total scores
          aiScores: [aiScore],  // Store AI scores separately
          adminScores: [adminScore], // Store admin scores separately
          totalScore: totalScore,
          maxScore: totalScore,
          submissionCount: 1
        };
      } else {
        userStats[userId].scores.push(totalScore);
        userStats[userId].aiScores.push(aiScore);
        userStats[userId].adminScores.push(adminScore);
        userStats[userId].totalScore += totalScore; // Sum of all total scores
        userStats[userId].maxScore = Math.max(userStats[userId].maxScore, totalScore);
        userStats[userId].submissionCount += 1;
      }
    });

    // Calculate averages and format overall leaderboard
    const overallLeaderboard = Object.values(userStats).map(user => ({
      userId: user.userId,
      username: user.username,
      totalScore: user.totalScore, // This is now the sum of all (AI + admin) scores
      maxScore: user.maxScore,
      submissionCount: user.submissionCount,
      averageScore: user.totalScore / user.submissionCount
    }));

    // Sort by total score (descending)
    overallLeaderboard.sort((a, b) => b.totalScore - a.totalScore);

    // Calculate row-specific leaderboards
    const rowLeaderboards = {};
    
    entries.forEach(entry => {
      if (!entry.user) return;
      
      const rowNum = entry.serialNumber;
      const userId = entry.user._id.toString();
      const username = entry.user.username;
      const aiScore = parseFloat(entry.aiResponse) || 0;
      const adminScore = parseFloat(entry.adminScore) || 0;
      const totalScore = aiScore + adminScore; // Use total score for row rankings too
      
      if (!rowLeaderboards[rowNum]) {
        rowLeaderboards[rowNum] = {};
      }

      if (!rowLeaderboards[rowNum][userId]) {
        rowLeaderboards[rowNum][userId] = {
          userId,
          username,
          maxScore: totalScore, // Track max total score per row
          aiScore: aiScore,     // Keep AI score for reference
          adminScore: adminScore // Keep admin score for reference
        };
      } else if (totalScore > rowLeaderboards[rowNum][userId].maxScore) {
        // Update if this entry has a higher total score
        rowLeaderboards[rowNum][userId].maxScore = totalScore;
        rowLeaderboards[rowNum][userId].aiScore = aiScore;
        rowLeaderboards[rowNum][userId].adminScore = adminScore;
      }
    });

    // Convert row leaderboards to arrays and sort by max score
    const formattedRowLeaderboards = {};
    
    Object.keys(rowLeaderboards).forEach(rowNum => {
      formattedRowLeaderboards[rowNum] = Object.values(rowLeaderboards[rowNum])
        .sort((a, b) => b.maxScore - a.maxScore); // Sort by total score
    });

    res.json({
      overall: overallLeaderboard,
      byRow: formattedRowLeaderboards
    });
  } catch (err) {
    console.error('Error generating leaderboard:', err);
    res.status(500).json({ message: 'Server Error' });
  }
};

// Get user ranking
exports.getUserRanking = async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Get user's entries
    const userEntries = await TableEntry.find({ user: userId });
    
    if (!userEntries || userEntries.length === 0) {
      return res.json({
        overallRank: null,
        totalScore: 0,
        rowRanks: {}
      });
    }
    
    // Calculate user's total score
    let totalScore = 0;
    const rowScores = {};
    
    userEntries.forEach(entry => {
      const aiScore = parseFloat(entry.aiResponse) || 0;
      const adminScore = parseFloat(entry.adminScore) || 0;
      const entryTotalScore = aiScore + adminScore;
      
      totalScore += entryTotalScore;
      
      const rowNum = entry.serialNumber;
      if (!rowScores[rowNum] || entryTotalScore > rowScores[rowNum]) {
        rowScores[rowNum] = entryTotalScore;
      }
    });
    
    // Get leaderboard data to calculate ranks
    const leaderboardData = await TableEntry.aggregate([
      {
        $lookup: {
          from: 'users',
          localField: 'user',
          foreignField: '_id',
          as: 'userInfo'
        }
      },
      { $unwind: '$userInfo' },
      {
        $addFields: {
          // Convert string scores to numbers and handle nulls
          numericAiResponse: { $convert: { input: '$aiResponse', to: 'double', onError: 0, onNull: 0 } },
          numericAdminScore: { $ifNull: [{ $convert: { input: '$adminScore', to: 'double', onError: 0, onNull: 0 } }, 0] },
        }
      },
      {
        $addFields: {
          // Calculate total score for each entry
          totalEntryScore: { $add: ['$numericAiResponse', '$numericAdminScore'] }
        }
      },
      {
        $group: {
          _id: '$userInfo._id',
          username: { $first: '$userInfo.username' },
          totalScore: { $sum: '$totalEntryScore' } // Sum of all total scores
        }
      },
      { $sort: { totalScore: -1 } }
    ]);
    
    // Find user's overall rank
    let overallRank = null;
    for (let i = 0; i < leaderboardData.length; i++) {
      if (leaderboardData[i]._id.toString() === userId) {
        overallRank = i + 1;
        break;
      }
    }
    
    // Calculate row-specific ranks
    const rowRanks = {};
    
    for (const rowNum in rowScores) {
      const rowLeaderboard = await TableEntry.aggregate([
        { $match: { serialNumber: parseInt(rowNum) } },
        {
          $lookup: {
            from: 'users',
            localField: 'user',
            foreignField: '_id',
            as: 'userInfo'
          }
        },
        { $unwind: '$userInfo' },
        {
          $addFields: {
            // Convert string scores to numbers and handle nulls
            numericAiResponse: { $convert: { input: '$aiResponse', to: 'double', onError: 0, onNull: 0 } },
            numericAdminScore: { $ifNull: [{ $convert: { input: '$adminScore', to: 'double', onError: 0, onNull: 0 } }, 0] },
          }
        },
        {
          $addFields: {
            // Calculate total score for each entry
            totalEntryScore: { $add: ['$numericAiResponse', '$numericAdminScore'] }
          }
        },
        {
          $group: {
            _id: '$userInfo._id',
            username: { $first: '$userInfo.username' },
            maxScore: { $max: '$totalEntryScore' } // Get max total score per row
          }
        },
        { $sort: { maxScore: -1 } }
      ]);
      
      for (let i = 0; i < rowLeaderboard.length; i++) {
        if (rowLeaderboard[i]._id.toString() === userId) {
          rowRanks[rowNum] = {
            rank: i + 1,
            outOf: rowLeaderboard.length,
            score: rowScores[rowNum]
          };
          break;
        }
      }
    }
    
    res.json({
      overallRank,
      totalScore,
      rowRanks
    });
  } catch (err) {
    console.error('Error getting user ranking:', err);
    res.status(500).json({ message: 'Server Error' });
  }
};
exports.getUserEntries = async (req, res) => {
    try {
      const entries = await TableEntry.find({ user: req.user.id }).sort({ serialNumber: -1 });
      
      // Get submission counts for each row
      const submissionCounts = {};
      const MAX_SUBMISSIONS_PER_ROW = 5; // Define this at the top of your file
  
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
      
      // Return formatted response with entries and submission limits info
      res.json({
        entries: entries, // Make sure entries is an array
        submissionLimits: submissionCounts,
        maxSubmissionsPerRow: MAX_SUBMISSIONS_PER_ROW
      });
    } catch (err) {
      console.error(err.message);
      res.status(500).send('Server Error');
    }
  };