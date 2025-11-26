
import { GroupOrder, OrderItem, SavedShop, ShopInfo } from "../types";

// 優先使用環境變數設定的後端網址 (Config)，若未設定則使用 LocalStorage 中的設定 (前端設定)
const CONFIG_BACKEND_URL = process.env.BACKEND_URL;
let BACKEND_URL = CONFIG_BACKEND_URL || localStorage.getItem('bento_buddy_api_url') || '';

export const setBackendUrl = (url: string) => {
  BACKEND_URL = url;
  if (url) {
    localStorage.setItem('bento_buddy_api_url', url);
  } else {
    localStorage.removeItem('bento_buddy_api_url');
  }
};

export const getBackendUrl = () => BACKEND_URL;

const STORAGE_KEY_PREFIX_ORDER = 'bento_buddy_order_';
const STORAGE_KEY_PREFIX_SHOP = 'bento_buddy_shop_';

// --- Shops ---

export const saveShop = async (shop: SavedShop): Promise<void> => {
  if (BACKEND_URL) {
    try {
      await fetch(BACKEND_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ action: 'create', data: shop }) // create acts as upsert usually
      });
      return;
    } catch (e) {
      console.error("API Call failed, saving to local storage instead", e);
      // Fall through to local storage
    }
  }
  // LocalStorage
  localStorage.setItem(`${STORAGE_KEY_PREFIX_SHOP}${shop.id}`, JSON.stringify(shop));
};

export const deleteShop = async (shopId: string): Promise<void> => {
  if (BACKEND_URL) {
    try {
      await fetch(BACKEND_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ action: 'deleteShop', id: shopId })
      });
      return;
    } catch (e) {
      console.error("API Call failed, deleting from local storage instead", e);
    }
  }
  // LocalStorage
  localStorage.removeItem(`${STORAGE_KEY_PREFIX_SHOP}${shopId}`);
};

export const listShops = async (): Promise<SavedShop[]> => {
  if (BACKEND_URL) {
    try {
      const res = await fetch(`${BACKEND_URL}?action=list`);
      const data = await res.json();
      if (Array.isArray(data)) {
        return data.filter((item: any) => 
          item.dataType === 'shop' || (!item.orders && !item.status && item.items)
        ).map((item: any) => ({...item, dataType: 'shop'}));
      }
    } catch (e) {
      console.error("API Call failed, loading from local storage instead", e);
      // Fall through to local storage
    }
  }

  // LocalStorage
  const shops: SavedShop[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith(STORAGE_KEY_PREFIX_SHOP)) {
      try {
        const item = localStorage.getItem(key);
        if (item) {
          const parsed = JSON.parse(item);
          shops.push({ ...parsed, dataType: 'shop' });
        }
      } catch (e) {
        console.warn("Failed to parse shop", key);
      }
    }
  }
  return shops;
};

// --- Orders ---

export const createOrder = async (order: GroupOrder): Promise<void> => {
  const orderWithType = { ...order, dataType: 'order' };
  if (BACKEND_URL) {
    try {
      await fetch(BACKEND_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ action: 'create', data: orderWithType })
      });
      return;
    } catch (e) {
      console.error("API Call failed, saving to local storage instead", e);
      // Fall through to local storage
    }
  }
  // Fallback to LocalStorage
  localStorage.setItem(`${STORAGE_KEY_PREFIX_ORDER}${order.id}`, JSON.stringify(orderWithType));
};

export const updateOrder = async (order: GroupOrder): Promise<void> => {
  const orderWithType = { ...order, dataType: 'order' };
  if (BACKEND_URL) {
    try {
      await fetch(BACKEND_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ action: 'update', data: orderWithType })
      });
      return;
    } catch (e) {
      console.error("API Call failed, updating in local storage instead", e);
      // Fall through to local storage
    }
  }
  // Fallback to LocalStorage
  localStorage.setItem(`${STORAGE_KEY_PREFIX_ORDER}${order.id}`, JSON.stringify(orderWithType));
};

export const getOrder = async (orderId: string): Promise<GroupOrder | null> => {
  if (BACKEND_URL) {
    try {
      const res = await fetch(`${BACKEND_URL}?action=get&id=${orderId}`);
      if (res.ok) {
        const data = await res.json();
        if (data) return data;
      }
    } catch (e) {
      console.error("API Call failed, trying local storage", e);
      // Fall through to local storage
    }
  }
  // Fallback to LocalStorage
  const data = localStorage.getItem(`${STORAGE_KEY_PREFIX_ORDER}${orderId}`);
  return data ? JSON.parse(data) : null;
};

export const listOrders = async (): Promise<GroupOrder[]> => {
  if (BACKEND_URL) {
    try {
      const res = await fetch(`${BACKEND_URL}?action=list`);
      const data = await res.json();
      if (Array.isArray(data)) {
        return data.filter((item: any) => 
          (item.dataType === 'order' || (item.status && item.orders)) && 
          item.status !== 'archived'
        ).sort((a: any, b: any) => b.createdAt - a.createdAt);
      }
    } catch (e) {
      console.error("API Call failed, listing from local storage instead", e);
      // Fall through to local storage
    }
  }

  // Fallback to LocalStorage
  const orders: GroupOrder[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith(STORAGE_KEY_PREFIX_ORDER)) {
      try {
        const item = localStorage.getItem(key);
        if (item) {
          const parsed = JSON.parse(item);
          // Only show non-archived orders
          if (parsed.status !== 'archived') {
            orders.push(parsed);
          }
        }
      } catch (e) {
        console.warn("Failed to parse order", key);
      }
    }
  }
  return orders.sort((a, b) => b.createdAt - a.createdAt);
};

export const addOrderItem = async (orderId: string, item: OrderItem): Promise<GroupOrder | null> => {
  if (BACKEND_URL) {
    try {
      const res = await fetch(BACKEND_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ action: 'addItem', orderId, item })
      });
      return await res.json();
    } catch (e) {
      console.error("API Call failed, saving item to local storage instead", e);
      // Fall through to local storage
    }
  }
  
  // Fallback to LocalStorage
  const order = await getOrder(orderId);
  if (!order) return null;

  order.orders.push(item);
  localStorage.setItem(`${STORAGE_KEY_PREFIX_ORDER}${orderId}`, JSON.stringify(order));
  return order;
};
