import SQLite, { SQLiteDatabase, Transaction } from 'react-native-sqlite-storage';
import { Product, StockEntry, TransactionLog, DashboardData } from '../types';

SQLite.enablePromise(true);

class DatabaseService {
  private static instance: DatabaseService;
  private db: SQLiteDatabase | null = null;

  private constructor() {}

  static getInstance(): DatabaseService {
    if (!DatabaseService.instance) {
      DatabaseService.instance = new DatabaseService();
    }
    return DatabaseService.instance;
  }

  // For testing: reset the singleton instance
  static resetInstance(): void {
    DatabaseService.instance = undefined as any;
  }

  async initialize(): Promise<void> {
    this.db = await SQLite.openDatabase({ name: 'wms.db', location: 'default' });
    await this.db.executeSql('PRAGMA foreign_keys = ON');
    await this.createTables();
  }

  private getDb(): SQLiteDatabase {
    if (!this.db) {
      throw new Error('Database not initialized. Call initialize() first.');
    }
    return this.db;
  }

  private async createTables(): Promise<void> {
    const db = this.getDb();

    await db.executeSql(`
      CREATE TABLE IF NOT EXISTS products (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        unit TEXT NOT NULL,
        category TEXT NOT NULL,
        description TEXT DEFAULT '',
        reorderPoint INTEGER NOT NULL DEFAULT 0
      )
    `);

    await db.executeSql(`
      CREATE TABLE IF NOT EXISTS stock (
        productId INTEGER NOT NULL,
        zone TEXT NOT NULL,
        quantity INTEGER NOT NULL DEFAULT 0 CHECK(quantity >= 0),
        PRIMARY KEY (productId, zone),
        FOREIGN KEY (productId) REFERENCES products(id) ON DELETE CASCADE
      )
    `);

    await db.executeSql(`
      CREATE TABLE IF NOT EXISTS logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        type TEXT NOT NULL CHECK(type IN ('inbound', 'outbound', 'transfer')),
        productId INTEGER NOT NULL,
        fromZone TEXT DEFAULT '',
        toZone TEXT DEFAULT '',
        quantity INTEGER NOT NULL,
        timestamp TEXT NOT NULL,
        FOREIGN KEY (productId) REFERENCES products(id)
      )
    `);
  }

  // ========== Product CRUD (Task 2.2) ==========

  async getAllProducts(): Promise<Product[]> {
    const db = this.getDb();
    const [results] = await db.executeSql('SELECT * FROM products ORDER BY id');
    const products: Product[] = [];
    for (let i = 0; i < results.rows.length; i++) {
      products.push(results.rows.item(i));
    }
    return products;
  }

  async addProduct(product: Omit<Product, 'id'>): Promise<number> {
    const db = this.getDb();
    const [result] = await db.executeSql(
      'INSERT INTO products (name, unit, category, description, reorderPoint) VALUES (?, ?, ?, ?, ?)',
      [product.name, product.unit, product.category, product.description || '', product.reorderPoint]
    );
    return result.insertId;
  }

  async updateProduct(product: Product): Promise<void> {
    const db = this.getDb();
    await db.executeSql(
      'UPDATE products SET name = ?, unit = ?, category = ?, description = ?, reorderPoint = ? WHERE id = ?',
      [product.name, product.unit, product.category, product.description || '', product.reorderPoint, product.id]
    );
  }

  async deleteProduct(id: number): Promise<void> {
    const db = this.getDb();
    await db.executeSql('DELETE FROM products WHERE id = ?', [id]);
  }

  // ========== Stock Queries (Task 2.3) ==========

  async getStockByZone(zone: string): Promise<StockEntry[]> {
    const db = this.getDb();
    const [results] = await db.executeSql(
      'SELECT productId, zone, quantity FROM stock WHERE zone = ? AND quantity > 0',
      [zone]
    );
    const entries: StockEntry[] = [];
    for (let i = 0; i < results.rows.length; i++) {
      entries.push(results.rows.item(i));
    }
    return entries;
  }

  async getStockByProduct(productId: number): Promise<StockEntry[]> {
    const db = this.getDb();
    const [results] = await db.executeSql(
      'SELECT productId, zone, quantity FROM stock WHERE productId = ?',
      [productId]
    );
    const entries: StockEntry[] = [];
    for (let i = 0; i < results.rows.length; i++) {
      entries.push(results.rows.item(i));
    }
    return entries;
  }

  async getTotalStockByProduct(productId: number): Promise<number> {
    const db = this.getDb();
    const [results] = await db.executeSql(
      'SELECT COALESCE(SUM(quantity), 0) as total FROM stock WHERE productId = ?',
      [productId]
    );
    return results.rows.item(0).total;
  }

  async getStockQuantity(productId: number, zone: string): Promise<number> {
    const db = this.getDb();
    const [results] = await db.executeSql(
      'SELECT COALESCE(quantity, 0) as quantity FROM stock WHERE productId = ? AND zone = ?',
      [productId, zone]
    );
    if (results.rows.length === 0) {
      return 0;
    }
    return results.rows.item(0).quantity;
  }

  // ========== Transaction Methods (Task 2.3) ==========

