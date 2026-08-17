jest.mock('react-native-sqlite-storage');

describe('mock test', () => {
  it('should load mock', () => {
    const SQLite = require('react-native-sqlite-storage');
    expect(SQLite.default.enablePromise).toBeDefined();
    SQLite.default.enablePromise(true);
    expect(SQLite.default.openDatabase).toBeDefined();
  });

  it('should load DatabaseService', async () => {
    const { default: DatabaseService } = require('../../src/db/DatabaseService');
    DatabaseService.resetInstance();
    const db = DatabaseService.getInstance();
    await db.initialize();
    expect(db).toBeDefined();
  });
});
