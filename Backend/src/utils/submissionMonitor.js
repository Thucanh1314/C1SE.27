// Monitor survey submissions for quality assurance
const fs = require('fs');
const path = require('path');

class SubmissionMonitor {
  static logPath = path.join(__dirname, 'logs', 'submissions.log');
  
  static logSubmission(surveyId, responseId, status, timeTaken, clientResponseId) {
    const timestamp = new Date().toISOString();
    const logEntry = {
      timestamp,
      surveyId,
      responseId, 
      status,
      timeTaken,
      clientResponseId: clientResponseId?.substring(0, 8) + '...' // Privacy protection
    };
    
    // Ensure logs directory exists
    const logsDir = path.dirname(this.logPath);
    if (!fs.existsSync(logsDir)) {
      fs.mkdirSync(logsDir, { recursive: true });
    }
    
    // Append log entry
    fs.appendFileSync(this.logPath, JSON.stringify(logEntry) + '\n');
    
    console.log(`📝 [Submission Monitor] Survey ${surveyId} - Response ${responseId} - Status: ${status} - Time: ${timeTaken}s`);
  }
  
  static checkStuckResponses() {
    // This could be called periodically to find responses stuck in 'started' status
    console.log('🔍 Checking for stuck responses...');
    // Implementation would query database for old 'started' responses
  }
}

module.exports = SubmissionMonitor;