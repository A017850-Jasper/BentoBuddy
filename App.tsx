import React, { useState, useEffect, useRef } from 'react';
import { 
  Upload, 
  Loader2, 
  Plus, 
  Share2, 
  UtensilsCrossed, 
  Trash2, 
  QrCode, 
  Copy, 
  CheckCircle2,
  ChefHat,
  Settings,
  X,
  Database,
  AlertCircle,
  Home,
  Keyboard,
  Camera,
  ArrowRight,
  Clock,
  Users,
  Menu,
  Lock,
  Unlock,
  ClipboardList,
  Store,
  Save,
  Search,
  KeyRound,
  LogOut,
  AlertTriangle,
  History,
  Calendar,
  Filter,
  Minus,
  Send,
  MessageSquare,
  DollarSign,
  Check,
  Info,
  MapPin,
  Phone,
  Edit,
  MoreVertical,
  Target,
  Dices,
  Sparkles
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { v4 as uuidv4 } from 'uuid';
import { parseMenuImage } from './services/geminiService';
import { createOrder, getOrder, addOrderItem, setBackendUrl, getBackendUrl, listOrders, updateOrder, saveShop, listShops, deleteShop } from './services/db';
import { MenuItem, GroupOrder, OrderItem, ShopInfo, SavedShop } from './types';

// --- Constants ---
const GAS_SCRIPT_CODE = `
// COPY THIS CODE INTO script.google.com

function doGet(e) {
  var lock = LockService.getScriptLock();
  lock.tryLock(10000);
  
  try {
    var action = e.parameter.action;
    var id = e.parameter.id;
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
    var rows = sheet.getDataRange().getValues();
    
    if (action === 'get') {
      var row = rows.find(function(r) { return r[0] === id; });
      if (row && row[1]) {
        return ContentService.createTextOutput(row[1]).setMimeType(ContentService.MimeType.JSON);
      }
      return ContentService.createTextOutput('null').setMimeType(ContentService.MimeType.JSON);
    }

    if (action === 'list') {
      var items = [];
      for (var i = 0; i < rows.length; i++) {
        try {
          // We skip empty rows or header if any
          if(rows[i][1]) {
            var data = JSON.parse(rows[i][1]);
            items.push(data);
          }
        } catch (e) { }
      }
      return ContentService.createTextOutput(JSON.stringify(items)).setMimeType(ContentService.MimeType.JSON);
    }

    return ContentService.createTextOutput('{"error": "Invalid action"}').setMimeType(ContentService.MimeType.JSON);
  } finally {
    lock.releaseLock();
  }
}

function doPost(e) {
  var lock = LockService.getScriptLock();
  lock.tryLock(10000);

  try {
    var body = JSON.parse(e.postData.contents);
    var action = body.action;
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
    var rows = sheet.getDataRange().getValues();

    if (action === 'create') {
      // Check if ID exists (upsert)
      var found = false;
      for (var i = 0; i < rows.length; i++) {
        if (rows[i][0] === body.data.id) {
           sheet.getRange(i + 1, 2).setValue(JSON.stringify(body.data));
           found = true;
           break;
        }
      }
      if (!found) {
        var dataStr = JSON.stringify(body.data);
        sheet.appendRow([body.data.id, dataStr]);
      }
      return ContentService.createTextOutput('ok').setMimeType(ContentService.MimeType.TEXT);
    }

    if (action === 'update') {
      for (var i = 0; i < rows.length; i++) {
        if (rows[i][0] === body.data.id) {
          sheet.getRange(i + 1, 2).setValue(JSON.stringify(body.data));
          return ContentService.createTextOutput('ok').setMimeType(ContentService.MimeType.TEXT);
        }
      }
      return ContentService.createTextOutput('not found').setMimeType(ContentService.MimeType.TEXT);
    }
    
    if (action === 'deleteShop') {
      for (var i = 0; i < rows.length; i++) {
        if (rows[i][0] === body.id) {
          sheet.deleteRow(i + 1);
          return ContentService.createTextOutput('ok').setMimeType(ContentService.MimeType.TEXT);
        }
      }
      return ContentService.createTextOutput('not found').setMimeType(ContentService.MimeType.TEXT);
    }
    
    if (action === 'addItem') {
      var rowIndex = -1;
      for (var i = 0; i < rows.length; i++) {
        if (rows[i][0] === body.orderId) {
          rowIndex = i;
          break;
        }
      }
      
      if (rowIndex >= 0) {
        var currentOrder = JSON.parse(rows[rowIndex][1]);
        if (!currentOrder.orders) currentOrder.orders = [];
        currentOrder.orders.push(body.item);
        var updatedJson = JSON.stringify(currentOrder);
        sheet.getRange(rowIndex + 1, 2).setValue(updatedJson);
        return ContentService.createTextOutput(updatedJson).setMimeType(ContentService.MimeType.JSON);
      }
    }
    return ContentService.createTextOutput('error').setMimeType(ContentService.MimeType.TEXT);
  } catch (err) {
    return ContentService.createTextOutput('error: ' + err.toString()).setMimeType(ContentService.MimeType.TEXT);
  } finally {
    lock.releaseLock();
  }
}
`;

// --- Components ---

const Header = ({ 
  onOpenSettings, 
  goHome, 
  goToCreate,
  goToHistory,
  goToShops,
  showSettingsBtn
}: { 
  onOpenSettings: () => void, 
  goHome: () => void, 
  goToCreate: () => void,
  goToHistory: () => void,
  goToShops: () => void,
  showSettingsBtn: boolean
}) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const handleNav = (action: () => void) => {
    action();
    setIsMobileMenuOpen(false);
  };

  return (
    <header className="bg-white border-b border-brand-100 sticky top-0 z-50 shadow-sm">
      <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
        <div className="flex items-center gap-2 text-brand-600 cursor-pointer hover:opacity-80 transition-opacity" onClick={() => handleNav(goHome)}>
          <ChefHat size={32} />
          <div className="flex flex-col">
            <span className="font-bold text-xl leading-none">BentoBuddy</span>
            <span className="text-xs text-brand-400 font-medium">AI 訂便當神器</span>
          </div>
        </div>
        
        {/* Desktop Nav */}
        <nav className="hidden md:flex items-center gap-1">
          <button 
            onClick={goHome}
            className="px-4 py-2 rounded-lg font-medium text-gray-600 hover:bg-brand-50 hover:text-brand-700 transition-colors flex items-center gap-2"
          >
            <Home size={18} /> 所有訂單
          </button>
          <button 
            onClick={goToHistory}
            className="px-4 py-2 rounded-lg font-medium text-gray-600 hover:bg-brand-50 hover:text-brand-700 transition-colors flex items-center gap-2"
          >
            <History size={18} /> 歷史紀錄
          </button>
          <button 
            onClick={goToShops}
            className="px-4 py-2 rounded-lg font-medium text-gray-600 hover:bg-brand-50 hover:text-brand-700 transition-colors flex items-center gap-2"
          >
            <Store size={18} /> 店家管理
          </button>
          <button 
            onClick={goToCreate}
            className="px-4 py-2 rounded-lg font-medium text-gray-600 hover:bg-brand-50 hover:text-brand-700 transition-colors flex items-center gap-2"
          >
            <Plus size={18} /> 我要開團
          </button>
          {showSettingsBtn && (
            <button 
              onClick={onOpenSettings}
              className="px-4 py-2 rounded-lg font-medium text-gray-600 hover:bg-gray-100 transition-colors flex items-center gap-2 animate-in fade-in"
            >
              <Settings size={18} /> 設定
            </button>
          )}
        </nav>

        {/* Mobile Nav Toggle */}
        <div className="md:hidden flex items-center">
          <button 
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} 
            className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg"
          >
            {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </div>

      {/* Mobile Dropdown Menu */}
      {isMobileMenuOpen && (
        <div className="md:hidden absolute top-16 left-0 w-full bg-white border-b border-gray-100 shadow-xl z-40 animate-in slide-in-from-top-2">
          <nav className="flex flex-col p-4 space-y-2">
            <button 
              onClick={() => handleNav(goHome)}
              className="px-4 py-3 rounded-xl font-medium text-gray-600 hover:bg-brand-50 hover:text-brand-700 transition-colors flex items-center gap-3 bg-gray-50/50"
            >
              <div className="bg-white p-2 rounded-lg shadow-sm text-brand-500"><Home size={20} /></div>
              所有訂單
            </button>
            <button 
              onClick={() => handleNav(goToCreate)}
              className="px-4 py-3 rounded-xl font-medium text-gray-600 hover:bg-brand-50 hover:text-brand-700 transition-colors flex items-center gap-3 bg-gray-50/50"
            >
              <div className="bg-white p-2 rounded-lg shadow-sm text-brand-500"><Plus size={20} /></div>
              我要開團
            </button>
            <button 
              onClick={() => handleNav(goToHistory)}
              className="px-4 py-3 rounded-xl font-medium text-gray-600 hover:bg-brand-50 hover:text-brand-700 transition-colors flex items-center gap-3 bg-gray-50/50"
            >
              <div className="bg-white p-2 rounded-lg shadow-sm text-brand-500"><History size={20} /></div>
              歷史紀錄
            </button>
            <button 
              onClick={() => handleNav(goToShops)}
              className="px-4 py-3 rounded-xl font-medium text-gray-600 hover:bg-brand-50 hover:text-brand-700 transition-colors flex items-center gap-3 bg-gray-50/50"
            >
              <div className="bg-white p-2 rounded-lg shadow-sm text-brand-500"><Store size={20} /></div>
              店家管理
            </button>
            {showSettingsBtn && (
              <button 
                onClick={() => handleNav(onOpenSettings)}
                className="px-4 py-3 rounded-xl font-medium text-gray-600 hover:bg-gray-100 transition-colors flex items-center gap-3 bg-gray-50/50"
              >
                <div className="bg-white p-2 rounded-lg shadow-sm text-gray-500"><Settings size={20} /></div>
                設定
              </button>
            )}
          </nav>
        </div>
      )}
    </header>
  );
};

