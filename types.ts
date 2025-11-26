
export interface MenuItem {
  id: string;
  name: string;
  price: number;
}

export interface ShopInfo {
  name: string;
  items: MenuItem[];
  address?: string; // 新增：店家地址
  phone?: string;   // 新增：店家電話
}

export interface SavedShop extends ShopInfo {
  id: string;
  dataType: 'shop';
}

export interface OrderItem {
  id: string;
  userName: string;
  menuItemId: string;
  menuItemName: string;
  price: number;
  quantity: number;
  notes?: string;    // 使用者備註 (例如: 不要蔥)
  isPaid?: boolean;  // 付款狀態 (由團主控管)
  timestamp: number;
}

export interface GroupOrder {
  id: string;
  shop: ShopInfo;
  createdAt: number;
  status: 'open' | 'closed' | 'archived';
  orders: OrderItem[];
  hostPassword?: string; // Password for the host to manage the order
  minOrderQuantity?: number; // 新增：最少成團份數
  minOrderAmount?: number;   // 新增：最少成團金額
  dataType?: 'order'; // Optional for backward compatibility
}

// For the Gemini Response
export interface ParsedMenu {
  shopName: string;
  address?: string;
  phone?: string;
  items: { name: string; price: number }[];
}