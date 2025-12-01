const { db } = require('./database');

class Indicator {
  static getAll() {
    return db.prepare('SELECT * FROM indicators ORDER BY name').all();
  }

  static getById(id) {
    return db.prepare('SELECT * FROM indicators WHERE id = ?').get(id);
  }

  static getByRole(role) {
    return db.prepare(`
      SELECT * FROM indicators 
      WHERE roles LIKE ? OR roles LIKE ? OR roles LIKE ? OR roles = ?
      ORDER BY name
    `).all(`${role},%`, `%,${role},%`, `%,${role}`, role);
  }

  static create(indicatorData) {
    const { name, description, roles } = indicatorData;
    const rolesStr = Array.isArray(roles) ? roles.join(',') : roles;
    const result = db.prepare(`
      INSERT INTO indicators (name, description, roles)
      VALUES (?, ?, ?)
    `).run(name, description || '', rolesStr);
    return result.lastInsertRowid;
  }

  static update(id, indicatorData) {
    const { name, description, roles } = indicatorData;
    const rolesStr = Array.isArray(roles) ? roles.join(',') : roles;
    return db.prepare(`
      UPDATE indicators SET name = ?, description = ?, roles = ?
      WHERE id = ?
    `).run(name, description || '', rolesStr, id);
  }

  static delete(id) {
    // Delete associated configs and notes first
    db.prepare('DELETE FROM user_indicator_config WHERE indicator_id = ?').run(id);
    db.prepare('DELETE FROM notes WHERE indicator_id = ?').run(id);
    return db.prepare('DELETE FROM indicators WHERE id = ?').run(id);
  }

  static getRolesArray(indicator) {
    return indicator.roles ? indicator.roles.split(',') : [];
  }
}

module.exports = Indicator;
