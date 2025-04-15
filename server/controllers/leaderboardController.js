const TableEntry = require('../models/TableEntry');
const User = require('../models/User');

// Get leaderboard data
exports.getLeaderboard = async (req, res) => {
  try {
    // Fetch all entries with user information
    const entries = await TableEntry.find()
      .populate('user', 'username')
      .sort({ aiResponse: -1 });

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
      const score = parseFloat(entry.aiResponse) || 0;
      
      if (!userStats[userId]) {
        userStats[userId] = {
          userId,
          username,
          scores: [score],
          totalScore: score,
          maxScore: score,
          submissionCount: 1
        };
      } else {
        userStats[userId].scores.push(score);
        userStats[userId].totalScore += score;
        userStats[userId].maxScore = Math.max(userStats[userId].maxScore, score);
        userStats[userId].submissionCount += 1;
      }
    });

    // Calculate averages and format overall leaderboard
    const overallLeaderboard = Object.values(userStats).map(user => ({
      userId: user.userId,
      username: user.username,
      totalScore: user.totalScore,
      maxScore: user.maxScore,
      submissionCount: user.submissionCount,
      averageScore: user.totalScore / user.submissionCount
    }));

    // Sort by total score
    overallLeaderboard.sort((a, b) => b.totalScore - a.totalScore);

    // Calculate row-specific leaderboards
    const rowLeaderboards = {};
    
    entries.forEach(entry => {
      if (!entry.user) return;
      
      const rowNum = entry.serialNumber;
      const userId = entry.user._id.toString();
      const username = entry.user.username;
      const score = parseFloat(entry.aiResponse) || 0;
      
      if (!rowLeaderboards[rowNum]) {
        rowLeaderboards[rowNum] = {};
      }

      if (!rowLeaderboards[rowNum][userId]) {
        rowLeaderboards[rowNum][userId] = {
          userId,
          username,
          maxScore: score
        };
      } else if (score > rowLeaderboards[rowNum][userId].maxScore) {
        rowLeaderboards[rowNum][userId].maxScore = score;
      }
    });

    // Convert row leaderboards to arrays and sort by max score
    const formattedRowLeaderboards = {};
    
    Object.keys(rowLeaderboards).forEach(rowNum => {
      formattedRowLeaderboards[rowNum] = Object.values(rowLeaderboards[rowNum])
        .sort((a, b) => b.maxScore - a.maxScore);
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
    
    // Get user's total score
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
      const score = parseFloat(entry.aiResponse) || 0;
      totalScore += score;
      
      const rowNum = entry.serialNumber;
      if (!rowScores[rowNum] || score > rowScores[rowNum]) {
        rowScores[rowNum] = score;
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
        $group: {
          _id: '$userInfo._id',
          username: { $first: '$userInfo.username' },
          totalScore: { $sum: { $toDouble: '$aiResponse' } }
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
          $group: {
            _id: '$userInfo._id',
            username: { $first: '$userInfo.username' },
            maxScore: { $max: { $toDouble: '$aiResponse' } }
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