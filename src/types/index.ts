export interface Product {
  id: number;
  name: string;
  unit: string;
  category: 'ไฟฟ้า' | 'Accessory' | 'อิเล็กทรอนิกส์' | 'พลาสติก';
  description: string;
  reorderPoint: number;
}

export interface StockEntry {
  productId: number;
  zone: string;
  quantity: number;
}

export interface TransactionLog {
  id: number;
  type: 'inbound' | 'outbound' | 'transfer';
  productId: number;
  fromZone: string | null;
  toZone: string | null;
  quantity: number;
  timestamp: string;
}

export interface DashboardData {
  totalStock: number;
  zoneAStock: number;
  zoneBStock: number;
  zoneCStock: number;
  totalProducts: number;
  totalTransactions: number;
}
