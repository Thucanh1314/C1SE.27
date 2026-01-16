// src/modules/export/service/export.service.js
const { Survey, SurveyResponse, Answer, Question, QuestionOption, User } = require('../../../models');

class ExportService {
  /**
   * Export survey responses to CSV format
   */
  async exportSurveyToCSV(surveyId, user) {
    // Verify survey exists and user has access
    const survey = await Survey.findByPk(surveyId, {
      include: [
        {
          model: require('../../../src/models').SurveyTemplate,
          as: 'template',
          include: [
            {
              model: Question,
              include: [QuestionOption]
            }
          ]
        }
      ]
    });

    if (!survey) {
      throw new Error('Survey not found');
    }

    // Only survey creator or admin can export
    if (survey.created_by !== user.id && user.role !== 'admin') {
      throw new Error('Access denied. Only survey creator can export data.');
    }

    // Get all responses
    const responses = await SurveyResponse.findAll({
      where: { survey_id: surveyId },
      include: [
        {
          model: User,
          attributes: ['id', 'username', 'full_name', 'email']
        },
        {
          model: Answer,
          include: [
            {
              model: Question,
              attributes: ['id', 'question_text', 'question_type_id']
            },
            {
              model: QuestionOption,
              attributes: ['id', 'option_text']
            }
          ]
        }
      ],
      order: [['submitted_at', 'ASC']]
    });

    // Build CSV headers
    const questions = survey.template.Questions;
    const headers = [
      'Response ID',
      'Respondent ID',
      'Respondent Name',
      'Respondent Email',
      'Submitted At',
      ...questions.map(q => q.question_text)
    ];

    // Build CSV rows
    const rows = responses.map(response => {
      const row = [
        response.id,
        response.User.id,
        response.User.full_name || response.User.username,
        response.User.email,
        response.submitted_at
      ];

      // Add answers for each question
      questions.forEach(question => {
        // Find ALL answers for this question (to handle multiple choice/checkbox)
        const questionAnswers = response.Answers.filter(a => a.question_id === question.id);

        if (questionAnswers.length > 0) {
          const answerValues = questionAnswers.map(answer => {
            return answer.QuestionOption
              ? answer.QuestionOption.option_text
              : (answer.answer_text || '');
          });
          // Join multiple values with a semicolon and space
          row.push(answerValues.filter(v => v).join('; '));
        } else {
          row.push('');
        }
      });

      return row;
    });

    return {
      headers,
      rows,
      survey_title: survey.title,
      total_responses: responses.length
    };
  }

  /**
   * Convert CSV data to string
   */
  convertToCSVString(headers, rows) {
    const escapeCSV = (value) => {
      if (value === null || value === undefined) return '';
      const str = String(value);
      // Escape double quotes and wrap in quotes if contains comma, newline, or quotes
      if (str.includes(',') || str.includes('\n') || str.includes('"')) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    };

    const csvRows = [
      headers.map(escapeCSV).join(','),
      ...rows.map(row => row.map(escapeCSV).join(','))
    ];

    return csvRows.join('\n');
  }

  /**
   * Get export metadata
   */
  async getExportMetadata(surveyId, user) {
    const survey = await Survey.findByPk(surveyId, {
      attributes: ['id', 'title', 'created_by', 'status']
    });

    if (!survey) {
      throw new Error('Survey not found');
    }

    if (survey.created_by !== user.id && user.role !== 'admin') {
      throw new Error('Access denied');
    }

    const responseCount = await SurveyResponse.count({
      where: { survey_id: surveyId }
    });

    return {
      survey_id: surveyId,
      survey_title: survey.title,
      response_count: responseCount,
      export_formats: ['CSV', 'JSON'],
      can_export: responseCount > 0
    };
  }
}

module.exports = new ExportService();
