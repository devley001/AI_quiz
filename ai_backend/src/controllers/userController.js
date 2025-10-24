const User = require('../models/User');
const { ApiResponse } = require('../utils/apiResponse');

exports.getAllUsers = async (req, res, next) => {
  try {
    const users = await User.find().select('-password');
    res.status(200).json(
      ApiResponse.success({ users }, 'Users retrieved successfully')
    );
  } catch (error) {
    next(error);
  }
};

exports.getUserById = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id).select('-password');
    
    if (!user) {
      return res.status(404).json(
        ApiResponse.error('User not found')
      );
    }

    res.status(200).json(
      ApiResponse.success({ user }, 'User retrieved successfully')
    );
  } catch (error) {
    next(error);
  }
};

exports.updateUser = async (req, res, next) => {
  try {
    const { name, email, username } = req.body;
    
    const user = await User.findById(req.user.id);
    
    if (!user) {
      return res.status(404).json(
        ApiResponse.error('User not found')
      );
    }

    // Check if user can update this profile
    if (user._id.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json(
        ApiResponse.error('Not authorized to update this user')
      );
    }

    // Update fields
    if (name) user.name = name;
    if (email) user.email = email;
    if (username) user.username = username;

    await user.save();

    res.status(200).json(
      ApiResponse.success({ user: { id: user._id, name: user.name, email: user.email, username: user.username } }, 'User updated successfully')
    );
  } catch (error) {
    next(error);
  }
};

exports.deleteUser = async (req, res, next) => {
  try {
    const user = await User.findByIdAndDelete(req.params.id);

    if (!user) {
      return res.status(404).json(
        ApiResponse.error('User not found')
      );
    }

    res.status(200).json(
      ApiResponse.success(null, 'User deleted successfully')
    );
  } catch (error) {
    next(error);
  }
};

const { Document, Packer, Paragraph, TextRun, Table, TableCell, TableRow, AlignmentType } = require('docx');

