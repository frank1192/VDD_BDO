const { db } = require('./database');

class Note {
  static getAll() {
    return db.prepare(`
      SELECT n.*, u.name as user_name, i.name as indicator_name
      FROM notes n
      JOIN users u ON n.user_id = u.id
      JOIN indicators i ON n.indicator_id = i.id
      ORDER BY u.name, i.name
    `).all();
  }

  static getByUserId(userId) {
    return db.prepare(`
      SELECT n.*, i.name as indicator_name, i.description as indicator_description,
             uic.percentage, uic.global_value
      FROM notes n
      JOIN indicators i ON n.indicator_id = i.id
      LEFT JOIN user_indicator_config uic ON n.user_id = uic.user_id AND n.indicator_id = uic.indicator_id
      WHERE n.user_id = ?
      ORDER BY i.name
    `).all(userId);
  }

  static getByUserIdAndIndicatorId(userId, indicatorId) {
    return db.prepare(`
      SELECT n.*, uic.percentage, uic.global_value
      FROM notes n
      LEFT JOIN user_indicator_config uic ON n.user_id = uic.user_id AND n.indicator_id = uic.indicator_id
      WHERE n.user_id = ? AND n.indicator_id = ?
    `).get(userId, indicatorId);
  }

  static create(noteData) {
    const { user_id, indicator_id, value } = noteData;
    const result = db.prepare(`
      INSERT INTO notes (user_id, indicator_id, value)
      VALUES (?, ?, ?)
    `).run(user_id, indicator_id, value !== undefined ? value : null);
    return result.lastInsertRowid;
  }

  static update(userId, indicatorId, value) {
    return db.prepare(`
      UPDATE notes SET value = ?, updated_at = CURRENT_TIMESTAMP
      WHERE user_id = ? AND indicator_id = ?
    `).run(value, userId, indicatorId);
  }

  static upsert(userId, indicatorId, value) {
    const existing = this.getByUserIdAndIndicatorId(userId, indicatorId);
    if (existing) {
      return this.update(userId, indicatorId, value);
    } else {
      return this.create({ user_id: userId, indicator_id: indicatorId, value });
    }
  }

  static delete(userId, indicatorId) {
    return db.prepare('DELETE FROM notes WHERE user_id = ? AND indicator_id = ?').run(userId, indicatorId);
  }

  static getPendingCount() {
    return db.prepare('SELECT COUNT(*) as count FROM notes WHERE value IS NULL').get().count;
  }

  static getCompletedByUserId(userId) {
    return db.prepare(`
      SELECT n.*, i.name as indicator_name
      FROM notes n
      JOIN indicators i ON n.indicator_id = i.id
      WHERE n.user_id = ? AND n.value IS NOT NULL
      ORDER BY i.name
    `).all(userId);
  }

  static initializeUserNotes(userId, role) {
    const Indicator = require('./indicator');
    const indicators = Indicator.getByRole(role);
    
    for (const indicator of indicators) {
      const existing = this.getByUserIdAndIndicatorId(userId, indicator.id);
      if (!existing) {
        this.create({ user_id: userId, indicator_id: indicator.id, value: null });
      }
    }
  }
}

module.exports = Note;
