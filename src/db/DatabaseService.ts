import { open, DB } from '@op-engineering/op-sqlite';
import { Product, StockEntry, TransactionLog, DashboardData } from '../types';

class DatabaseService {
  private static instance: DatabaseService;
  private db: DB | null = null;

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
    this.db = open({ name: 'wms.db' });
    this.db.executeSync('PRAGMA foreign_keys = ON');
    this.createTables();
  }

  private getDb(): DB {
    if (!this.db) {
      throw new Error('Database not initialized. Call initialize() first.');
    }
    return this.db;
  }

  private createTables(): void {
    const db = this.getDb();

    db.executeSync(`
      CREATE TABLE IF NOT EXISTS products (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        unit TEXT NOT NULL,
        category TEXT NOT NULL,
        description TEXT DEFAULT '',
        reorderPoint INTEGER NOT NULL DEFAULT 0
      )
    `);

    db.executeSync(`
      CREATE TABLE IF NOT EXISTS stock (
        productId INTEGER NOT NULL,
        zone TEXT NOT NULL,
        quantity INTEGER NOT NULL DEFAULT 0 CHECK(quantity >= 0),
        PRIMARY KEY (productId, zone),
        FOREIGN KEY (productId) REFERENCES products(id) ON DELETE CASCADE
      )
    `);

    db.executeSync(`
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

  // ========== Product CRUD ==========

  async getAllProducts(): Promise<Product[]> {
    const db = this.getDb();
    const result = db.executeSync('SELECT * FROM products ORDER BY id');
    return (result.rows ?? []) as unknown as Product[];
  }

  async addProduct(product: Omit<Product, 'id'>): Promise<number> {
    const db = this.getDb();
    const result = db.executeSync(
      'INSERT INTO products (name, unit, category, description, reorderPoint) VALUES (?, ?, ?, ?, ?)',
      [product.name, product.unit, product.category, product.description || '', product.reorderPoint]
    );
    return result.insertId ?? 0;
  }

  async updateProduct(product: Product): Promise<void> {
    const db = this.getDb();
    db.executeSync(
      'UPDATE products SET name = ?, unit = ?, category = ?, description = ?, reorderPoint = ? WHERE id = ?',
      [product.name, product.unit, product.category, product.description || '', product.reorderPoint, product.id]
    );
  }

  async deleteProduct(id: number): Promise<void> {
    const db = this.getDb();
    db.executeSync('DELETE FROM products WHERE id = ?', [id]);
  }

  // ========== Stock Queries ==========

  async getStockByZone(zone: string): Promise<StockEntry[]> {
    const db = this.getDb();
    const result = db.executeSync(
      'SELECT productId, zone, quantity FROM stock WHERE zone = ? AND quantity > 0',
      [zone]
    );
    return (result.rows ?? []) as unknown as StockEntry[];
  }

  async getStockByProduct(productId: number): Promise<StockEntry[]> {
    const db = this.getDb();
    const result = db.executeSync(
      'SELECT productId, zone, quantity FROM stock WHERE productId = ?',
      [productId]
    );
    return (result.rows ?? []) as unknown as StockEntry[];
  }

  async getTotalStockByProduct(productId: number): Promise<number> {
    const db = this.getDb();
    const result = db.executeSync(
      'SELECT COALESCE(SUM(quantity), 0) as total FROM stock WHERE productId = ?',
      [productId]
    );
    return (result.rows?.[0] as any)?.total ?? 0;
  }

  async getStockQuantity(productId: number, zone: string): Promise<number> {
    const db = this.getDb();
    const result = db.executeSync(
      'SELECT COALESCE(quantity, 0) as quantity FROM stock WHERE productId = ? AND zone = ?',
      [productId, zone]
    );
    if (!result.rows || result.rows.length === 0) {
      return 0;
    }
    return (result.rows[0] as any).quantity;
  }

  // ========== Transaction Methods ==========

  async inbound(productId: number, toZone: string, qty: number): Promise<void> {
    if (qty <= 0) throw new Error('จำนวนต้องมากกว่า 0');

    const db = this.getDb();
    await db.transaction(async (tx) => {
      await tx.execute(
        `INSERT INTO stock (productId, zone, quantity) VALUES (?, ?, ?)
         ON CONFLICT(productId, zone) DO UPDATE SET quantity = quantity + ?`,
        [productId, toZone, qty, qty]
      );
      await tx.execute(
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
    await db.transaction(async (tx) => {
      await tx.execute(
        'UPDATE stock SET quantity = quantity - ? WHERE productId = ? AND zone = ?',
        [qty, productId, fromZone]
      );
      await tx.execute(
        `INSERT INTO stock (productId, zone, quantity) VALUES (?, ?, ?)
         ON CONFLICT(productId, zone) DO UPDATE SET quantity = quantity + ?`,
        [productId, toZone, qty, qty]
      );
      await tx.execute(
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
    await db.transaction(async (tx) => {
      await tx.execute(
        'UPDATE stock SET quantity = quantity - ? WHERE productId = ? AND zone = ?',
        [qty, productId, fromZone]
      );
      await tx.execute(
        `INSERT INTO logs (type, productId, fromZone, toZone, quantity, timestamp) VALUES ('outbound', ?, ?, '', ?, ?)`,
        [productId, fromZone, qty, new Date().toISOString()]
      );
    });
  }

  // ========== Dashboard Methods ==========

  async getDashboardSummary(): Promise<DashboardData> {
    const db = this.getDb();

    const totalResult = db.executeSync('SELECT COALESCE(SUM(quantity), 0) as total FROM stock');
    const totalStock = (totalResult.rows?.[0] as any)?.total ?? 0;

    const zoneAResult = db.executeSync(`SELECT COALESCE(SUM(quantity), 0) as total FROM stock WHERE zone LIKE 'A%'`);
    const zoneAStock = (zoneAResult.rows?.[0] as any)?.total ?? 0;

    const zoneBResult = db.executeSync(`SELECT COALESCE(SUM(quantity), 0) as total FROM stock WHERE zone LIKE 'B%'`);
    const zoneBStock = (zoneBResult.rows?.[0] as any)?.total ?? 0;

    const zoneCResult = db.executeSync(`SELECT COALESCE(SUM(quantity), 0) as total FROM stock WHERE zone LIKE 'C%'`);
    const zoneCStock = (zoneCResult.rows?.[0] as any)?.total ?? 0;

    const productsResult = db.executeSync('SELECT COUNT(*) as count FROM products');
    const totalProducts = (productsResult.rows?.[0] as any)?.count ?? 0;

    const logsResult = db.executeSync('SELECT COUNT(*) as count FROM logs');
    const totalTransactions = (logsResult.rows?.[0] as any)?.count ?? 0;

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
    const result = db.executeSync(`
      SELECT p.*, COALESCE(
        (SELECT SUM(s.quantity) FROM stock s WHERE s.productId = p.id), 0
      ) as totalStock
      FROM products p
      WHERE COALESCE(
        (SELECT SUM(s.quantity) FROM stock s WHERE s.productId = p.id), 0
      ) < p.reorderPoint
      AND p.reorderPoint > 0
    `);
    return (result.rows ?? []) as unknown as (Product & { totalStock: number })[];
  }

  async getRecentLogs(limit: number): Promise<(TransactionLog & { productName?: string })[]> {
    const db = this.getDb();
    const result = db.executeSync(
      `SELECT l.*, p.name as productName
       FROM logs l
       LEFT JOIN products p ON l.productId = p.id
       ORDER BY l.id DESC
       LIMIT ?`,
      [limit]
    );
    return (result.rows ?? []) as unknown as (TransactionLog & { productName?: string })[];
  }
}

export default DatabaseService;
export { DatabaseService };