exports.downloadProfile = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id).select('-password').populate('studentProfile');
    
    if (!user) {
      return res.status(404).json(
        ApiResponse.error('User not found')
      );
    }

    // Get quiz results
    const QuizResult = require('../models/QuizResult');
    const quizResults = await QuizResult.find({ user: req.user.id }).sort({ date: -1 });

    // Calculate averages
    const averages = await calculateAverages(req.user.id);

    // Create Word document
    const doc = new Document({
      sections: [{
        properties: {},
        children: [
          new Paragraph({
            children: [
              new TextRun({
                text: "User Profile Report",
                bold: true,
                size: 32,
              }),
            ],
            alignment: AlignmentType.CENTER,
          }),
          new Paragraph({
            children: [new TextRun({ text: "" })],
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: `Generated on: ${new Date().toLocaleDateString()}`,
                italics: true,
              }),
            ],
          }),
          new Paragraph({
            children: [new TextRun({ text: "" })],
          }),
          // Personal Information
          new Paragraph({
            children: [
              new TextRun({
                text: "Personal Information",
                bold: true,
                size: 24,
              }),
            ],
          }),
          new Paragraph({
            children: [new TextRun({ text: `Name: ${user.name || 'Not specified'}` })],
          }),
          new Paragraph({
            children: [new TextRun({ text: `Username: ${user.username}` })],
          }),
          new Paragraph({
            children: [new TextRun({ text: `Email: ${user.email}` })],
          }),
          new Paragraph({
            children: [new TextRun({ text: `Role: ${user.role}` })],
          }),
          new Paragraph({
            children: [new TextRun({ text: `Account Status: ${user.isActive ? 'Active' : 'Inactive'}` })],
          }),
          new Paragraph({
            children: [new TextRun({ text: `Last Login: ${user.lastLogin ? new Date(user.lastLogin).toLocaleDateString() : 'Never'}` })],
          }),
          new Paragraph({
            children: [new TextRun({ text: `Account Created: ${new Date(user.createdAt).toLocaleDateString()}` })],
          }),
          new Paragraph({
            children: [new TextRun({ text: "" })],
          }),
          // Student Profile
          ...(user.studentProfile ? [
            new Paragraph({
              children: [
                new TextRun({
                  text: "Student Profile",
                  bold: true,
                  size: 24,
                }),
              ],
            }),
            new Paragraph({
              children: [new TextRun({ text: `Grade: ${user.studentProfile.grade}` })],
            }),
            new Paragraph({
              children: [new TextRun({ text: `School: ${user.studentProfile.school || 'Not specified'}` })],
            }),
            new Paragraph({
              children: [new TextRun({ text: `Subjects: ${user.studentProfile.subjects.join(', ') || 'None specified'}` })],
            }),
            new Paragraph({
              children: [new TextRun({ text: `Bio: ${user.studentProfile.bio || 'No bio provided'}` })],
            }),
            new Paragraph({
              children: [new TextRun({ text: "" })],
            }),
          ] : []),
          // Quiz Results
          new Paragraph({
            children: [
              new TextRun({
                text: "Quiz Results",
                bold: true,
                size: 24,
              }),
            ],
          }),
          new Paragraph({
            children: [new TextRun({ text: `Overall Average Score: ${averages.overall}%` })],
          }),
          new Paragraph({
            children: [new TextRun({ text: "" })],
          }),
          // Quiz Results Table
          ...(quizResults.length > 0 ? [
            new Table({
              rows: [
                new TableRow({
                  children: [
                    new TableCell({
                      children: [new Paragraph({ children: [new TextRun({ text: "Topic", bold: true })] })],
                    }),
                    new TableCell({
                      children: [new Paragraph({ children: [new TextRun({ text: "Score", bold: true })] })],
                    }),
                    new TableCell({
                      children: [new Paragraph({ children: [new TextRun({ text: "Total Questions", bold: true })] })],
                    }),
                    new TableCell({
                      children: [new Paragraph({ children: [new TextRun({ text: "Percentage", bold: true })] })],
                    }),
                    new TableCell({
                      children: [new Paragraph({ children: [new TextRun({ text: "Date", bold: true })] })],
                    }),
                  ],
                }),
                ...quizResults.map(result => new TableRow({
                  children: [
                    new TableCell({
                      children: [new Paragraph({ children: [new TextRun({ text: result.topic })] })],
                    }),
                    new TableCell({
                      children: [new Paragraph({ children: [new TextRun({ text: result.score.toString() })] })],
                    }),
                    new TableCell({
                      children: [new Paragraph({ children: [new TextRun({ text: result.totalQuestions.toString() })] })],
                    }),
                    new TableCell({
                      children: [new Paragraph({ children: [new TextRun({ text: `${result.percentage}%` })] })],
                    }),
                    new TableCell({
                      children: [new Paragraph({ children: [new TextRun({ text: new Date(result.date).toLocaleDateString() })] })],
                    }),
                  ],
                })),
              ],
            }),
            new Paragraph({
              children: [new TextRun({ text: "" })],
            }),
          ] : [
            new Paragraph({
              children: [new TextRun({ text: "No quiz results found." })],
            }),
          ]),
          // Averages by Topic
          ...(Object.keys(averages.byTopic).length > 0 ? [
            new Paragraph({
              children: [
                new TextRun({
                  text: "Average Scores by Topic",
                  bold: true,
                  size: 20,
                }),
              ],
            }),
            ...Object.entries(averages.byTopic).map(([topic, avg]) =>
              new Paragraph({
                children: [new TextRun({ text: `${topic}: ${avg.toFixed(2)}%` })],
              })
            ),
          ] : []),
        ],
      }],
    });

    // Generate and send the document
    const buffer = await Packer.toBuffer(doc);
    
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    res.setHeader('Content-Disposition', `attachment; filename=user-profile-${user.username}.docx`);
    res.send(buffer);
  } catch (error) {
    next(error);
  }
};

async function calculateAverages(userId) {
  const QuizResult = require('../models/QuizResult');
  const quizResults = await QuizResult.find({ user: userId });

  if (quizResults.length === 0) {
    return {
      overall: 0,
      byTopic: {}
    };
  }

  // Overall average
  const totalScore = quizResults.reduce((sum, result) => sum + result.percentage, 0);
  const overall = totalScore / quizResults.length;

  // Average by topic
  const topicMap = {};
  quizResults.forEach(result => {
    if (!topicMap[result.topic]) {
      topicMap[result.topic] = { total: 0, count: 0 };
    }
    topicMap[result.topic].total += result.percentage;
    topicMap[result.topic].count += 1;
  });

  const byTopic = {};
  Object.keys(topicMap).forEach(topic => {
    byTopic[topic] = topicMap[topic].total / topicMap[topic].count;
  });

  return {
    overall: Math.round(overall * 100) / 100,
    byTopic
  };
}