// --- Custom Modal Component for Confirmation and Alerts ---
const CustomModal = ({ 
  isOpen, 
  type,
  message, 
  onConfirm, 
  onCancel 
}: { 
  isOpen: boolean, 
  type: 'alert' | 'confirm',
  message: string, 
  onConfirm: () => void, 
  onCancel?: () => void 
}) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-xl shadow-xl max-w-sm w-full p-6 scale-100">
        <div className="flex items-center gap-2 mb-3">
          {type === 'confirm' ? (
            <AlertTriangle className="text-orange-500" size={24} />
          ) : (
            <Info className="text-blue-500" size={24} />
          )}
          <h3 className="text-lg font-bold text-gray-900">{type === 'confirm' ? '確認' : '訊息'}</h3>
        </div>
        <p className="text-gray-600 mb-6">{message}</p>
        <div className="flex justify-end gap-3">
          {type === 'confirm' && onCancel && (
            <button 
              onClick={onCancel}
              className="px-4 py-2 rounded-lg text-gray-600 hover:bg-gray-100 font-medium"
            >
              取消
            </button>
          )}
          <button 
            onClick={onConfirm}
            className={`px-4 py-2 rounded-lg font-medium text-white ${type === 'confirm' ? 'bg-red-600 hover:bg-red-700' : 'bg-brand-600 hover:bg-brand-700'}`}
          >
            {type === 'confirm' ? '確定' : '知道了'}
          </button>
        </div>
      </div>
    </div>
  );
};

