const TableEntry = require('../models/TableEntry');
const PointlessEntry = require('../models/PointlessEntry');
const User = require('../models/User');

// Get leaderboard data
exports.getLeaderboard = async (req, res) => {
    try {
      // Fetch all entries from both games
      const tableEntries = await TableEntry.find().populate('user', 'username');
      const pointlessEntries = await PointlessEntry.find().populate('user', 'username');
  
      // Initialize the response structure
      const leaderboardData = {
        overall: [],
        round1: [],
        round2: [],
        byRow: {}
      };
  
      // Skip processing if no entries exist
      if (!tableEntries.length && !pointlessEntries.length) {
        return res.json(leaderboardData);
      }
  
      // Process Round 2 (image similarity) data
      // Group entries by user and row to find max scores
      const userRowScores = {};
      
      tableEntries.forEach(entry => {
        if (!entry.user) return; // Skip entries without user info
        
        const userId = entry.user._id.toString();
        const username = entry.user.username;
        const rowNum = entry.serialNumber;
        const aiScore = parseFloat(entry.aiResponse) || 0;
        const adminScore = parseFloat(entry.adminScore) || 0;
        const totalScore = aiScore + adminScore;
        
        // Initialize user data if not exists
        if (!userRowScores[userId]) {
          userRowScores[userId] = {
            userId,
            username,
            rowScores: {}, // Store best score per row
            submissionCount: 0
          };
        }
        
        // Track submission count
        userRowScores[userId].submissionCount++;
        
        // Update max score for this row if better than previous
        if (!userRowScores[userId].rowScores[rowNum] || 
            totalScore > userRowScores[userId].rowScores[rowNum]) {
          userRowScores[userId].rowScores[rowNum] = totalScore;
        }
      });
      
      // Calculate total score as sum of max scores per row
      const round2Data = {};
      Object.values(userRowScores).forEach(user => {
        const totalScore = Object.values(user.rowScores).reduce((sum, score) => sum + score, 0);
        const maxRowScore = Object.values(user.rowScores).length > 0 ? 
          Math.max(...Object.values(user.rowScores)) : 0;
        
        round2Data[user.userId] = {
          userId: user.userId,
          username: user.username,
          totalScore: totalScore,
          maxScore: maxRowScore,
          submissionCount: user.submissionCount,
          rowCount: Object.keys(user.rowScores).length
        };
      });
  
      // Process Round 1 (pointless) data
      const round1Data = {};
      
      pointlessEntries.forEach(entry => {
        if (!entry.user) return;
        
        const userId = entry.user._id.toString();
        const username = entry.user.username;
        const score = entry.score || 0;
        
        if (!round1Data[userId]) {
          round1Data[userId] = {
            userId,
            username,
            scores: [score],
            totalScore: score,
            pointlessAnswers: entry.isPointless ? 1 : 0,
            questionCount: 1
          };
        } else {
          round1Data[userId].scores.push(score);
          round1Data[userId].totalScore += score;
          round1Data[userId].pointlessAnswers += entry.isPointless ? 1 : 0;
          round1Data[userId].questionCount += 1;
        }
      });
  
      // Calculate overall scores (combining both rounds)
      const overallData = {};
      
      // First populate all users with Round 1 data (set to 0 if not found)
      const allUserIds = new Set([
        ...Object.keys(round1Data),
        ...Object.keys(round2Data)
      ]);
      
      Array.from(allUserIds).forEach(userId => {
        const round1User = round1Data[userId];
        const round2User = round2Data[userId];
        
        overallData[userId] = {
          userId,
          username: round1User?.username || round2User?.username,
          round1Score: round1User?.totalScore || 0,
          round2Score: round2User?.totalScore || 0,
          // Calculate overall score as: 1000 - round1Score + round2Score
          totalScore: 1000 - (round1User?.totalScore || 0) + (round2User?.totalScore || 0),
          submissionCount: (round1User?.questionCount || 0) + (round2User?.submissionCount || 0)
        };
      });
  
      // Format Round 2 leaderboard
      const round2Leaderboard = Object.values(round2Data).map(user => ({
        userId: user.userId,
        username: user.username,
        totalScore: user.totalScore,
        maxScore: user.maxScore,
        submissionCount: user.submissionCount,
        rowCount: user.rowCount,
        averageScore: user.totalScore / (user.rowCount || 1) // Avoid division by zero
      }));
  
      // Sort by total score (descending)
      round2Leaderboard.sort((a, b) => b.totalScore - a.totalScore);
  
      // Format Round 1 leaderboard - For Pointless, LOWER scores are better!
      const round1Leaderboard = Object.values(round1Data).map(user => ({
        userId: user.userId,
        username: user.username,
        totalScore: user.totalScore,
        pointlessAnswers: user.pointlessAnswers,
        questionCount: user.questionCount
      }));
  
      // Sort by total score (ascending for Pointless)
      round1Leaderboard.sort((a, b) => a.totalScore - b.totalScore);
  
      // Format overall leaderboard (combined scores)
      const overallLeaderboard = Object.values(overallData);
      
      // Sort by total score (descending)
      overallLeaderboard.sort((a, b) => b.totalScore - a.totalScore);
  
      // Calculate row-specific leaderboards (only for Round 2)
      const rowLeaderboards = {};
      
      tableEntries.forEach(entry => {
        if (!entry.user) return;
        
        const rowNum = entry.serialNumber;
        const userId = entry.user._id.toString();
        const username = entry.user.username;
        const aiScore = parseFloat(entry.aiResponse) || 0;
        const adminScore = parseFloat(entry.adminScore) || 0;
        const totalScore = aiScore + adminScore;
        
        if (!rowLeaderboards[rowNum]) {
          rowLeaderboards[rowNum] = {};
        }
  
        if (!rowLeaderboards[rowNum][userId]) {
          rowLeaderboards[rowNum][userId] = {
            userId,
            username,
            maxScore: totalScore,
            aiScore: aiScore,
            adminScore: adminScore
          };
        } else if (totalScore > rowLeaderboards[rowNum][userId].maxScore) {
          rowLeaderboards[rowNum][userId].maxScore = totalScore;
          rowLeaderboards[rowNum][userId].aiScore = aiScore;
          rowLeaderboards[rowNum][userId].adminScore = adminScore;
        }
      });
  
      // Convert row leaderboards to arrays and sort by max score
      const formattedRowLeaderboards = {};
      
      Object.keys(rowLeaderboards).forEach(rowNum => {
        formattedRowLeaderboards[rowNum] = Object.values(rowLeaderboards[rowNum])
          .sort((a, b) => b.maxScore - a.maxScore);
      });
  
      // Set the final leaderboard data
      leaderboardData.overall = overallLeaderboard;
      leaderboardData.round1 = round1Leaderboard;
      leaderboardData.round2 = round2Leaderboard;
      leaderboardData.byRow = formattedRowLeaderboards;
  
      res.json(leaderboardData);
    } catch (err) {
      console.error('Error generating leaderboard:', err);
      res.status(500).json({ message: 'Server Error' });
    }
  };

  
