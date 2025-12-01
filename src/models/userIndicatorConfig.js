const { db } = require('./database');

class UserIndicatorConfig {
  static getByUserAndIndicator(userId, indicatorId) {
    return db.prepare(`
      SELECT * FROM user_indicator_config
      WHERE user_id = ? AND indicator_id = ?
    `).get(userId, indicatorId);
  }

  static getByUserId(userId) {
    return db.prepare(`
      SELECT uic.*, i.name as indicator_name, i.description as indicator_description
      FROM user_indicator_config uic
      JOIN indicators i ON uic.indicator_id = i.id
      WHERE uic.user_id = ?
      ORDER BY i.name
    `).all(userId);
  }

  static create(configData) {
    const { user_id, indicator_id, percentage, global_value } = configData;
    const result = db.prepare(`
      INSERT INTO user_indicator_config (user_id, indicator_id, percentage, global_value)
      VALUES (?, ?, ?, ?)
    `).run(user_id, indicator_id, percentage || 0, global_value || null);
    return result.lastInsertRowid;
  }

  static update(userId, indicatorId, configData) {
    const { percentage, global_value } = configData;
    return db.prepare(`
      UPDATE user_indicator_config 
      SET percentage = ?, global_value = ?
      WHERE user_id = ? AND indicator_id = ?
    `).run(percentage, global_value || null, userId, indicatorId);
  }

  static upsert(userId, indicatorId, configData) {
    const existing = this.getByUserAndIndicator(userId, indicatorId);
    if (existing) {
      return this.update(userId, indicatorId, configData);
    } else {
      return this.create({
        user_id: userId,
        indicator_id: indicatorId,
        ...configData
      });
    }
  }

  static delete(userId, indicatorId) {
    return db.prepare(`
      DELETE FROM user_indicator_config
      WHERE user_id = ? AND indicator_id = ?
    `).run(userId, indicatorId);
  }

  static initializeForUser(userId, role) {
    const Indicator = require('./indicator');
    const indicators = Indicator.getByRole(role);
    const equalPercentage = indicators.length > 0 ? 100 / indicators.length : 0;
    
    for (const indicator of indicators) {
      const existing = this.getByUserAndIndicator(userId, indicator.id);
      if (!existing) {
        this.create({
          user_id: userId,
          indicator_id: indicator.id,
          percentage: equalPercentage,
          global_value: null
        });
      }
    }
  }

  static getTotalPercentage(userId) {
    const result = db.prepare(`
      SELECT SUM(percentage) as total
      FROM user_indicator_config
      WHERE user_id = ?
    `).get(userId);
    return result.total || 0;
  }
}

module.exports = UserIndicatorConfig;