  async inbound(productId: number, toZone: string, qty: number): Promise<void> {
    if (qty <= 0) throw new Error('จำนวนต้องมากกว่า 0');

    const db = this.getDb();
    await db.transaction(async (tx: Transaction) => {
      // Upsert stock: insert or update
      tx.executeSql(
        `INSERT INTO stock (productId, zone, quantity) VALUES (?, ?, ?)
         ON CONFLICT(productId, zone) DO UPDATE SET quantity = quantity + ?`,
        [productId, toZone, qty, qty]
      );
      // Log the transaction
      tx.executeSql(
        `INSERT INTO logs (type, productId, fromZone, toZone, quantity, timestamp) VALUES ('inbound', ?, '', ?, ?, ?)`,
        [productId, toZone, qty, new Date().toISOString()]
      );
    });
  }

  async transfer(productId: number, fromZone: string, toZone: string, qty: number): Promise<void> {
    if (qty <= 0) throw new Error('จำนวนต้องมากกว่า 0');
    if (fromZone === toZone) throw new Error('โซนต้นทางและปลายทางต้องไม่ซ้ำกัน');

    const currentStock = await this.getStockQuantity(productId, fromZone);
    if (qty > currentStock) throw new Error('จำนวนเกินสต็อกที่มี');

    const db = this.getDb();
    await db.transaction(async (tx: Transaction) => {
      // Decrease source zone
      tx.executeSql(
        'UPDATE stock SET quantity = quantity - ? WHERE productId = ? AND zone = ?',
        [qty, productId, fromZone]
      );
      // Increase destination zone (upsert)
      tx.executeSql(
        `INSERT INTO stock (productId, zone, quantity) VALUES (?, ?, ?)
         ON CONFLICT(productId, zone) DO UPDATE SET quantity = quantity + ?`,
        [productId, toZone, qty, qty]
      );
      // Log the transaction
      tx.executeSql(
        `INSERT INTO logs (type, productId, fromZone, toZone, quantity, timestamp) VALUES ('transfer', ?, ?, ?, ?, ?)`,
        [productId, fromZone, toZone, qty, new Date().toISOString()]
      );
    });
  }

  async outbound(productId: number, fromZone: string, qty: number): Promise<void> {
    if (qty <= 0) throw new Error('จำนวนต้องมากกว่า 0');

    const currentStock = await this.getStockQuantity(productId, fromZone);
    if (qty > currentStock) throw new Error('จำนวนเกินสต็อกที่มี');

    const db = this.getDb();
    await db.transaction(async (tx: Transaction) => {
      // Decrease stock
      tx.executeSql(
        'UPDATE stock SET quantity = quantity - ? WHERE productId = ? AND zone = ?',
        [qty, productId, fromZone]
      );
      // Log the transaction
      tx.executeSql(
        `INSERT INTO logs (type, productId, fromZone, toZone, quantity, timestamp) VALUES ('outbound', ?, ?, '', ?, ?)`,
        [productId, fromZone, qty, new Date().toISOString()]
      );
    });
  }

  // ========== Dashboard Methods (Task 2.4) ==========

  async getDashboardSummary(): Promise<DashboardData> {
    const db = this.getDb();

    const [totalResult] = await db.executeSql(
      'SELECT COALESCE(SUM(quantity), 0) as total FROM stock'
    );
    const totalStock = totalResult.rows.item(0).total;

    const [zoneAResult] = await db.executeSql(
      `SELECT COALESCE(SUM(quantity), 0) as total FROM stock WHERE zone LIKE 'A%'`
    );
    const zoneAStock = zoneAResult.rows.item(0).total;

    const [zoneBResult] = await db.executeSql(
      `SELECT COALESCE(SUM(quantity), 0) as total FROM stock WHERE zone LIKE 'B%'`
    );
    const zoneBStock = zoneBResult.rows.item(0).total;

    const [zoneCResult] = await db.executeSql(
      `SELECT COALESCE(SUM(quantity), 0) as total FROM stock WHERE zone LIKE 'C%'`
    );
    const zoneCStock = zoneCResult.rows.item(0).total;

    const [productsResult] = await db.executeSql(
      'SELECT COUNT(*) as count FROM products'
    );
    const totalProducts = productsResult.rows.item(0).count;

    const [logsResult] = await db.executeSql(
      'SELECT COUNT(*) as count FROM logs'
    );
    const totalTransactions = logsResult.rows.item(0).count;

    return {
      totalStock,
      zoneAStock,
      zoneBStock,
      zoneCStock,
      totalProducts,
      totalTransactions,
    };
  }

  async getLowStockProducts(): Promise<(Product & { totalStock: number })[]> {
    const db = this.getDb();
    const [results] = await db.executeSql(`
      SELECT p.*, COALESCE(
        (SELECT SUM(s.quantity) FROM stock s WHERE s.productId = p.id), 0
      ) as totalStock
      FROM products p
      WHERE COALESCE(
        (SELECT SUM(s.quantity) FROM stock s WHERE s.productId = p.id), 0
      ) < p.reorderPoint
      AND p.reorderPoint > 0
    `);
    const products: (Product & { totalStock: number })[] = [];
    for (let i = 0; i < results.rows.length; i++) {
      products.push(results.rows.item(i));
    }
    return products;
  }

  async getRecentLogs(limit: number): Promise<(TransactionLog & { productName?: string })[]> {
    const db = this.getDb();
    const [results] = await db.executeSql(
      `SELECT l.*, p.name as productName
       FROM logs l
       LEFT JOIN products p ON l.productId = p.id
       ORDER BY l.id DESC
       LIMIT ?`,
      [limit]
    );
    const logs: (TransactionLog & { productName?: string })[] = [];
    for (let i = 0; i < results.rows.length; i++) {
      logs.push(results.rows.item(i));
    }
    return logs;
  }
}

export default DatabaseService;
export { DatabaseService };
