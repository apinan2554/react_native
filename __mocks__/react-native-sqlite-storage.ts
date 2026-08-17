/**
 * Manual mock for react-native-sqlite-storage
 */

interface MockRow { [key: string]: any; }
interface MockTable { columns: string[]; rows: MockRow[]; autoIncrement: number; }

let tables: Record<string, MockTable> = {};
let foreignKeysEnabled = false;

function __resetMockDatabase() {
  tables = {};
  foreignKeysEnabled = false;
}

function __getMockTables() {
  return tables;
}

function parseInsert(sql: string, params: any[]): any {
  const n = sql.replace(/\s+/g, ' ').trim();
  const onConflict = n.match(/INSERT\s+INTO\s+(\w+)\s*\(([^)]+)\)\s*VALUES\s*\(([^)]+)\)\s*ON\s+CONFLICT/i);
  if (onConflict) {
    const tbl = onConflict[1];
    const cols = onConflict[2].split(',').map(c => c.trim());
    const table = tables[tbl];
    if (!table) throw new Error(`No table: ${tbl}`);
    const values: Record<string, any> = {};
    cols.forEach((col, i) => { values[col] = params[i]; });
    const idx = table.rows.findIndex(r => r.productId === values.productId && r.zone === values.zone);
    if (idx >= 0) {
      table.rows[idx].quantity += params[params.length - 1];
      return { insertId: 0, rowsAffected: 1 };
    }
    table.rows.push({ ...values });
    return { insertId: 0, rowsAffected: 1 };
  }
  const ins = n.match(/INSERT\s+INTO\s+(\w+)\s*\(([^)]+)\)\s*VALUES\s*\(([^)]+)\)/i);
  if (!ins) throw new Error(`Cannot parse INSERT: ${sql}`);
  const tbl = ins[1];
  const cols = ins[2].split(',').map(c => c.trim());
  const table = tables[tbl];
  if (!table) throw new Error(`No table: ${tbl}`);
  const row: MockRow = {};
  cols.forEach((col, i) => { row[col] = params[i]; });
  if (!row.id && table.columns.includes('id')) { table.autoIncrement += 1; row.id = table.autoIncrement; }
  table.rows.push(row);
  return { insertId: row.id || 0, rowsAffected: 1 };
}

function matchWhere(row: MockRow, where: string, params: any[]): boolean {
  const conds = where.split(/\s+AND\s+/i);
  let pi = 0;
  for (const c of conds) {
    const m = c.trim().match(/(\w+)\s*=\s*\?/);
    if (m) { if (row[m[1]] !== params[pi]) return false; pi++; }
  }
  return true;
}

function applySet(row: MockRow, set: string, params: any[]): void {
  const assigns = set.split(',').map(s => s.trim());
  let pi = 0;
  for (const a of assigns) {
    const expr = a.match(/(\w+)\s*=\s*(\w+)\s*([+-])\s*\?/);
    if (expr) { const v = params[pi++]; row[expr[1]] = expr[3] === '-' ? row[expr[1]] - v : row[expr[1]] + v; }
    else { const s = a.match(/(\w+)\s*=\s*\?/); if (s) row[s[1]] = params[pi++]; }
  }
}

function parseUpdate(sql: string, params: any[]): any {
  const n = sql.replace(/\s+/g, ' ').trim();
  const m = n.match(/UPDATE\s+(\w+)\s+SET\s+(.+)\s+WHERE\s+(.+)/i);
  if (!m) throw new Error(`Cannot parse UPDATE: ${sql}`);
  const table = tables[m[1]];
  if (!table) throw new Error(`No table: ${m[1]}`);
  const setC = m[2].trim(); const whereC = m[3].trim();
  const sc = (setC.match(/\?/g) || []).length;
  const sp = params.slice(0, sc); const wp = params.slice(sc);
  let affected = 0;
  table.rows.forEach(row => { if (matchWhere(row, whereC, wp)) { applySet(row, setC, sp); affected++; } });
  return { rowsAffected: affected };
}

function parseDelete(sql: string, params: any[]): any {
  const n = sql.replace(/\s+/g, ' ').trim();
  const m = n.match(/DELETE\s+FROM\s+(\w+)(?:\s+WHERE\s+(.+))?/i);
  if (!m) throw new Error(`Cannot parse DELETE: ${sql}`);
  const table = tables[m[1]];
  if (!table) throw new Error(`No table: ${m[1]}`);
  if (!m[2]) { const c = table.rows.length; table.rows = []; return { rowsAffected: c }; }
  const before = table.rows.length;
  const deleted = table.rows.filter(r => matchWhere(r, m[2], params));
  table.rows = table.rows.filter(r => !matchWhere(r, m[2], params));
  if (foreignKeysEnabled && m[1] === 'products' && tables.stock) {
    const ids = deleted.map(r => r.id);
    tables.stock.rows = tables.stock.rows.filter(r => !ids.includes(r.productId));
  }
  return { rowsAffected: before - table.rows.length };
}