// Get user ranking
exports.getUserRanking = async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Get user's entries from both games
    const tableEntries = await TableEntry.find({ user: userId });
    const pointlessEntries = await PointlessEntry.find({ user: userId });
    
    if (!tableEntries.length && !pointlessEntries.length) {
      return res.json({
        overallRank: null,
        totalScore: 0,
        round1Score: 0,
        round2Score: 0,
        rowRanks: {}
      });
    }
    
    // Calculate Round 2 score - use max scores per row method
    const rowMaxScores = {};
    tableEntries.forEach(entry => {
      const rowNum = entry.serialNumber;
      const aiScore = parseFloat(entry.aiResponse) || 0;
      const adminScore = parseFloat(entry.adminScore) || 0;
      const entryTotalScore = aiScore + adminScore;
      
      if (!rowMaxScores[rowNum] || entryTotalScore > rowMaxScores[rowNum]) {
        rowMaxScores[rowNum] = entryTotalScore;
      }
    });
    
    // Sum max scores per row
    const round2Score = Object.values(rowMaxScores).reduce((sum, score) => sum + score, 0);
    
    // Calculate Round 1 score
    let round1Score = 0;
    let pointlessAnswers = 0;
    
    pointlessEntries.forEach(entry => {
      round1Score += entry.score || 0;
      if (entry.isPointless) {
        pointlessAnswers++;
      }
    });
    
    // Calculate total score
    const totalScore = round1Score + round2Score;
    
    // Get leaderboard data to calculate ranks
    const leaderboardData = await this.getLeaderboard(req, {
      json: (data) => {
        return data;
      }
    });
    
    // Find user's overall rank
    let overallRank = null;
    let round1Rank = null;
    let round2Rank = null;
    
    // Find overall rank
    for (let i = 0; i < leaderboardData.overall.length; i++) {
      if (leaderboardData.overall[i].userId === userId) {
        overallRank = i + 1;
        break;
      }
    }
    
    // Find Round 1 rank
    for (let i = 0; i < leaderboardData.round1.length; i++) {
      if (leaderboardData.round1[i].userId === userId) {
        round1Rank = i + 1;
        break;
      }
    }
    
    // Find Round 2 rank
    for (let i = 0; i < leaderboardData.round2.length; i++) {
      if (leaderboardData.round2[i].userId === userId) {
        round2Rank = i + 1;
        break;
      }
    }
    
    // Calculate row-specific ranks
    const rowRanks = {};
    
    for (const rowNum in rowMaxScores) {
      if (leaderboardData.byRow[rowNum]) {
        for (let i = 0; i < leaderboardData.byRow[rowNum].length; i++) {
          if (leaderboardData.byRow[rowNum][i].userId === userId) {
            rowRanks[rowNum] = {
              rank: i + 1,
              outOf: leaderboardData.byRow[rowNum].length,
              score: rowMaxScores[rowNum]
            };
            break;
          }
        }
      }
    }
    
    res.json({
      overallRank,
      round1Rank,
      round2Rank,
      totalScore,
      round1Score,
      round2Score,
      pointlessAnswers,
      rowRanks
    });
  } catch (err) {
    console.error('Error getting user ranking:', err);
    res.status(500).json({ message: 'Server Error' });
  }
};

// Get user entries for the table page
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