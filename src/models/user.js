const { db } = require('./database');

class User {
  static getAll() {
    return db.prepare('SELECT * FROM users ORDER BY name').all();
  }

  static getById(id) {
    return db.prepare('SELECT * FROM users WHERE id = ?').get(id);
  }

  static getByUsername(username) {
    return db.prepare('SELECT * FROM users WHERE username = ?').get(username);
  }

  static getByRole(role) {
    return db.prepare('SELECT * FROM users WHERE role = ?').all(role);
  }

  static getTeamMembers(leaderId) {
    return db.prepare('SELECT * FROM users WHERE team_leader_id = ?').all(leaderId);
  }

  static create(userData) {
    const { username, password, name, role, team_leader_id } = userData;
    const result = db.prepare(`
      INSERT INTO users (username, password, name, role, team_leader_id)
      VALUES (?, ?, ?, ?, ?)
    `).run(username, password, name, role, team_leader_id || null);
    return result.lastInsertRowid;
  }

  static update(id, userData) {
    const { username, name, role, team_leader_id } = userData;
    return db.prepare(`
      UPDATE users SET username = ?, name = ?, role = ?, team_leader_id = ?
      WHERE id = ?
    `).run(username, name, role, team_leader_id || null, id);
  }

  static updatePassword(id, password) {
    return db.prepare('UPDATE users SET password = ? WHERE id = ?').run(password, id);
  }

  static delete(id) {
    return db.prepare('DELETE FROM users WHERE id = ?').run(id);
  }

  static authenticate(username, password) {
    const user = db.prepare('SELECT * FROM users WHERE username = ? AND password = ?').get(username, password);
    return user || null;
  }

  static getAllWithTeamInfo() {
    return db.prepare(`
      SELECT u.*, l.name as leader_name 
      FROM users u 
      LEFT JOIN users l ON u.team_leader_id = l.id 
      ORDER BY u.name
    `).all();
  }

  static getCoordinators() {
    return db.prepare("SELECT * FROM users WHERE role = 'coordinator'").all();
  }

  static getLeaders() {
    return db.prepare("SELECT * FROM users WHERE role = 'leader'").all();
  }
}

module.exports = User;
