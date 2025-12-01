const { describe, it, before, after } = require('node:test');
const assert = require('node:assert');
const path = require('path');
const fs = require('fs');

// Set test database path
process.env.DB_PATH = path.join(__dirname, 'test.db');

// Clean up test database before tests
const testDbPath = process.env.DB_PATH;
if (fs.existsSync(testDbPath)) {
  fs.unlinkSync(testDbPath);
}

const db = require('../src/models/database');
const User = require('../src/models/user');
const Indicator = require('../src/models/indicator');
const Note = require('../src/models/note');
const UserIndicatorConfig = require('../src/models/userIndicatorConfig');
const Calculation = require('../src/models/calculation');

describe('VDD BDO - Model Tests', () => {
  before(() => {
    db.initialize();
  });

  after(() => {
    // Clean up test database
    if (fs.existsSync(testDbPath)) {
      fs.unlinkSync(testDbPath);
    }
    const walPath = testDbPath + '-wal';
    const shmPath = testDbPath + '-shm';
    if (fs.existsSync(walPath)) fs.unlinkSync(walPath);
    if (fs.existsSync(shmPath)) fs.unlinkSync(shmPath);
  });

  describe('User Model', () => {
    it('should have default admin user', () => {
      const admin = User.getByUsername('admin');
      assert.ok(admin, 'Admin user should exist');
      assert.strictEqual(admin.role, 'admin');
    });

    it('should create a new user', () => {
      const userId = User.create({
        username: 'analyst1',
        password: 'test123',
        name: 'Test Analyst',
        role: 'analyst'
      });
      assert.ok(userId > 0, 'Should return user ID');

      const user = User.getById(userId);
      assert.strictEqual(user.username, 'analyst1');
      assert.strictEqual(user.role, 'analyst');
    });

    it('should authenticate user correctly', () => {
      const user = User.authenticate('analyst1', 'test123');
      assert.ok(user, 'Should authenticate successfully');
      assert.strictEqual(user.username, 'analyst1');

      const wrongPass = User.authenticate('analyst1', 'wrongpass');
      assert.strictEqual(wrongPass, null, 'Should fail with wrong password');
    });

    it('should update user', () => {
      const user = User.getByUsername('analyst1');
      User.update(user.id, {
        username: 'analyst1',
        name: 'Updated Analyst',
        role: 'analyst'
      });

      const updated = User.getById(user.id);
      assert.strictEqual(updated.name, 'Updated Analyst');
    });
  });

  describe('Indicator Model', () => {
    it('should create a new indicator', () => {
      const indicatorId = Indicator.create({
        name: 'Test Indicator',
        description: 'Test Description',
        roles: ['analyst', 'coordinator']
      });
      assert.ok(indicatorId > 0, 'Should return indicator ID');

      const indicator = Indicator.getById(indicatorId);
      assert.strictEqual(indicator.name, 'Test Indicator');
      assert.ok(indicator.roles.includes('analyst'));
    });

    it('should get indicators by role', () => {
      Indicator.create({
        name: 'Analyst Only',
        description: '',
        roles: ['analyst']
      });

      const analystIndicators = Indicator.getByRole('analyst');
      assert.ok(analystIndicators.length >= 1, 'Should find analyst indicators');

      const leaderIndicators = Indicator.getByRole('leader');
      assert.strictEqual(leaderIndicators.length, 0, 'Should not find leader indicators');
    });
  });

  describe('Note Model', () => {
    let testUserId;
    let testIndicatorId;

    before(() => {
      testUserId = User.create({
        username: 'noteuser',
        password: 'test123',
        name: 'Note Test User',
        role: 'analyst'
      });

      testIndicatorId = Indicator.create({
        name: 'Note Test Indicator',
        description: '',
        roles: ['analyst']
      });
    });

    it('should create and update notes', () => {
      const noteId = Note.create({
        user_id: testUserId,
        indicator_id: testIndicatorId,
        value: 85.5
      });
      assert.ok(noteId > 0, 'Should return note ID');

      const note = Note.getByUserIdAndIndicatorId(testUserId, testIndicatorId);
      assert.strictEqual(note.value, 85.5);

      Note.update(testUserId, testIndicatorId, 90);
      const updated = Note.getByUserIdAndIndicatorId(testUserId, testIndicatorId);
      assert.strictEqual(updated.value, 90);
    });

    it('should upsert notes', () => {
      Note.upsert(testUserId, testIndicatorId, 95);
      const note = Note.getByUserIdAndIndicatorId(testUserId, testIndicatorId);
      assert.strictEqual(note.value, 95);
    });
  });

  describe('UserIndicatorConfig Model', () => {
    let testUserId;
    let testIndicatorId;

    before(() => {
      testUserId = User.create({
        username: 'configuser',
        password: 'test123',
        name: 'Config Test User',
        role: 'analyst'
      });

      testIndicatorId = Indicator.create({
        name: 'Config Test Indicator',
        description: '',
        roles: ['analyst']
      });
    });

    it('should create and update config', () => {
      const configId = UserIndicatorConfig.create({
        user_id: testUserId,
        indicator_id: testIndicatorId,
        percentage: 50,
        global_value: null
      });
      assert.ok(configId > 0, 'Should return config ID');

      const config = UserIndicatorConfig.getByUserAndIndicator(testUserId, testIndicatorId);
      assert.strictEqual(config.percentage, 50);

      UserIndicatorConfig.update(testUserId, testIndicatorId, {
        percentage: 75,
        global_value: 100
      });

      const updated = UserIndicatorConfig.getByUserAndIndicator(testUserId, testIndicatorId);
      assert.strictEqual(updated.percentage, 75);
      assert.strictEqual(updated.global_value, 100);
    });
  });

  describe('Calculation Model', () => {
    let analystId;
    let indicatorId1;
    let indicatorId2;

    before(() => {
      // Create analyst
      analystId = User.create({
        username: 'calcanalyst',
        password: 'test123',
        name: 'Calc Analyst',
        role: 'analyst'
      });

      // Create indicators
      indicatorId1 = Indicator.create({
        name: 'Calc Indicator 1',
        description: '',
        roles: ['analyst']
      });

      indicatorId2 = Indicator.create({
        name: 'Calc Indicator 2',
        description: '',
        roles: ['analyst']
      });

      // Create configs
      UserIndicatorConfig.create({
        user_id: analystId,
        indicator_id: indicatorId1,
        percentage: 60,
        global_value: null
      });

      UserIndicatorConfig.create({
        user_id: analystId,
        indicator_id: indicatorId2,
        percentage: 40,
        global_value: null
      });

      // Create notes
      Note.create({
        user_id: analystId,
        indicator_id: indicatorId1,
        value: 80
      });

      Note.create({
        user_id: analystId,
        indicator_id: indicatorId2,
        value: 90
      });
    });

    it('should calculate analyst score correctly', () => {
      const result = Calculation.calculateForUser(analystId);
      
      // Expected: (80 * 0.6) + (90 * 0.4) = 48 + 36 = 84
      assert.ok(result, 'Should return calculation result');
      assert.strictEqual(result.finalScore, 84);
      assert.strictEqual(result.totalPercentage, 100);
      assert.strictEqual(result.details.length, 2);
    });

    it('should use global value when set', () => {
      // Set global value for indicator 1
      UserIndicatorConfig.update(analystId, indicatorId1, {
        percentage: 60,
        global_value: 100
      });

      const result = Calculation.calculateForUser(analystId);
      
      // Expected: (100 * 0.6) + (90 * 0.4) = 60 + 36 = 96
      assert.strictEqual(result.finalScore, 96);
      
      // Check that global value was used
      const detail1 = result.details.find(d => d.indicator_id === indicatorId1);
      assert.strictEqual(detail1.used_global, true);
      assert.strictEqual(detail1.value, 100);
    });
  });
});