function parseSelect(sql: string, params: any[]): MockRow[] {
  const n = sql.replace(/\s+/g, ' ').trim();
  if (/SELECT\s+COUNT\(\*\)\s+as\s+count\s+FROM\s+(\w+)/i.test(n)) {
    const m = n.match(/FROM\s+(\w+)/i); return [{ count: tables[m![1]]?.rows.length || 0 }];
  }
  if (/SUM\(quantity\).*FROM\s+stock\s+WHERE\s+zone\s+LIKE/i.test(n)) {
    const pfx = (params[0] as string).replace('%', ''); const t = tables.stock;
    if (!t) return [{ total: 0 }];
    return [{ total: t.rows.filter(r => (r.zone as string).startsWith(pfx)).reduce((s, r) => s + r.quantity, 0) }];
  }
  if (/SUM\(quantity\).*FROM\s+stock$/i.test(n)) {
    const t = tables.stock; return [{ total: t ? t.rows.reduce((s, r) => s + r.quantity, 0) : 0 }];
  }
  if (/SUM\(quantity\).*FROM\s+stock\s+WHERE\s+productId/i.test(n)) {
    const t = tables.stock; if (!t) return [{ total: 0 }];
    return [{ total: t.rows.filter(r => r.productId === params[0]).reduce((s, r) => s + r.quantity, 0) }];
  }
  if (/COALESCE\(quantity.*FROM\s+stock\s+WHERE\s+productId\s*=\s*\?\s+AND\s+zone/i.test(n)) {
    const t = tables.stock; if (!t) return [];
    const row = t.rows.find(r => r.productId === params[0] && r.zone === params[1]);
    return row ? [{ quantity: row.quantity }] : [];
  }
  if (/FROM\s+stock\s+WHERE\s+zone\s*=\s*\?\s+AND\s+quantity\s*>\s*0/i.test(n)) {
    const t = tables.stock; if (!t) return [];
    return t.rows.filter(r => r.zone === params[0] && r.quantity > 0);
  }
  if (/FROM\s+stock\s+WHERE\s+productId\s*=\s*\?/i.test(n)) {
    const t = tables.stock; if (!t) return [];
    return t.rows.filter(r => r.productId === params[0]);
  }
  if (/SELECT\s+\*\s+FROM\s+products\s+ORDER/i.test(n)) {
    const t = tables.products; if (!t) return [];
    return [...t.rows].sort((a, b) => a.id - b.id);
  }
  if (/FROM\s+logs\s+l\s+LEFT\s+JOIN/i.test(n)) {
    const lt = tables.logs; const pt = tables.products; if (!lt) return [];
    const lim = params[0] || 10;
    return [...lt.rows].sort((a, b) => b.id - a.id).slice(0, lim).map(log => {
      const p = pt?.rows.find(x => x.id === log.productId);
      return { ...log, productName: p?.name || undefined };
    });
  }
  if (/FROM\s+products\s+p\s+WHERE\s+COALESCE/i.test(n)) {
    const pt = tables.products; const st = tables.stock; if (!pt) return [];
    return pt.rows
      .filter(p => { if (p.reorderPoint <= 0) return false; const tot = st ? st.rows.filter(s => s.productId === p.id).reduce((sum, s) => sum + s.quantity, 0) : 0; return tot < p.reorderPoint; })
      .map(p => { const tot = st ? st.rows.filter(s => s.productId === p.id).reduce((sum, s) => sum + s.quantity, 0) : 0; return { ...p, totalStock: tot }; });
  }
  return [];
}

function executeSqlImpl(sql: string, params: any[] = []): any {
  const n = sql.replace(/\s+/g, ' ').trim();
  if (/^PRAGMA/i.test(n)) { if (/foreign_keys\s*=\s*ON/i.test(n)) foreignKeysEnabled = true; return [{ rows: { length: 0, item: () => null } }]; }
  if (/^CREATE TABLE/i.test(n)) {
    const m = n.match(/CREATE TABLE IF NOT EXISTS (\w+)/i);
    if (m && !tables[m[1]]) {
      tables[m[1]] = { columns: [], rows: [], autoIncrement: 0 };
      const cs = n.match(/\((.+)\)/s);
      if (cs) { tables[m[1]].columns = cs[1].split(',').map(c => c.trim().split(/\s+/)[0]).filter(c => !['PRIMARY', 'FOREIGN', 'CHECK', 'UNIQUE'].includes(c.toUpperCase())); }
    }
    return [{ rows: { length: 0, item: () => null } }];
  }
  if (/^INSERT/i.test(n)) { const r = parseInsert(n, params); return [{ ...r, rows: { length: 0, item: () => null } }]; }
  if (/^UPDATE/i.test(n)) { const r = parseUpdate(n, params); return [{ ...r, rows: { length: 0, item: () => null } }]; }
  if (/^DELETE/i.test(n)) { const r = parseDelete(n, params); return [{ ...r, rows: { length: 0, item: () => null } }]; }
  if (/^SELECT/i.test(n)) { const rows = parseSelect(n, params); return [{ rows: { length: rows.length, item: (i: number) => rows[i] } }]; }
  return [{ rows: { length: 0, item: () => null } }];
}

const mockDb = {
  executeSql: jest.fn((...args: any[]) => Promise.resolve(executeSqlImpl(args[0], args[1] || []))),
  transaction: jest.fn(async (callback: (tx: any) => void) => {
    const tx = { executeSql: (sql: string, params: any[] = []) => { executeSqlImpl(sql, params); } };
    await callback(tx);
  }),
};

const enablePromise = jest.fn();
const openDatabase = jest.fn().mockResolvedValue(mockDb);

module.exports = {
  __esModule: true,
  default: { enablePromise, openDatabase },
  enablePromise,
  openDatabase,
  __resetMockDatabase,
  __getMockTables,
};