const SettingsModal = ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) => {
  const [url, setUrl] = useState(getBackendUrl());
  const [showScript, setShowScript] = useState(false);

  const handleSave = () => {
    setBackendUrl(url);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold flex items-center gap-2">
              <Database className="text-brand-600" /> 
              後端設定 (Google Sheets)
            </h2>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
              <X size={24} />
            </button>
          </div>

          <div className="space-y-6">
            <div className="bg-blue-50 p-4 rounded-lg text-sm text-blue-800">
              <h3 className="font-bold mb-2 flex items-center gap-2">
                <AlertCircle size={16} /> 為什麼需要這個？
              </h3>
              <p>BentoBuddy 預設使用瀏覽器儲存資料。若要多人共用，請部署 Google Apps Script 並在此貼上網址。</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Google Apps Script URL</label>
              <input
                type="text"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://script.google.com/macros/s/..."
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none"
              />
            </div>

            <div>
              <button 
                onClick={() => setShowScript(!showScript)}
                className="text-brand-600 font-medium hover:underline text-sm"
              >
                {showScript ? '隱藏部署程式碼' : '顯示部署程式碼'}
              </button>
              
              {showScript && (
                <div className="mt-2 relative">
                  <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg text-xs overflow-x-auto h-64">
                    {GAS_SCRIPT_CODE}
                  </pre>
                  <button 
                    onClick={() => navigator.clipboard.writeText(GAS_SCRIPT_CODE)}
                    className="absolute top-2 right-2 bg-white/10 hover:bg-white/20 text-white p-1.5 rounded"
                    title="Copy Code"
                  >
                    <Copy size={14} />
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className="mt-6 flex justify-end gap-3">
            <button onClick={onClose} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg">取消</button>
            <button 
              onClick={handleSave}
              className="px-4 py-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700"
            >
              儲存設定
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const ShopEditor = ({ 
  initialData, 
  onSave, 
  onCancel 
}: { 
  initialData?: SavedShop, 
  onSave: (shop: SavedShop) => void, 
  onCancel: () => void 
}) => {
  const [name, setName] = useState(initialData?.name || '');
  const [address, setAddress] = useState(initialData?.address || '');
  const [phone, setPhone] = useState(initialData?.phone || '');
  const [items, setItems] = useState<MenuItem[]>(
    initialData?.items || [{ id: uuidv4(), name: '', price: 0 }]
  );

  const addItemRow = () => {
    setItems([...items, { id: uuidv4(), name: '', price: 0 }]);
  };

  const updateItem = (id: string, field: 'name' | 'price', value: string) => {
    setItems(items.map(item => {
      if (item.id === id) {
        return { 
          ...item, 
          [field]: field === 'price' ? (parseInt(value) || 0) : value 
        };
      }
      return item;
    }));
  };

  const removeItem = (id: string) => {
    if (items.length <= 1) return;
    setItems(items.filter(item => item.id !== id));
  };

  const handleSubmit = () => {
    if (!name.trim()) {
      alert("請輸入店家名稱");
      return;
    }
    const validItems = items.filter(i => i.name.trim() !== '');
    if (validItems.length === 0) {
      alert("請至少輸入一個有效的菜單品項");
      return;
    }

    const shop: SavedShop = {
      id: initialData?.id || uuidv4(),
      name: name.trim(),
      address: address.trim(),
      phone: phone.trim(),
      items: validItems,
      dataType: 'shop'
    };
    onSave(shop);
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="p-6 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
        <h3 className="text-xl font-bold text-gray-800">{initialData ? '編輯店家' : '新增店家'}</h3>
        <button onClick={onCancel} className="text-gray-500 hover:text-gray-700">
          <X size={24} />
        </button>
      </div>
      <div className="p-6 space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">店家名稱 <span className="text-red-500">*</span></label>
          <input 
            type="text" 
            value={name} 
            onChange={e => setName(e.target.value)}
            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none"
            placeholder="例如：美味便當"
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">地址</label>
            <input 
              type="text" 
              value={address} 
              onChange={e => setAddress(e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none"
              placeholder="輸入地址"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">電話</label>
            <input 
              type="text" 
              value={phone} 
              onChange={e => setPhone(e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none"
              placeholder="輸入電話"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">菜單品項</label>
          <div className="bg-gray-50 rounded-lg p-4 max-h-[400px] overflow-y-auto overflow-x-hidden [&::-webkit-scrollbar]:hidden" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
            {items.map((item, index) => (
              <div key={item.id} className="flex items-center gap-2 mb-2">
                <span className="text-xs text-gray-400 w-6">{index + 1}.</span>
                <input
                  type="text"
                  placeholder="品項名稱"
                  value={item.name}
                  onChange={(e) => updateItem(item.id, 'name', e.target.value)}
                  className="flex-1 p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none text-sm"
                />
                <input
                  type="number"
                  placeholder="價格"
                  value={item.price || ''}
                  onChange={(e) => updateItem(item.id, 'price', e.target.value)}
                  className="w-24 p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none text-sm text-right"
                />
                <button 
                  onClick={() => removeItem(item.id)}
                  className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                  title="刪除"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            ))}
            <button 
              onClick={addItemRow}
              className="w-full py-2 border-2 border-dashed border-gray-300 rounded-lg text-gray-500 font-medium hover:border-brand-500 hover:text-brand-600 hover:bg-brand-50 transition-all flex items-center justify-center gap-2 mt-2"
            >
              <Plus size={18} /> 新增品項
            </button>
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
           <button onClick={onCancel} className="px-5 py-2.5 rounded-lg text-gray-600 hover:bg-gray-100 font-medium">取消</button>
           <button 
             onClick={handleSubmit}
             className="px-5 py-2.5 rounded-lg font-medium text-white bg-brand-600 hover:bg-brand-700 shadow-md"
           >
             儲存店家
           </button>
        </div>
      </div>
    </div>
  );
};

const ManageShopsPage = ({ goHome }: { goHome: () => void }) => {
  const [shops, setShops] = useState<SavedShop[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [editingShop, setEditingShop] = useState<SavedShop | null>(null);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  
  // Modal State
  const [modalConfig, setModalConfig] = useState<{ 
    isOpen: boolean; 
    type: 'alert' | 'confirm'; 
    message: string; 
    onConfirm: () => void; 
    onCancel?: () => void;
  }>({
    isOpen: false,
    type: 'alert',
    message: '',
    onConfirm: () => {},
  });

  const showConfirm = (msg: string, onYes: () => void) => {
    setModalConfig({
      isOpen: true,
      type: 'confirm',
      message: msg,
      onConfirm: () => {
        onYes();
        setModalConfig(prev => ({ ...prev, isOpen: false }));
      },
      onCancel: () => setModalConfig(prev => ({ ...prev, isOpen: false })),
    });
  };

  useEffect(() => {
    loadShops();
  }, []);

  const loadShops = async () => {
    setLoading(true);
    try {
      const data = await listShops();
      setShops(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    setEditingShop(null);
    setIsEditorOpen(true);
  };

  const handleEdit = (shop: SavedShop) => {
    setEditingShop(shop);
    setIsEditorOpen(true);
  };

  const handleDelete = (shopId: string) => {
    showConfirm("確定要刪除此店家資訊嗎？此操作無法復原。", async () => {
      try {
        await deleteShop(shopId);
        setShops(prev => prev.filter(s => s.id !== shopId));
      } catch (e) {
        alert("刪除失敗");
      }
    });
  };

  const handleSaveShop = async (shop: SavedShop) => {
    try {
      await saveShop(shop);
      setIsEditorOpen(false);
      loadShops(); // Refresh list
    } catch (e) {
      alert("儲存失敗");
    }
  };

  const filteredShops = shops.filter(shop => 
    shop.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (shop.address && shop.address.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (shop.phone && shop.phone.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  if (isEditorOpen) {
    return (
      <main className="max-w-3xl mx-auto p-4 py-8">
        <ShopEditor 
          initialData={editingShop || undefined} 
          onSave={handleSaveShop} 
          onCancel={() => setIsEditorOpen(false)} 
        />
      </main>
    );
  }

  return (
    <main className="max-w-4xl mx-auto p-4 py-8">
      <CustomModal 
        isOpen={modalConfig.isOpen} 
        type={modalConfig.type}
        message={modalConfig.message} 
        onConfirm={modalConfig.onConfirm}
        onCancel={modalConfig.onCancel}
      />

      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <button onClick={goHome} className="text-gray-500 hover:text-brand-600">
            <ArrowRight className="rotate-180" />
          </button>
          <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <Store className="text-brand-600" />
            店家管理
          </h2>
        </div>
        <button 
          onClick={handleCreate}
          className="bg-brand-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-brand-700 shadow-md flex items-center gap-2"
        >
          <Plus size={18} /> 新增店家
        </button>
      </div>

      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-2.5 text-gray-400" size={18} />
          <input 
            type="text" 
            placeholder="搜尋店家名稱、地址或電話..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:border-brand-500 outline-none"
          />
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12">
          <Loader2 className="w-8 h-8 animate-spin mx-auto text-brand-500 mb-2" />
          <p className="text-gray-500">讀取中...</p>
        </div>
      ) : filteredShops.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl shadow-sm border border-dashed border-gray-200">
          <Store className="w-16 h-16 mx-auto text-gray-300 mb-4" />
          <h3 className="text-lg font-medium text-gray-900">
            {searchTerm ? "找不到符合的店家" : "尚無店家資料"}
          </h3>
          {!searchTerm && (
            <button 
              onClick={handleCreate}
              className="mt-4 text-brand-600 font-medium hover:underline"
            >
              立即新增第一間店家 &rarr;
            </button>
          )}
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {filteredShops.map(shop => (
            <div key={shop.id} className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow group">
              <div className="flex justify-between items-start mb-3">
                <div>
                  <h3 className="font-bold text-lg text-gray-900 mb-1">{shop.name}</h3>
                  <div className="text-xs text-gray-500 space-y-1">
                     {shop.address && <p className="flex items-center gap-1"><MapPin size={12} /> {shop.address}</p>}
                     {shop.phone && <p className="flex items-center gap-1"><Phone size={12} /> {shop.phone}</p>}
                  </div>
                </div>
                <div className="flex gap-2 opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity">
                  <button 
                    onClick={() => handleEdit(shop)}
                    className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg"
                    title="編輯"
                  >
                    <Edit size={18} />
                  </button>
                  <button 
                    onClick={() => handleDelete(shop.id)}
                    className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg"
                    title="刪除"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
              <div className="flex justify-between items-end text-sm pt-3 border-t border-gray-50">
                <span className="text-gray-500">{shop.items.length} 個品項</span>
                <span className="text-brand-600 font-medium flex items-center gap-1 text-xs bg-brand-50 px-2 py-1 rounded">
                  <UtensilsCrossed size={12} /> 平均價格: ${Math.round(shop.items.reduce((acc: number, i) => acc + i.price, 0) / (shop.items.length || 1))}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </main>
  );
};

const HistoryPage = ({ goHome }: { goHome: () => void }) => {
  const [orders, setOrders] = useState<GroupOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    return d.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(() => new Date().toISOString().split('T')[0]);

  useEffect(() => {
    loadHistory();
  }, [startDate, endDate]);

  const loadHistory = async () => {
    setLoading(true);
    try {
      const allOrders = await listOrders(); 
      
      const startTs = new Date(startDate).setHours(0, 0, 0, 0);
      const endTs = new Date(endDate).setHours(23, 59, 59, 999);

      const filtered = allOrders.filter(o => {
        return o.createdAt >= startTs && o.createdAt <= endTs;
      });

      setOrders(filtered);
    } catch (e) {
      console.error("Failed to load history", e);
    } finally {
      setLoading(false);
    }
  };

  const getTotalAmount = (order: GroupOrder) => {
    return (order.orders || []).reduce((sum: number, item) => sum + (item.price * item.quantity), 0);
  };

  return (
    <main className="max-w-4xl mx-auto p-4 py-8">
      <div className="flex items-center gap-4 mb-6">
        <button onClick={goHome} className="text-gray-500 hover:text-brand-600">
          <ArrowRight className="rotate-180" />
        </button>
        <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
          <History className="text-brand-600" />
          歷史訂單
        </h2>
      </div>

      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 mb-6 flex flex-wrap gap-4 items-end">
        <div>
          <label className="block text-sm font-medium text-gray-600 mb-1">開始日期</label>
          <input 
            type="date" 
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="border border-gray-300 rounded-lg p-2 text-sm"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-600 mb-1">結束日期</label>
          <input 
            type="date" 
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="border border-gray-300 rounded-lg p-2 text-sm"
          />
        </div>
        <div className="pb-2 text-sm text-gray-500">
          顯示 {startDate} 至 {endDate} 的訂單
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12">
          <Loader2 className="w-8 h-8 animate-spin mx-auto text-brand-500 mb-2" />
          <p className="text-gray-500">讀取歷史紀錄中...</p>
        </div>
      ) : orders.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl shadow-sm">
          <Calendar className="w-16 h-16 mx-auto text-gray-300 mb-4" />
          <h3 className="text-lg font-medium text-gray-900">此區間無訂單</h3>
          <p className="text-gray-500">請嘗試調整日期範圍</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {orders.map(order => (
            <div key={order.id} className={`bg-white p-5 rounded-xl shadow-sm border hover:shadow-md transition-shadow ${order.status === 'closed' ? 'border-gray-200 opacity-80' : 'border-brand-200'}`}>
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="font-bold text-lg text-gray-900 mb-1">{order.shop.name}</h3>
                  <p className="text-sm text-gray-500 flex items-center gap-1">
                    <Clock size={14} />
                    {new Date(order.createdAt).toLocaleString()}
                  </p>
                </div>
                <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                  order.status === 'open' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                }`}>
                  {order.status === 'open' ? '進行中' : '已結單'}
                </span>
              </div>
              
              <div className="flex justify-between items-end text-sm">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-gray-600">
                    <Users size={16} />
                    <span>{new Set((order.orders || []).map(o => o.userName)).size} 人參與</span>
                  </div>
                  <div className="flex items-center gap-2 text-gray-600">
                    <UtensilsCrossed size={16} />
                    <span>{(order.orders || []).length} 份餐點</span>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xs text-gray-500">總金額</div>
                  <div className="text-xl font-bold text-brand-600">${getTotalAmount(order)}</div>
                </div>
              </div>
              
              <div className="mt-4 pt-4 border-t border-gray-100">
                <a href={`#order=${order.id}`} className="block w-full text-center py-2 rounded-lg bg-gray-50 text-brand-600 font-medium hover:bg-brand-50 transition-colors">
                  查看詳情
                </a>
              </div>
            </div>
          ))}
        </div>
      )}
    </main>
  );
};

const Dashboard = ({ onCreateClick, onOpenSettings }: { onCreateClick: () => void, onOpenSettings: () => void }) => {
  const [orders, setOrders] = useState<GroupOrder[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const list = await listOrders();
        // Only show active/open orders on dashboard
        setOrders(list.filter(o => o.status === 'open'));
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    load();
    // Refresh every 15s
    const interval = setInterval(load, 15000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="animate-spin text-brand-500" size={40} />
      </div>
    );
  }

  return (
    <main className="max-w-6xl mx-auto p-4 py-8">
      <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">午餐吃什麼？ 🤔</h1>
          <p className="text-gray-500">輕鬆開團，AI 幫你整理菜單</p>
        </div>
        <div className="flex gap-2">
           <button 
            onClick={onCreateClick}
            className="flex items-center gap-2 bg-brand-600 text-white px-6 py-3 rounded-xl font-medium shadow-lg hover:bg-brand-700 transition-transform active:scale-95"
          >
            <Plus size={20} />
            發起新團購
          </button>
        </div>
      </div>

      {orders.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-2xl border-2 border-dashed border-gray-200">
          <div className="bg-brand-50 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4">
            <UtensilsCrossed className="text-brand-400" size={32} />
          </div>
          <h3 className="text-xl font-bold text-gray-900 mb-2">目前沒有進行中的團購</h3>
          <p className="text-gray-500 mb-6">當第一個發起人吧！</p>
          <button 
            onClick={onCreateClick}
            className="text-brand-600 font-medium hover:underline"
          >
            立即開團 &rarr;
          </button>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {orders.map(order => (
            <div key={order.id} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-shadow flex flex-col">
              <div className="p-5 flex-1">
                <div className="flex justify-between items-start mb-4">
                  <div className="bg-brand-100 text-brand-700 p-2 rounded-lg">
                    <Store size={20} />
                  </div>
                  <span className="bg-green-100 text-green-700 text-xs font-bold px-2 py-1 rounded-full uppercase tracking-wide">
                    進行中
                  </span>
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2 line-clamp-1">{order.shop.name}</h3>
                <div className="space-y-2 text-sm text-gray-600 mb-4">
                  <div className="flex items-center gap-2">
                    <Clock size={16} className="text-gray-400" />
                    <span>{new Date(order.createdAt).toLocaleString()}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Users size={16} className="text-gray-400" />
                    <span>{new Set((order.orders || []).map(o => o.userName)).size} 人已點餐</span>
                  </div>
                  {order.minOrderQuantity && order.minOrderQuantity > 0 && (
                    <div className="flex items-center gap-2 text-brand-600 font-medium">
                      <Target size={16} />
                      <span>
                        目標: {(order.orders || []).reduce((acc: number, i) => acc + i.quantity, 0)} / {order.minOrderQuantity} 份
                      </span>
                    </div>
                  )}
                  {order.minOrderAmount && order.minOrderAmount > 0 && (
                    <div className="flex items-center gap-2 text-brand-600 font-medium">
                      <DollarSign size={16} />
                      <span>
                        目標: ${(order.orders || []).reduce((acc: number, i) => acc + (i.price * i.quantity), 0)} / ${order.minOrderAmount}
                      </span>
                    </div>
                  )}
                </div>
              </div>
              <a 
                href={`#order=${order.id}`}
                className="block w-full bg-gray-50 p-3 text-center text-brand-600 font-bold text-sm hover:bg-brand-50 transition-colors border-t border-gray-100"
              >
                進入點餐
              </a>
            </div>
          ))}
        </div>
      )}
    </main>
  );
};

const CreateOrderFlow = ({ 
  onCancel, 
  onCreated,
  showAiButton 
}: { 
  onCancel: () => void, 
  onCreated: (id: string) => void,
  showAiButton: boolean
}) => {
  const [mode, setMode] = useState<'select' | 'ai' | 'manual' | 'saved' | 'random'>('select');
  const [image, setImage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [shopName, setShopName] = useState('');
  const [shopAddress, setShopAddress] = useState('');
  const [shopPhone, setShopPhone] = useState('');
  const [manualItems, setManualItems] = useState<{id: string, name: string, price: string}[]>([
    { id: uuidv4(), name: '', price: '' }
  ]);
  
  const [parsedItems, setParsedItems] = useState<MenuItem[]>([]);
  const [step, setStep] = useState(1);
  const [savedShops, setSavedShops] = useState<SavedShop[]>([]);
  const [selectedSavedShop, setSelectedSavedShop] = useState<SavedShop | null>(null);
  const [saveShopInfo, setSaveShopInfo] = useState(false);
  const [hostPassword, setHostPassword] = useState('');
  const [minOrderQuantity, setMinOrderQuantity] = useState<string>('');
  const [minOrderAmount, setMinOrderAmount] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');

  // Random Mode State
  const [randomShop, setRandomShop] = useState<SavedShop | null>(null);
  const [isRolling, setIsRolling] = useState(false);
  const rollingIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  
  // Modal State for Alerts
  const [modalConfig, setModalConfig] = useState<{ 
    isOpen: boolean; 
    type: 'alert' | 'confirm'; 
    message: string; 
    onConfirm: () => void; 
    onCancel?: () => void;
  }>({
    isOpen: false,
    type: 'alert',
    message: '',
    onConfirm: () => {},
  });

  const showAlert = (msg: string) => {
    setModalConfig({
      isOpen: true,
      type: 'alert',
      message: msg,
      onConfirm: () => setModalConfig(prev => ({ ...prev, isOpen: false })),
    });
  };

  const showConfirm = (msg: string, onYes: () => void) => {
    setModalConfig({
      isOpen: true,
      type: 'confirm',
      message: msg,
      onConfirm: () => {
        onYes();
        setModalConfig(prev => ({ ...prev, isOpen: false }));
      },
      onCancel: () => setModalConfig(prev => ({ ...prev, isOpen: false })),
    });
  };

  useEffect(() => {
    if (mode === 'saved' || mode === 'random') {
      listShops().then(setSavedShops);
    }
  }, [mode]);

  useEffect(() => {
    // Cleanup interval on unmount or mode change
    return () => {
      if (rollingIntervalRef.current) {
        clearInterval(rollingIntervalRef.current);
      }
    };
  }, []);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64 = reader.result as string;
      setImage(base64);
      setIsProcessing(true);
      try {
        const result = await parseMenuImage(base64);
        setShopName(result.shopName);
        setShopAddress(result.address || '');
        setShopPhone(result.phone || '');
        setParsedItems(result.items.map(item => ({
          id: uuidv4(),
          name: item.name,
          price: item.price
        })));
        setStep(2);
      } catch (error) {
        showAlert("辨識失敗，請重試或改用手動輸入");
      } finally {
        setIsProcessing(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const addManualItemRow = () => {
    setManualItems([...manualItems, { id: uuidv4(), name: '', price: '' }]);
  };
  
  const updateManualItemRow = (id: string, field: 'name' | 'price', value: string) => {
    setManualItems(items => items.map(item => item.id === id ? { ...item, [field]: value } : item));
  };

  const removeManualItemRow = (id: string) => {
    if (manualItems.length <= 1) {
      setManualItems([{ id: uuidv4(), name: '', price: '' }]);
      return;
    }
    setManualItems(items => items.filter(item => item.id !== id));
  };

  const handleManualSubmit = () => {
    if (!shopName) return showAlert("請輸入店家名稱");
    
    const validItems: MenuItem[] = manualItems
      .filter(item => item.name.trim() !== '')
      .map(item => ({
        id: item.id,
        name: item.name.trim(),
        price: parseInt(item.price) || 0
      }));
    
    if (validItems.length === 0) return showAlert("請至少輸入一個品項");
    setParsedItems(validItems);
    setStep(2);
  };

  const handleSavedShopSelect = (shop: SavedShop) => {
    setSelectedSavedShop(shop);
    setShopName(shop.name);
    setShopAddress(shop.address || '');
    setShopPhone(shop.phone || '');
    setParsedItems(shop.items);
    setStep(2);
  };

  const handleRollRandom = () => {
    if (savedShops.length === 0) return;
    
    setIsRolling(true);
    let counter = 0;
    
    // Clear previous interval if any
    if (rollingIntervalRef.current) clearInterval(rollingIntervalRef.current);

    rollingIntervalRef.current = setInterval(() => {
      const idx = Math.floor(Math.random() * savedShops.length);
      setRandomShop(savedShops[idx]);
      counter++;
      
      // Stop after about 2 seconds
      if (counter > 20) {
        if (rollingIntervalRef.current) clearInterval(rollingIntervalRef.current);
        setIsRolling(false);
      }
    }, 100);
  };

  const handleCreate = async () => {
    if (!hostPassword) {
      showAlert("請設定團主密碼");
      return;
    }
    
    const newOrder: GroupOrder = {
      id: uuidv4(),
      shop: { 
        name: shopName, 
        items: parsedItems,
        address: shopAddress,
        phone: shopPhone 
      },
      createdAt: Date.now(),
      status: 'open',
      orders: [],
      hostPassword: hostPassword,
      minOrderQuantity: minOrderQuantity ? parseInt(minOrderQuantity) : undefined,
      minOrderAmount: minOrderAmount ? parseInt(minOrderAmount) : undefined
    };

    try {
      await createOrder(newOrder);

      if (saveShopInfo) {
        const newShop: SavedShop = {
          id: uuidv4(),
          name: shopName,
          items: parsedItems,
          address: shopAddress,
          phone: shopPhone,
          dataType: 'shop'
        };
        await saveShop(newShop);
      }

      onCreated(newOrder.id);
    } catch (e) {
      console.error(e);
      showAlert("建立失敗，請檢查連線或重試");
    }
  };

  // Filter Saved Shops by name, address or phone
  const filteredSavedShops = savedShops.filter(shop => 
    shop.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (shop.address && shop.address.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (shop.phone && shop.phone.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  if (step === 1) {
    return (
      <div className="max-w-2xl mx-auto p-6 bg-white rounded-xl shadow-sm my-8">
        <CustomModal 
          isOpen={modalConfig.isOpen} 
          type={modalConfig.type}
          message={modalConfig.message} 
          onConfirm={modalConfig.onConfirm}
          onCancel={modalConfig.onCancel}
        />
        
        <button onClick={onCancel} className="mb-4 text-gray-500 flex items-center gap-1 text-sm hover:text-gray-800">
          <X size={16} /> 取消
        </button>
        <h2 className="text-2xl font-bold mb-6 text-center">選擇開團方式</h2>
        
        {mode === 'select' ? (
          <div className="grid gap-4 md:grid-cols-2">
             <button 
              onClick={() => setMode('random')}
              className="p-6 border-2 border-gray-100 rounded-xl hover:border-brand-500 hover:bg-brand-50 transition-all flex flex-col items-center gap-3 text-center group"
            >
              <div className="bg-amber-100 text-amber-600 p-4 rounded-full group-hover:scale-110 transition-transform">
                <Dices size={32} />
              </div>
              <h3 className="font-bold text-gray-800">命運輪盤</h3>
              <p className="text-xs text-gray-500">選擇障礙救星！從常用店家中隨機抽選</p>
            </button>

            <button 
              onClick={() => setMode('saved')}
              className="p-6 border-2 border-gray-100 rounded-xl hover:border-brand-500 hover:bg-brand-50 transition-all flex flex-col items-center gap-3 text-center group"
            >
              <div className="bg-purple-100 text-purple-600 p-4 rounded-full group-hover:scale-110 transition-transform">
                <Store size={32} />
              </div>
              <h3 className="font-bold text-gray-800">常用店家</h3>
              <p className="text-xs text-gray-500">從已儲存的店家列表中快速開團</p>
            </button>

            <button 
              onClick={() => setMode('manual')}
              className="p-6 border-2 border-gray-100 rounded-xl hover:border-brand-500 hover:bg-brand-50 transition-all flex flex-col items-center gap-3 text-center group"
            >
              <div className="bg-blue-100 text-blue-600 p-4 rounded-full group-hover:scale-110 transition-transform">
                <Keyboard size={32} />
              </div>
              <h3 className="font-bold text-gray-800">手動輸入</h3>
              <p className="text-xs text-gray-500">自行輸入店家名稱與菜單內容</p>
            </button>

            {showAiButton && (
              <button 
                onClick={() => setMode('ai')}
                className="p-6 border-2 border-gray-100 rounded-xl hover:border-brand-500 hover:bg-brand-50 transition-all flex flex-col items-center gap-3 text-center group animate-in fade-in"
              >
                <div className="bg-brand-100 text-brand-600 p-4 rounded-full group-hover:scale-110 transition-transform">
                  <Camera size={32} />
                </div>
                <h3 className="font-bold text-gray-800">拍照辨識</h3>
                <p className="text-xs text-gray-500">上傳菜單照片，AI 自動辨識品項與價格</p>
              </button>
            )}
          </div>
        ) : null}

        {mode === 'ai' && (
          <div className="text-center">
            <div className="border-2 border-dashed border-gray-300 rounded-xl p-8 hover:bg-gray-50 transition-colors cursor-pointer relative">
              <input 
                type="file" 
                accept="image/*" 
                onChange={handleImageUpload}
                className="absolute inset-0 opacity-0 cursor-pointer"
                disabled={isProcessing}
              />
              {isProcessing ? (
                <div className="flex flex-col items-center gap-3">
                  <Loader2 className="animate-spin text-brand-500" size={48} />
                  <p className="text-gray-600 font-medium">AI 正在分析菜單中...</p>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-3">
                  <Upload className="text-gray-400" size={48} />
                  <p className="text-lg font-medium text-gray-700">點擊上傳菜單照片</p>
                  <p className="text-sm text-gray-400">支援 JPG, PNG 格式</p>
                </div>
              )}
            </div>
            <button onClick={() => setMode('select')} className="mt-4 text-gray-500 underline">返回選擇模式</button>
          </div>
        )}

        {mode === 'manual' && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">店家名稱</label>
              <input 
                type="text" 
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none"
                placeholder="例如：阿婆壽司"
                value={shopName}
                onChange={(e) => setShopName(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">地址 (選填)</label>
                <input 
                  type="text" 
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none"
                  placeholder="輸入地址"
                  value={shopAddress}
                  onChange={(e) => setShopAddress(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">電話 (選填)</label>
                <input 
                  type="text" 
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none"
                  placeholder="輸入電話"
                  value={shopPhone}
                  onChange={(e) => setShopPhone(e.target.value)}
                />
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">菜單內容</label>
              <div className="space-y-2 mb-2">
                {manualItems.map((item, index) => (
                  <div key={item.id} className="flex items-center gap-2">
                    <span className="text-xs text-gray-400 w-6 text-center">{index + 1}.</span>
                    <input
                      type="text"
                      placeholder="品項名稱"
                      value={item.name}
                      onChange={(e) => updateManualItemRow(item.id, 'name', e.target.value)}
                      className="flex-1 p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none text-sm"
                    />
                    <input
                      type="number"
                      placeholder="價格"
                      value={item.price}
                      onChange={(e) => updateManualItemRow(item.id, 'price', e.target.value)}
                      className="w-24 p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none text-sm text-right"
                    />
                    <button 
                      onClick={() => removeManualItemRow(item.id)}
                      className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                      title="刪除"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                ))}
              </div>
              <button 
                onClick={addManualItemRow}
                className="w-full py-2 border-2 border-dashed border-gray-300 rounded-lg text-gray-500 font-medium hover:border-brand-500 hover:text-brand-600 hover:bg-brand-50 transition-all flex items-center justify-center gap-2"
              >
                <Plus size={18} /> 新增品項
              </button>
            </div>

            <div className="flex justify-between pt-2">
               <button onClick={() => setMode('select')} className="text-gray-500">返回</button>
               <button 
                 onClick={handleManualSubmit}
                 className="bg-brand-600 text-white px-6 py-2 rounded-lg hover:bg-brand-700 shadow-md"
               >
                 下一步
               </button>
            </div>
          </div>
        )}

        {mode === 'saved' && (
          <div>
             <div className="flex justify-between items-center mb-4">
               <h3 className="font-bold text-gray-700">選擇店家</h3>
               <button 
                type="button"
                onClick={() => {
                  showConfirm("要前往店家管理頁面嗎？目前的開團進度將不會保存。", () => {
                     window.location.hash = '#shops';
                  });
                }}
                className="flex items-center gap-1 text-sm font-medium text-brand-600 bg-brand-50 px-3 py-1.5 rounded-lg hover:bg-brand-100 transition-colors"
              >
                <Plus size={16} /> 新增/管理店家
              </button>
             </div>
            <div className="relative mb-4">
                <Search className="absolute left-3 top-2.5 text-gray-400" size={16} />
                <input 
                  type="text" 
                  placeholder="搜尋店家或地址..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:border-brand-500 outline-none w-full"
                />
            </div>

            {filteredSavedShops.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                {savedShops.length === 0 ? "尚無儲存的店家資訊" : "找不到符合的店家"}
              </div>
            ) : (
              <div className="grid gap-3 max-h-[60vh] overflow-y-auto">
                {filteredSavedShops.map(shop => (
                  <button 
                    key={shop.id}
                    onClick={() => handleSavedShopSelect(shop)}
                    className="flex justify-between items-center p-4 border border-gray-200 rounded-lg hover:bg-brand-50 hover:border-brand-200 text-left transition-colors"
                  >
                    <div>
                      <div className="font-bold text-gray-800">{shop.name}</div>
                      {(shop.address || shop.phone) && (
                        <div className="text-xs text-gray-400 flex items-center gap-2 mt-1">
                          {shop.address && <span className="flex items-center gap-0.5"><MapPin size={10} /> {shop.address}</span>}
                          {shop.phone && <span className="flex items-center gap-0.5"><Phone size={10} /> {shop.phone}</span>}
                        </div>
                      )}
                    </div>
                    <span className="text-sm text-gray-500">{shop.items.length} 個品項</span>
                  </button>
                ))}
              </div>
            )}
            <button onClick={() => setMode('select')} className="mt-6 text-gray-500">返回</button>
          </div>
        )}

        {mode === 'random' && (
          <div className="flex flex-col items-center">
             <div className="bg-amber-50 text-amber-800 p-4 rounded-xl text-center mb-8 w-full">
                <Dices className="mx-auto mb-2" size={32} />
                <h3 className="text-lg font-bold">今天吃什麼？讓命運決定！</h3>
             </div>

             {savedShops.length === 0 ? (
               <div className="text-center py-10">
                 <p className="text-gray-500 mb-4">需要先新增常用店家才能進行抽獎喔！</p>
                 <button 
                  onClick={() => window.location.hash = '#shops'}
                  className="text-brand-600 font-medium hover:underline"
                >
                  前往管理店家
                </button>
               </div>
             ) : (
               <div className="w-full max-w-md">
                 <div className={`
                    bg-white border-4 rounded-2xl p-8 mb-8 text-center transition-all duration-200 min-h-[160px] flex flex-col items-center justify-center
                    ${isRolling ? 'border-amber-400 shadow-amber-200 shadow-lg scale-105' : 'border-gray-200 shadow-sm'}
                    ${randomShop && !isRolling ? 'border-brand-500 shadow-brand-200 shadow-xl' : ''}
                 `}>
                    {randomShop ? (
                      <div className="animate-in zoom-in duration-300">
                        <h2 className="text-3xl font-black text-gray-800 mb-2">{randomShop.name}</h2>
                        {randomShop.address && (
                          <p className="text-gray-500 flex items-center justify-center gap-1">
                            <MapPin size={14} /> {randomShop.address}
                          </p>
                        )}
                        <p className="text-sm text-gray-400 mt-2">{randomShop.items.length} 個品項</p>
                      </div>
                    ) : (
                      <p className="text-gray-400 text-xl font-bold">?</p>
                    )}
                 </div>

                 <div className="flex flex-col gap-3">
                    <button 
                      onClick={handleRollRandom}
                      disabled={isRolling}
                      className={`
                        w-full py-3 rounded-xl font-bold text-white shadow-md transition-all active:scale-95 flex items-center justify-center gap-2
                        ${isRolling ? 'bg-gray-400 cursor-not-allowed' : 'bg-amber-500 hover:bg-amber-600'}
                      `}
                    >
                      {isRolling ? <Loader2 className="animate-spin" /> : <Dices />}
                      {randomShop ? "再抽一次" : "開始抽選"}
                    </button>

                    {randomShop && !isRolling && (
                      <button 
                        onClick={() => handleSavedShopSelect(randomShop)}
                        className="w-full py-3 rounded-xl font-bold text-white bg-brand-600 hover:bg-brand-700 shadow-md transition-all active:scale-95 flex items-center justify-center gap-2 animate-in fade-in slide-in-from-bottom-4"
                      >
                        <Sparkles size={18} />
                        就決定是你了！確認開團
                      </button>
                    )}
                 </div>
               </div>
             )}
             <button onClick={() => setMode('select')} className="mt-8 text-gray-500 hover:text-gray-800">返回選擇模式</button>
          </div>
        )}
      </div>
    );
  }

  // Confirmation Step
  return (
    <div className="max-w-2xl mx-auto p-6 bg-white rounded-xl shadow-sm my-8">
      <CustomModal 
        isOpen={modalConfig.isOpen} 
        type={modalConfig.type}
        message={modalConfig.message} 
        onConfirm={modalConfig.onConfirm}
        onCancel={modalConfig.onCancel}
      />

      <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
        <CheckCircle2 className="text-green-500" /> 確認菜單
      </h2>
      
      <div className="mb-6 space-y-3">
        <div>
          <label className="block text-xs font-bold text-gray-500 uppercase mb-1">店家名稱</label>
          <input 
            value={shopName}
            onChange={(e) => setShopName(e.target.value)}
            className="text-xl font-bold text-gray-900 w-full border-b border-gray-300 focus:border-brand-500 outline-none pb-1"
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase mb-1 flex items-center gap-1">
              <MapPin size={12} /> 地址 (選填)
            </label>
            <input 
              value={shopAddress}
              onChange={(e) => setShopAddress(e.target.value)}
              placeholder="輸入地址"
              className="text-sm text-gray-700 w-full border-b border-gray-300 focus:border-brand-500 outline-none pb-1"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase mb-1 flex items-center gap-1">
              <Phone size={12} /> 電話 (選填)
            </label>
            <input 
              value={shopPhone}
              onChange={(e) => setShopPhone(e.target.value)}
              placeholder="輸入電話"
              className="text-sm text-gray-700 w-full border-b border-gray-300 focus:border-brand-500 outline-none pb-1"
            />
          </div>
        </div>
      </div>

      <div className="bg-gray-50 rounded-xl p-4 max-h-64 overflow-y-auto mb-6">
        {parsedItems.map((item, idx) => (
          <div key={item.id} className="flex justify-between py-2 border-b border-gray-200 last:border-0">
            <input 
              value={item.name}
              onChange={(e) => {
                const newItems = [...parsedItems];
                newItems[idx].name = e.target.value;
                setParsedItems(newItems);
              }}
              className="bg-transparent outline-none flex-1 font-medium"
            />
            <div className="flex items-center gap-1">
              <span className="text-gray-400 text-sm">$</span>
              <input 
                type="number"
                value={item.price}
                onChange={(e) => {
                  const newItems = [...parsedItems];
                  newItems[idx].price = parseInt(e.target.value) || 0;
                  setParsedItems(newItems);
                }}
                className="bg-transparent outline-none w-16 text-right font-mono"
              />
            </div>
          </div>
        ))}
      </div>
      
      <div className="mb-6 space-y-4 bg-orange-50 p-4 rounded-xl border border-orange-100">
        <h3 className="font-bold text-orange-800 flex items-center gap-2">
          <Lock size={16} /> 團主設定
        </h3>
        <div>
          <label className="block text-sm font-medium text-orange-700 mb-1">設定團主密碼 (必填)</label>
          <input 
            type="text" 
            value={hostPassword}
            onChange={(e) => setHostPassword(e.target.value)}
            placeholder="請輸入密碼"
            className="w-full p-2 border border-orange-200 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none"
          />
        </div>
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-orange-700 mb-1">最少成團份數 (選填)</label>
            <input 
              type="number" 
              value={minOrderQuantity}
              onChange={(e) => setMinOrderQuantity(e.target.value)}
              placeholder="例如: 10"
              className="w-full p-2 border border-orange-200 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-orange-700 mb-1">最少成團金額 (選填)</label>
            <input 
              type="number" 
              value={minOrderAmount}
              onChange={(e) => setMinOrderAmount(e.target.value)}
              placeholder="例如: 1000"
              className="w-full p-2 border border-orange-200 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none"
            />
          </div>
        </div>
        
        {mode !== 'saved' && mode !== 'random' && (
          <div className="flex items-center gap-2 pt-2">
             <input 
               type="checkbox" 
               id="saveShop"
               checked={saveShopInfo}
               onChange={(e) => setSaveShopInfo(e.target.checked)}
               className="w-4 h-4 text-brand-600"
             />
             <label htmlFor="saveShop" className="text-sm text-gray-700 cursor-pointer select-none">
               將此店家加入「常用店家」以便下次快速開團
             </label>
          </div>
        )}
      </div>

      <div className="flex gap-3">
        <button 
          onClick={() => setStep(1)}
          className="flex-1 py-3 rounded-xl font-medium text-gray-600 bg-gray-100 hover:bg-gray-200"
        >
          上一步
        </button>
        <button 
          onClick={handleCreate}
          className="flex-1 py-3 rounded-xl font-medium text-white bg-brand-600 hover:bg-brand-700 shadow-lg shadow-brand-200"
        >
          確認開團
        </button>
      </div>
    </div>
  );
};

const OrderPage = ({ orderId, goHome }: { orderId: string, goHome: () => void }) => {
  const [order, setOrder] = useState<GroupOrder | null>(null);
  const [userName, setUserName] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [hostPasswordInput, setHostPasswordInput] = useState('');
  const [isHost, setIsHost] = useState(false);
  const [showHostLogin, setShowHostLogin] = useState(false);
  
  // Shopping Cart state for local changes before submission
  const [cart, setCart] = useState<OrderItem[]>([]);

  // Modal State
  const [modalConfig, setModalConfig] = useState<{ 
    isOpen: boolean; 
    type: 'alert' | 'confirm'; 
    message: string; 
    onConfirm: () => void; 
    onCancel?: () => void;
  }>({
    isOpen: false,
    type: 'alert',
    message: '',
    onConfirm: () => {},
  });

  const showAlert = (msg: string) => {
    setModalConfig({
      isOpen: true,
      type: 'alert',
      message: msg,
      onConfirm: () => setModalConfig(prev => ({ ...prev, isOpen: false })),
    });
  };

  const showConfirm = (msg: string, onYes: () => void) => {
    setModalConfig({
      isOpen: true,
      type: 'confirm',
      message: msg,
      onConfirm: () => {
        onYes();
        setModalConfig(prev => ({ ...prev, isOpen: false }));
      },
      onCancel: () => setModalConfig(prev => ({ ...prev, isOpen: false })),
    });
  };

  useEffect(() => {
    const fetchOrder = async () => {
      try {
        const data = await getOrder(orderId);
        setOrder(data);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchOrder();
    const interval = setInterval(fetchOrder, 5000);
    return () => clearInterval(interval);
  }, [orderId]);

  // Add to local cart instead of backend directly
  const addToCart = (item: MenuItem) => {
    if (!order || order.status !== 'open') return;
    
    // Check if item already in cart, then just increment
    const existingItemIndex = cart.findIndex(c => c.menuItemId === item.id);
    if (existingItemIndex >= 0) {
      const newCart = [...cart];
      newCart[existingItemIndex].quantity += 1;
      setCart(newCart);
    } else {
      const orderItem: OrderItem = {
        id: uuidv4(),
        userName: '', // Set later
        menuItemId: item.id,
        menuItemName: item.name,
        price: item.price,
        quantity: 1,
        notes: '', // Init note
        isPaid: false, // Init paid status
        timestamp: Date.now()
      };
      setCart([...cart, orderItem]);
    }
  };

  const updateCartItem = (itemId: string, delta: number) => {
    const newCart = cart.map(item => {
      if (item.id === itemId) {
        const newQty = Math.max(1, item.quantity + delta);
        return { ...item, quantity: newQty };
      }
      return item;
    });
    setCart(newCart);
  };

  const updateCartItemNote = (itemId: string, note: string) => {
    const newCart = cart.map(item => {
      if (item.id === itemId) {
        return { ...item, notes: note };
      }
      return item;
    });
    setCart(newCart);
  };

  const removeCartItem = (itemId: string) => {
    setCart(cart.filter(item => item.id !== itemId));
  };

  const handleSubmitOrder = async () => {
    if (!userName.trim()) return showAlert("請輸入您的名字");
    if (cart.length === 0) return showAlert("購物車是空的");
    
    setSubmitting(true);
    try {
      for (const item of cart) {
        // Set the username right before sending
        const finalItem = { ...item, userName: userName.trim() };
        await addOrderItem(orderId, finalItem);
      }
      
      // Clear cart and refresh
      setCart([]);
      const updated = await getOrder(orderId);
      setOrder(updated);
    } catch (e) {
      showAlert("送出失敗，請重試");
    } finally {
      setSubmitting(false);
    }
  };

  const handleHostLogin = () => {
    if (order && order.hostPassword === hostPasswordInput) {
      setIsHost(true);
      setShowHostLogin(false);
    } else {
      showAlert("密碼錯誤");
    }
  };

  const updateStatus = async (status: 'open' | 'closed' | 'archived') => {
    if (!order) return;
    
    const doUpdate = async () => {
      try {
        const updated = { ...order, status };
        await updateOrder(updated);
        setOrder(updated);
        if (status === 'archived') {
          goHome();
        }
      } catch (e) {
        showAlert("更新狀態失敗");
      }
    };

    if (status === 'archived') {
      showConfirm("確定要刪除(封存)此訂單？", doUpdate);
    } else {
      doUpdate();
    }
  };

  const toggleUserPayment = async (targetUserName: string, isPaid: boolean) => {
    if (!order) return;
    try {
      // We need to update all items for this user
      const updatedItems = (order.orders || []).map(item => {
        if (item.userName === targetUserName) {
          return { ...item, isPaid };
        }
        return item;
      });
      
      const updatedOrder = { ...order, orders: updatedItems };
      await updateOrder(updatedOrder);
      setOrder(updatedOrder);
    } catch (e) {
      showAlert("更新付款狀態失敗");
    }
  };

  const deleteItem = (itemId: string) => {
    if (!order) return;
    
    showConfirm("確定要刪除此項目嗎？", async () => {
      try {
        const updatedItems = (order.orders || []).filter(i => i.id !== itemId);
        const updatedOrder = { ...order, orders: updatedItems };
        await updateOrder(updatedOrder);
        setOrder(updatedOrder);
      } catch (e) {
        showAlert("刪除失敗");
      }
    });
  };

  const copySummary = () => {
    if (!order) return;
    const grouped = (order.orders || []).reduce((acc, curr) => {
      acc[curr.menuItemName] = (acc[curr.menuItemName] || 0) + curr.quantity;
      return acc;
    }, {} as Record<string, number>);
    
    let text = `🍱 ${order.shop.name} 訂單統計\n`;
    if (order.shop.phone) text += `📞 電話: ${order.shop.phone}\n`;
    if (order.shop.address) text += `📍 地址: ${order.shop.address}\n`;
    text += `\n`;
    Object.entries(grouped).forEach(([name, count]) => {
      text += `- ${name}: ${count}\n`;
    });
    
    text += `\n總份數: ${Object.values(grouped).reduce((a: number, b: number) => a + b, 0)} 份`;
    text += `\n總金額: $${(order.orders || []).reduce((acc: number, curr) => acc + (curr.price * curr.quantity), 0)}`;
    
    navigator.clipboard.writeText(text).then(() => {
        showAlert("已複製訂單統計到剪貼簿！");
    }).catch(() => {
        showAlert("複製失敗，請手動複製");
    });
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <Loader2 className="animate-spin text-brand-500" size={40} />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="text-center py-20">
        <h2 className="text-2xl font-bold text-gray-800">找不到訂單</h2>
        <button onClick={goHome} className="text-brand-600 mt-4 hover:underline">回首頁</button>
      </div>
    );
  }

  const groupedOrders = (order.orders || []).reduce((acc, curr) => {
    if (!acc[curr.userName]) acc[curr.userName] = [];
    acc[curr.userName].push(curr);
    return acc;
  }, {} as Record<string, OrderItem[]>);

  const totalAmount = (order.orders || []).reduce((acc: number, i) => acc + (i.price * i.quantity), 0);
  const totalQuantity = (order.orders || []).reduce((acc: number, i) => acc + i.quantity, 0);

  // Calculate cart total
  const cartTotal = cart.reduce((acc: number, item) => acc + (item.price * item.quantity), 0);

  return (
    <main className="max-w-6xl mx-auto p-4 pb-32">
       <CustomModal 
        isOpen={modalConfig.isOpen} 
        type={modalConfig.type}
        message={modalConfig.message} 
        onConfirm={modalConfig.onConfirm}
        onCancel={modalConfig.onCancel}
      />

      {/* Header Info */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
        <div className="flex justify-between items-start mb-4">
           <div>
             <div className="flex items-center gap-2 mb-1">
               <h1 className="text-2xl font-bold text-gray-900">{order.shop.name}</h1>
               <span className={`px-2 py-0.5 rounded text-xs font-bold uppercase ${order.status === 'open' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                 {order.status === 'open' ? '收單中' : order.status === 'closed' ? '已結單' : '已封存'}
               </span>
             </div>
             <div className="text-sm text-gray-500 space-y-1">
               {order.shop.address && <p className="flex items-center gap-1"><MapPin size={14} /> {order.shop.address}</p>}
               {order.shop.phone && <p className="flex items-center gap-1"><Phone size={14} /> {order.shop.phone}</p>}
             </div>
           </div>
           
           <div className="flex flex-col items-end gap-2">
             <button 
               onClick={() => {
                  if (isHost) {
                    setIsHost(false);
                  } else {
                    setShowHostLogin(true);
                  }
               }}
               className={`p-2 rounded-lg transition-colors ${isHost ? 'bg-orange-100 text-orange-600' : 'text-gray-400 hover:bg-gray-100'}`}
               title={isHost ? "登出團主" : "團主登入"}
             >
               {isHost ? <LogOut size={20} /> : <KeyRound size={20} />}
             </button>
           </div>
        </div>

        {/* Targets */}
        <div className="flex flex-wrap gap-4 text-sm bg-gray-50 p-3 rounded-lg border border-gray-100">
           <div className={`flex items-center gap-2 ${order.minOrderQuantity && totalQuantity >= order.minOrderQuantity ? 'text-green-600 font-bold' : 'text-gray-600'}`}>
              <Target size={16} />
              <span>份數: {totalQuantity} {order.minOrderQuantity ? `/ ${order.minOrderQuantity}` : ''}</span>
              {order.minOrderQuantity && totalQuantity >= order.minOrderQuantity && <Check size={14} />}
           </div>
           <div className={`flex items-center gap-2 ${order.minOrderAmount && totalAmount >= order.minOrderAmount ? 'text-green-600 font-bold' : 'text-gray-600'}`}>
              <DollarSign size={16} />
              <span>金額: ${totalAmount} {order.minOrderAmount ? `/ ${order.minOrderAmount}` : ''}</span>
              {order.minOrderAmount && totalAmount >= order.minOrderAmount && <Check size={14} />}
           </div>
           <div className="ml-auto text-gray-400 text-xs flex items-center gap-1">
             <Clock size={12} /> 開團時間: {new Date(order.createdAt).toLocaleString()}
           </div>
        </div>

        {/* Host Login Modal/Area */}
        {showHostLogin && (
          <div className="mt-4 p-4 bg-orange-50 rounded-lg border border-orange-100 animate-in slide-in-from-top-2">
             <h4 className="font-bold text-orange-800 mb-2 flex items-center gap-2"><Lock size={16} /> 團主驗證</h4>
             <div className="flex gap-2">
               <input 
                 type="password" 
                 placeholder="輸入團主密碼"
                 value={hostPasswordInput}
                 onChange={(e) => setHostPasswordInput(e.target.value)}
                 className="flex-1 p-2 border border-orange-200 rounded-lg focus:ring-2 focus:ring-orange-400 outline-none text-sm"
               />
               <button 
                 onClick={handleHostLogin}
                 className="bg-orange-500 text-white px-4 py-2 rounded-lg font-medium hover:bg-orange-600"
               >
                 登入
               </button>
               <button 
                 onClick={() => setShowHostLogin(false)}
                 className="text-gray-500 px-3 py-2"
               >
                 取消
               </button>
             </div>
          </div>
        )}

        {/* Host Controls */}
        {isHost && (
          <div className="mt-4 p-4 bg-white border-2 border-orange-100 rounded-xl shadow-sm">
             <h4 className="font-bold text-gray-800 mb-3 flex items-center gap-2">
               <Settings size={18} className="text-orange-500" /> 團主管理區
             </h4>
             <div className="flex flex-wrap gap-2">
                <button 
                  onClick={copySummary}
                  className="flex items-center gap-1 px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 font-medium text-sm"
                >
                  <Copy size={16} /> 複製統計
                </button>
                <div className="w-px h-8 bg-gray-200 mx-1"></div>
                {order.status === 'open' ? (
                  <button 
                    onClick={() => updateStatus('closed')}
                    className="flex items-center gap-1 px-3 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 font-medium text-sm"
                  >
                    <Lock size={16} /> 結單 (停止點餐)
                  </button>
                ) : (
                   <button 
                    onClick={() => updateStatus('open')}
                    className="flex items-center gap-1 px-3 py-2 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 font-medium text-sm"
                  >
                    <Unlock size={16} /> 重新開團
                  </button>
                )}
                <button 
                   onClick={() => updateStatus('archived')}
                   className="flex items-center gap-1 px-3 py-2 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 font-medium text-sm ml-auto"
                >
                   <Trash2 size={16} /> 刪除/封存訂單
                </button>
             </div>
          </div>
        )}

        {/* Share Section - Now visible to everyone */}
        <div className="mt-6 pt-6 border-t border-gray-100">
            <div className="flex flex-col md:flex-row items-center gap-6">
                <div className="flex items-center gap-4">
                  <div className="bg-white p-2 rounded border border-gray-200 shrink-0">
                    <QRCodeSVG value={window.location.href} size={80} />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-gray-700 mb-1 flex items-center gap-2">
                        <Share2 size={16} className="text-brand-500" />
                        分享連結邀請點餐
                    </p>
                    <div className="flex gap-2">
                      <input 
                        readOnly 
                        value={window.location.href} 
                        className="bg-gray-50 border border-gray-200 text-xs p-2 rounded w-48 text-gray-500 outline-none"
                      />
                      <button 
                        onClick={() => {
                          navigator.clipboard.writeText(window.location.href);
                          showAlert("連結已複製");
                        }}
                        className="p-2 bg-gray-100 hover:bg-gray-200 rounded text-gray-600 transition-colors"
                        title="複製連結"
                      >
                        <Copy size={16} />
                      </button>
                    </div>
                  </div>
                </div>
            </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6 items-start">
        {/* Left Col: Menu */}
        <div className="lg:col-span-2 space-y-6">
           <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="p-4 bg-gray-50 border-b border-gray-100 flex justify-between items-center">
                 <h3 className="font-bold text-gray-800 flex items-center gap-2">
                   <UtensilsCrossed size={18} className="text-brand-500" /> 菜單
                 </h3>
              </div>
              <div className="divide-y divide-gray-50">
                {order.shop.items.map(item => (
                  <div key={item.id} className="p-4 flex justify-between items-center hover:bg-gray-50 transition-colors group">
                     <div>
                       <div className="font-bold text-gray-800">{item.name}</div>
                       <div className="text-gray-500 font-mono">${item.price}</div>
                     </div>
                     {order.status === 'open' ? (
                       <button 
                         onClick={() => addToCart(item)}
                         className="p-2 bg-brand-50 text-brand-600 rounded-full hover:bg-brand-500 hover:text-white transition-colors active:scale-90"
                       >
                         <Plus size={20} />
                       </button>
                     ) : (
                       <span className="text-xs text-gray-400 bg-gray-100 px-2 py-1 rounded">已結單</span>
                     )}
                  </div>
                ))}
              </div>
           </div>
        </div>

        {/* Right Col: Cart (Sticky) */}
        <div className="lg:col-span-1 sticky top-20 space-y-4">
           {order.status === 'open' ? (
             <div className="bg-white rounded-xl shadow-lg border-2 border-brand-100 overflow-hidden">
                <div className="p-3 bg-brand-600 text-white font-bold flex items-center gap-2">
                  <ChefHat size={18} /> 我的餐點
                </div>
                
                <div className="p-4 space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">您的暱稱</label>
                    <input 
                      type="text" 
                      value={userName}
                      onChange={(e) => setUserName(e.target.value)}
                      placeholder="請輸入名字 (例: Alex)"
                      className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none"
                    />
                  </div>

                  {cart.length === 0 ? (
                    <div className="text-center py-6 text-gray-400 text-sm border-2 border-dashed border-gray-100 rounded-lg">
                      尚未選擇餐點
                    </div>
                  ) : (
                    <div className="space-y-3 max-h-[300px] overflow-y-auto">
                      {cart.map(item => (
                        <div key={item.id} className="bg-gray-50 p-3 rounded-lg border border-gray-100 relative group">
                           <div className="flex justify-between items-start mb-2">
                              <span className="font-bold text-sm text-gray-800">{item.menuItemName}</span>
                              <button 
                                onClick={() => removeCartItem(item.id)}
                                className="text-gray-300 hover:text-red-500"
                              >
                                <X size={14} />
                              </button>
                           </div>
                           <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2 bg-white rounded-lg border border-gray-200 px-1 h-8">
                                <button onClick={() => updateCartItem(item.id, -1)} className="p-1 hover:text-brand-600"><Minus size={12} /></button>
                                <span className="text-sm font-mono w-4 text-center">{item.quantity}</span>
                                <button onClick={() => updateCartItem(item.id, 1)} className="p-1 hover:text-brand-600"><Plus size={12} /></button>
                              </div>
                              <span className="font-bold text-brand-600 text-sm">${item.price * item.quantity}</span>
                           </div>
                           <input 
                             type="text"
                             placeholder="備註 (微辣/加飯...)"
                             value={item.notes || ''}
                             onChange={(e) => updateCartItemNote(item.id, e.target.value)}
                             className="w-full mt-2 bg-transparent text-xs border-b border-gray-200 focus:border-brand-300 outline-none pb-0.5 text-gray-600 placeholder-gray-300"
                           />
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="pt-3 border-t border-gray-100 flex justify-between items-center font-bold text-gray-800">
                    <span>總計</span>
                    <span className="text-xl">${cartTotal}</span>
                  </div>

                  <button 
                    onClick={handleSubmitOrder}
                    disabled={submitting || cart.length === 0}
                    className="w-full py-3 bg-brand-600 text-white rounded-xl font-bold hover:bg-brand-700 disabled:bg-gray-300 disabled:cursor-not-allowed shadow-md transition-all active:scale-95 flex items-center justify-center gap-2"
                  >
                    {submitting ? <Loader2 className="animate-spin" /> : <Send size={18} />}
                    送出訂單
                  </button>
                </div>
             </div>
           ) : (
             <div className="bg-gray-100 rounded-xl p-6 text-center text-gray-500 border border-gray-200">
                <Lock className="mx-auto mb-2" size={24} />
                <p>此訂單已結單或封存</p>
             </div>
           )}
        </div>
      </div>

      {/* Group Orders Grid - Moved to bottom for full width visibility */}
      <div className="mt-8">
         <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-bold text-gray-800 flex items-center gap-2">
               <ClipboardList className="text-brand-600" /> 大家點了什麼
            </h3>
            <div className="flex gap-2 text-sm text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
               <span>{Object.keys(groupedOrders).length} 人參與</span>
               <span>•</span>
               <span>共 {totalQuantity} 份</span>
               <span>•</span>
               <span>${totalAmount}</span>
            </div>
         </div>
         
         <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
             {Object.keys(groupedOrders).length === 0 ? (
                <div className="col-span-full p-12 text-center bg-white rounded-xl border border-dashed border-gray-300 text-gray-400">
                   <UtensilsCrossed className="mx-auto mb-2 opacity-50" size={32} />
                   目前還沒有人點餐
                </div>
             ) : (
                Object.entries(groupedOrders).map(([user, items]: [string, OrderItem[]]) => {
                  const userTotal = items.reduce((sum: number, i) => sum + (i.price * i.quantity), 0);
                  const isAllPaid = items.every(i => i.isPaid);
                  
                  return (
                    <div key={user} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow">
                       {/* User Header */}
                       <div className="bg-gray-50 p-3 border-b border-gray-100 flex justify-between items-center">
                         <div className="flex items-center gap-2">
                           <div className="w-8 h-8 rounded-full bg-brand-100 text-brand-600 flex items-center justify-center text-sm font-bold">
                             {user.substring(0, 1).toUpperCase()}
                           </div>
                           <span className="font-bold text-gray-800 truncate max-w-[100px]" title={user}>{user}</span>
                         </div>
                         <div className="flex items-center gap-2">
                           {isHost && (
                             <button 
                               onClick={() => toggleUserPayment(user, !isAllPaid)}
                               className={`p-1.5 rounded-full ${isAllPaid ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-400 hover:bg-gray-200'}`}
                               title="切換付款狀態"
                             >
                               <DollarSign size={14} />
                             </button>
                           )}
                           {isAllPaid && <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">已付</span>}
                           <span className="font-mono font-bold text-brand-600">${userTotal}</span>
                         </div>
                       </div>
                       
                       {/* Items List */}
                       <div className="p-3 space-y-2">
                          {items.map(item => (
                            <div key={item.id} className="text-sm flex justify-between items-start group">
                              <div className="text-gray-700">
                                <span className="font-bold mr-1">{item.quantity} x</span> 
                                {item.menuItemName}
                                {item.notes && <div className="text-gray-400 text-xs">({item.notes})</div>}
                              </div>
                              <div className="flex items-center gap-2 shrink-0">
                                 <span className="text-gray-400 text-xs">${item.price * item.quantity}</span>
                                 {isHost && (
                                   <button 
                                    onClick={() => deleteItem(item.id)}
                                    className="text-gray-200 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                                   >
                                     <X size={14} />
                                   </button>
                                 )}
                              </div>
                            </div>
                          ))}
                       </div>
                    </div>
                  );
                })
             )}
         </div>
      </div>
    </main>
  );
};

const App = () => {
  const [route, setRoute] = useState('home');
  const [orderId, setOrderId] = useState('');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [showHiddenFeatures, setShowHiddenFeatures] = useState(false);

  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash;
      if (hash.startsWith('#order=')) {
        setOrderId(hash.split('=')[1]);
        setRoute('order');
      } else if (hash === '#create') {
        setRoute('create');
      } else if (hash === '#history') {
        setRoute('history');
      } else if (hash === '#shops') {
        setRoute('shops');
      } else {
        setRoute('home');
      }
    };

    window.addEventListener('hashchange', handleHashChange);
    handleHashChange(); // Initial check

    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  const goHome = () => window.location.hash = '';

  const toggleHiddenFeatures = () => {
    setShowHiddenFeatures(prev => !prev);
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-20 font-sans selection:bg-brand-100 selection:text-brand-900 relative">
      <Header 
        onOpenSettings={() => setIsSettingsOpen(true)} 
        goHome={goHome}
        goToCreate={() => window.location.hash = '#create'}
        goToHistory={() => window.location.hash = '#history'}
        goToShops={() => window.location.hash = '#shops'}
        showSettingsBtn={showHiddenFeatures}
      />
      
      <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />

      {route === 'home' && (
        <Dashboard 
          onCreateClick={() => window.location.hash = '#create'} 
          onOpenSettings={() => setIsSettingsOpen(true)}
        />
      )}
      
      {route === 'create' && (
        <CreateOrderFlow 
          onCancel={goHome} 
          onCreated={(id) => window.location.hash = `#order=${id}`}
          showAiButton={!!process.env.API_KEY && showHiddenFeatures}
        />
      )}
      
      {route === 'order' && orderId && (
        <OrderPage orderId={orderId} goHome={goHome} />
      )}

      {route === 'history' && (
        <HistoryPage goHome={goHome} />
      )}

      {route === 'shops' && (
        <ManageShopsPage goHome={goHome} />
      )}

      {/* Hidden Feature Trigger Area */}
      <div 
        className="fixed bottom-0 right-0 w-20 h-20 z-50 cursor-default" 
        onDoubleClick={toggleHiddenFeatures}
        title="Double click for admin features"
      />
    </div>
  );
};

export default App;