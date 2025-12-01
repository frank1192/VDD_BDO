const { db } = require('./database');
const Note = require('./note');
const User = require('./user');
const UserIndicatorConfig = require('./userIndicatorConfig');

class Calculation {
  static calculateForUser(userId) {
    const user = User.getById(userId);
    if (!user) return null;

    let result;
    switch (user.role) {
      case 'analyst':
        result = this.calculateAnalystScore(userId);
        break;
      case 'coordinator':
        result = this.calculateCoordinatorScore(userId);
        break;
      case 'leader':
        result = this.calculateLeaderScore(userId);
        break;
      default:
        result = { finalScore: 0, details: [] };
    }

    // Save calculation result
    this.saveCalculationResult(userId, result);
    return result;
  }

  static calculateAnalystScore(userId) {
    const notes = Note.getByUserId(userId);
    const configs = UserIndicatorConfig.getByUserId(userId);
    
    let weightedSum = 0;
    let totalPercentage = 0;
    const details = [];

    for (const note of notes) {
      const config = configs.find(c => c.indicator_id === note.indicator_id);
      const percentage = config ? config.percentage : 0;
      const globalValue = config ? config.global_value : null;
      const value = globalValue !== null ? globalValue : (note.value || 0);
      
      const weightedValue = value * (percentage / 100);
      weightedSum += weightedValue;
      totalPercentage += percentage;

      details.push({
        indicator_id: note.indicator_id,
        indicator_name: note.indicator_name,
        value: value,
        percentage: percentage,
        weighted_value: weightedValue,
        used_global: globalValue !== null
      });
    }

    return {
      finalScore: Math.round(weightedSum * 100) / 100,
      totalPercentage: Math.round(totalPercentage * 100) / 100,
      details
    };
  }

  static calculateCoordinatorScore(userId) {
    // First calculate own indicators
    const ownResult = this.calculateAnalystScore(userId);
    
    // Get team members
    const teamMembers = User.getTeamMembers(userId);
    
    if (teamMembers.length === 0) {
      return ownResult;
    }

    // Calculate average of team members (only for shared indicators)
    const teamScores = [];
    const teamDetails = [];

    for (const member of teamMembers) {
      const memberResult = this.calculateAnalystScore(member.id);
      teamScores.push(memberResult.finalScore);
      teamDetails.push({
        user_id: member.id,
        user_name: member.name,
        score: memberResult.finalScore
      });
    }

    const teamAverage = teamScores.length > 0 
      ? teamScores.reduce((a, b) => a + b, 0) / teamScores.length 
      : 0;

    // Coordinator's final score is average of own score and team average
    const finalScore = (ownResult.finalScore + teamAverage) / 2;

    return {
      finalScore: Math.round(finalScore * 100) / 100,
      ownScore: ownResult.finalScore,
      teamAverage: Math.round(teamAverage * 100) / 100,
      details: ownResult.details,
      teamDetails
    };
  }

  static calculateLeaderScore(userId) {
    // Get all coordinators under this leader
    const coordinators = User.getTeamMembers(userId).filter(u => u.role === 'coordinator');
    const directReports = User.getTeamMembers(userId).filter(u => u.role !== 'coordinator');

    const coordScores = [];
    const coordDetails = [];

    for (const coord of coordinators) {
      const coordResult = this.calculateCoordinatorScore(coord.id);
      coordScores.push(coordResult.finalScore);
      coordDetails.push({
        user_id: coord.id,
        user_name: coord.name,
        score: coordResult.finalScore,
        role: 'coordinator'
      });
    }

    // Also include direct analyst reports
    for (const report of directReports) {
      const reportResult = this.calculateAnalystScore(report.id);
      coordScores.push(reportResult.finalScore);
      coordDetails.push({
        user_id: report.id,
        user_name: report.name,
        score: reportResult.finalScore,
        role: report.role
      });
    }

    const finalScore = coordScores.length > 0
      ? coordScores.reduce((a, b) => a + b, 0) / coordScores.length
      : 0;

    return {
      finalScore: Math.round(finalScore * 100) / 100,
      subordinatesCount: coordScores.length,
      teamDetails: coordDetails
    };
  }

  static saveCalculationResult(userId, result) {
    const detailsJson = JSON.stringify(result);
    const existing = db.prepare('SELECT id FROM calculation_results WHERE user_id = ?').get(userId);
    
    if (existing) {
      db.prepare(`
        UPDATE calculation_results 
        SET final_score = ?, calculation_details = ?, calculated_at = CURRENT_TIMESTAMP
        WHERE user_id = ?
      `).run(result.finalScore, detailsJson, userId);
    } else {
      db.prepare(`
        INSERT INTO calculation_results (user_id, final_score, calculation_details)
        VALUES (?, ?, ?)
      `).run(userId, result.finalScore, detailsJson);
    }
  }

  static getCalculationResult(userId) {
    const result = db.prepare('SELECT * FROM calculation_results WHERE user_id = ?').get(userId);
    if (result && result.calculation_details) {
      result.details = JSON.parse(result.calculation_details);
    }
    return result;
  }

  static getAllCalculationResults() {
    return db.prepare(`
      SELECT cr.*, u.name as user_name, u.role as user_role
      FROM calculation_results cr
      JOIN users u ON cr.user_id = u.id
      ORDER BY u.name
    `).all();
  }

  static getTeamProgress(leaderId) {
    const teamMembers = User.getTeamMembers(leaderId);
    const progress = [];

    for (const member of teamMembers) {
      const notes = Note.getByUserId(member.id);
      const completed = notes.filter(n => n.value !== null).length;
      const total = notes.length;
      
      progress.push({
        user_id: member.id,
        user_name: member.name,
        role: member.role,
        completed,
        total,
        percentage: total > 0 ? Math.round((completed / total) * 100) : 0
      });
    }

    return progress;
  }
}

module.exports = Calculation;
