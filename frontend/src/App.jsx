import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  Utensils, 
  ShoppingCart, 
  Calendar, 
  Clock, 
  ShieldAlert, 
  Plus, 
  Minus, 
  MapPin, 
  Phone, 
  Check, 
  ChevronRight, 
  Sparkles,
  AlertCircle,
  Database,
  RefreshCw,
  LogOut,
  Trash2,
  Users,
  ShoppingBag,
  Truck
} from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';

// Create a Supabase-like realtime mock since we may run in demo mode
// or we can hook up real Supabase if credentials are provided
import { createClient } from '@supabase/supabase-js';

// Fallback configuration if real credentials aren't set
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || '';
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || '';
const isSupabaseConfigured = SUPABASE_URL && SUPABASE_KEY;

function App() {
  const { t, i18n } = useTranslation();
  const [activeTab, setActiveTab] = useState('menu');
  const [user, setUser] = useState(null);
  const [products, setProducts] = useState([]);
  const [cart, setCart] = useState([]);
  const [myOrders, setMyOrders] = useState([]);
  const [myBookings, setMyBookings] = useState([]);
  const [phoneInput, setPhoneInput] = useState('');
  const [addressInput, setAddressInput] = useState('');
  const [orderType, setOrderType] = useState('pickup');
  const [isDemo, setIsDemo] = useState(false);
  const [loading, setLoading] = useState(true);

  // Booking Form State
  const [bookingTable, setBookingTable] = useState('1');
  const [bookingTime, setBookingTime] = useState('');
  const [bookingGuests, setBookingGuests] = useState('2');
  const [bookingSuccessMsg, setBookingSuccessMsg] = useState('');

  // Admin Dashboard State
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState(false);
  const [adminUsername, setAdminUsername] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [adminToken, setAdminToken] = useState('');
  const [adminOrders, setAdminOrders] = useState([]);
  const [adminBookings, setAdminBookings] = useState([]);
  const [adminMenu, setAdminMenu] = useState([]);
  const [adminError, setAdminError] = useState('');
  const [simulationResult, setSimulationResult] = useState(null);
  const [isSimulating, setIsSimulating] = useState(false);
  const [adminSubTab, setAdminSubTab] = useState('orders'); // 'orders', 'bookings', 'menu'
  const [adminOrderFilter, setAdminOrderFilter] = useState('pending'); // 'pending', 'accepted', 'history'
  const [productFormOpen, setProductFormOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  
  // Product Form states
  const [formTitleUz, setFormTitleUz] = useState('');
  const [formTitleRu, setFormTitleRu] = useState('');
  const [formTitleEn, setFormTitleEn] = useState('');
  const [formDescUz, setFormDescUz] = useState('');
  const [formDescRu, setFormDescRu] = useState('');
  const [formDescEn, setFormDescEn] = useState('');
  const [formCategory, setFormCategory] = useState('national');
  const [formPrice, setFormPrice] = useState('');
  const [formImageUrl, setFormImageUrl] = useState('');
  const [formIsAvailable, setFormIsAvailable] = useState(true);
  
  // Search & Filter in Admin
  const [adminSearchQuery, setAdminSearchQuery] = useState('');
  const [adminCategoryFilter, setAdminCategoryFilter] = useState('all');
  
  // Delete confirmation modal states
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [productToDelete, setProductToDelete] = useState(null);
  
  // Lang tab within product form
  const [formLangTab, setFormLangTab] = useState('uz');
  const [isSavingProduct, setIsSavingProduct] = useState(false);
  const [isDeletingProduct, setIsDeletingProduct] = useState(false);

  // Real-time queue tracker state
  const [activeOrderQueue, setActiveOrderQueue] = useState(null);
  
  // Image URL Management & Route security states
  const [showAdminLoginForm, setShowAdminLoginForm] = useState(false);
  const [imageLoadError, setImageLoadError] = useState(false);

  // Mock initData representing Telegram WebApp
  // In a real environment, window.Telegram.WebApp is injected by Telegram
  const getTelegramInitData = () => {
    if (window.Telegram && window.Telegram.WebApp && window.Telegram.WebApp.initData) {
      return window.Telegram.WebApp.initData;
    }
    // Return a mocked initData string for local testing in regular browser
    const mockUser = {
      id: 12345678,
      first_name: 'Jasur',
      last_name: 'Rahimov',
      username: 'jasur_r',
      language_code: 'uz'
    };
    return `user=${encodeURIComponent(JSON.stringify(mockUser))}&hash=mocked_hash_value`;
  };

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    // Reset login view toggle if switching tabs
    setShowAdminLoginForm(false);
    let path = '/';
    if (tab === 'admin') path = '/admin';
    else if (tab !== 'menu') path = `/${tab}`;
    window.history.pushState(null, '', path);
  };

  useEffect(() => {
    // Detect if we are running in Telegram Mini App
    if (window.Telegram && window.Telegram.WebApp) {
      window.Telegram.WebApp.ready();
      window.Telegram.WebApp.expand();
      // Set theme header color
      window.Telegram.WebApp.setHeaderColor('#0f0f11');
    }
    
    // Initial fetch of data
    fetchAuth();

    // Sync active tab with URL pathname
    const handleLocationChange = () => {
      const path = window.location.pathname;
      if (path === '/admin' || path === '/admin/dashboard') {
        setActiveTab('admin');
      } else if (path === '/cart') {
        setActiveTab('cart');
      } else if (path === '/bookings') {
        setActiveTab('bookings');
      } else if (path === '/orders') {
        setActiveTab('orders');
      } else {
        setActiveTab('menu');
      }
    };

    handleLocationChange();
    window.addEventListener('popstate', handleLocationChange);
    return () => window.removeEventListener('popstate', handleLocationChange);
  }, []);

  const fetchAuth = async () => {
    try {
      const initData = getTelegramInitData();
      const response = await fetch(`${API_BASE}/auth/telegram`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Telegram ${initData}`
        }
      });
      
      if (!response.ok) {
        throw new Error('Server auth failed. Running in demo database mode.');
      }
      
      const data = await response.json();
      setUser(data.user);
      if (data.user && data.user.phone) {
        setPhoneInput(data.user.phone);
      }
      setIsDemo(false);
      fetchInitialData(initData);
    } catch (err) {
      console.warn(err);
      setIsDemo(true);
      // Generate simulated user for demo mode
      setUser({
        id: 'u1',
        telegram_id: 12345678,
        name: 'Jasur Rahimov (Demo)',
        phone: '+998901234567',
        role: 'client'
      });
      setPhoneInput('+998901234567');
      fetchInitialData(null);
    }
  };

  const fetchInitialData = async (initData) => {
    setLoading(true);
    try {
      // Fetch products
      const prodRes = await fetch(`${API_BASE}/products`);
      if (prodRes.ok) {
        const prodData = await prodRes.ok ? await prodRes.json() : [];
        setProducts(prodData);
        setAdminMenu(prodData);
      }

      if (initData) {
        // Fetch my orders
        const ordersRes = await fetch(`${API_BASE}/orders/my`, {
          headers: { 'Authorization': `Telegram ${initData}` }
        });
        if (ordersRes.ok) {
          const ordersData = await ordersRes.json();
          setMyOrders(ordersData);
          
          // If there is an active order (pending/accepted), poll/track queue
          const active = ordersData.find(o => ['pending', 'accepted'].includes(o.status));
          if (active) {
            fetchQueueStatus(active.id, initData);
          }
        }

        // Fetch my bookings
        const bookingsRes = await fetch(`${API_BASE}/bookings/my`, {
          headers: { 'Authorization': `Telegram ${initData}` }
        });
        if (bookingsRes.ok) {
          setMyBookings(await bookingsRes.json());
        }
      } else {
        // Mock data for demo mode
        setProducts([
          { 
            id: 'p1', 
            title_uz: 'Osh (Palov)', 
            title_ru: 'Плов', 
            title_en: 'Pilaf (Osh)', 
            description_uz: 'Mol go\'shti, guruch, sabzi va maxsus ziravorlar bilan pishirilgan milliy palov.',
            description_ru: 'Национальный плов, приготовленный с говядиной, рисом, морковью и особыми специями.',
            description_en: 'National pilaf cooked with beef, rice, carrots, and special spices.',
            price: 35000, 
            category: 'national', 
            image_url: 'https://images.unsplash.com/photo-1541832676-9b763b0239ab?q=80&w=600&auto=format&fit=crop' 
          },
          { 
            id: 'p2', 
            title_uz: 'Lag\'mon', 
            title_ru: 'Лагман', 
            title_en: 'Lagman', 
            description_uz: 'Qo\'lda cho\'zilgan xamir, yangi sabzavotlar va mol go\'shtidan tayyorlangan quyuq lag\'mon sho\'rva.',
            description_ru: 'Густой суп лагман из тянутой вручную лапши, свежих овощей и говядины.',
            description_en: 'Thick lagman soup made with hand-pulled noodles, fresh vegetables, and beef.',
            price: 28000, 
            category: 'national', 
            image_url: 'https://images.unsplash.com/photo-1585032226651-759b368d7246?q=80&w=600&auto=format&fit=crop' 
          },
          { 
            id: 'p3', 
            title_uz: 'Somsa (Go\'shtli)', 
            title_ru: 'Самса с мясом', 
            title_en: 'Meat Somsa', 
            description_uz: 'Tandirda pishirilgan, ichida to\'g\'ralgan mol go\'shti va piyoz bo\'lgan qarsillaydigan milliy somsa.',
            description_ru: 'Хрустящая национальная самса, запеченная в тандыре, с начинкой из рубленой говядины и лука.',
            description_en: 'Crispy national somsa baked in a tandoor, filled with minced beef and onions.',
            price: 10000, 
            category: 'national', 
            image_url: 'https://images.unsplash.com/photo-1601050690597-df056fb4ce78?q=80&w=600&auto=format&fit=crop' 
          },
          { 
            id: 'p4', 
            title_uz: 'Ko\'k choy', 
            title_ru: 'Зеленый чай', 
            title_en: 'Green Tea', 
            description_uz: 'Sarxil barglardan damlangan an\'anaviy milliy ko\'k choy.',
            description_ru: 'Традиционный зеленый чай, заваренный из отборных листьев.',
            description_en: 'Traditional green tea brewed from selected leaves.',
            price: 5000, 
            category: 'drinks', 
            image_url: 'https://images.unsplash.com/photo-1597481499750-3e6b22637e12?q=80&w=600&auto=format&fit=crop' 
          },
          { 
            id: 'p5', 
            title_uz: 'Limonad', 
            title_ru: 'Лимонад', 
            title_en: 'Lemonade', 
            description_uz: 'Limon va yalpiz qo\'shilgan tetiklashtiruvchi muzdek limonad.',
            description_ru: 'Освежающий ледяной лимонад с добавлением лимона и мяты.',
            description_en: 'Refreshing ice-cold lemonade with lemon and mint.',
            price: 15000, 
            category: 'drinks', 
            image_url: 'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?q=80&w=600&auto=format&fit=crop' 
          },
          { 
            id: 'p6', 
            title_uz: 'Medovik', 
            title_ru: 'Медовик', 
            title_en: 'Honey Cake', 
            description_uz: 'Asalli yumshoq korjlar va mayin qaymoqli kremdan tayyorlangan shirinlik.',
            description_ru: 'Нежный медовый торт с мягкими коржами и воздушным сметанным кремом.',
            description_en: 'Soft honey cake layers filled with delicate sour cream.',
            price: 20000, 
            category: 'dessert', 
            image_url: 'https://images.unsplash.com/photo-1606313564200-e75d5e30476c?q=80&w=600&auto=format&fit=crop' 
          }
        ]);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const fetchQueueStatus = async (orderId, initData) => {
    try {
      const response = await fetch(`${API_BASE}/orders/${orderId}/queue`, {
        headers: { 'Authorization': `Telegram ${initData || getTelegramInitData()}` }
      });
      if (response.ok) {
        const queueData = await response.json();
        setActiveOrderQueue(queueData);
      }
    } catch (err) {
      console.error('Failed to fetch queue:', err);
    }
  };

  // ----------------------------------------------------
  // REAL-TIME INTEGRATION
  // ----------------------------------------------------
  useEffect(() => {
    if (!isSupabaseConfigured || isDemo) return;

    // Connect to Supabase Realtime client
    const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
    
    // Subscribe to orders table updates
    const ordersSubscription = supabase
      .channel('public:orders')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'orders' }, payload => {
        console.log('🔔 Order Update Received in Realtime:', payload.new);
        
        // Refresh local orders list
        setMyOrders(prev => prev.map(o => o.id === payload.new.id ? { ...o, status: payload.new.status } : o));
        
        // If it's the user's active tracked order, update status/queue
        const trackedOrderId = activeOrderQueue?.orderId || myOrders.find(o => ['pending', 'accepted'].includes(o.status))?.id;
        if (trackedOrderId && payload.new.id === trackedOrderId) {
          fetchQueueStatus(trackedOrderId);
        }

        // If admin is logged in, refresh admin orders
        if (isAdminLoggedIn) {
          fetchAdminOrders();
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(ordersSubscription);
    };
  }, [isDemo, isAdminLoggedIn, activeOrderQueue]);

  // Fallback Polling when Supabase Realtime is not active (for Demo Mode)
  useEffect(() => {
    if (!isDemo && isSupabaseConfigured) return;

    const interval = setInterval(() => {
      const active = myOrders.find(o => ['pending', 'accepted'].includes(o.status));
      if (active) {
        if (isDemo) {
          const currentOrder = myOrders.find(o => o.id === active.id) || active;

          // Simulate simple queue movement in Demo mode
          setActiveOrderQueue(prev => {
            if (!prev || prev.orderId !== currentOrder.id) {
              return { position: 3, estimatedTime: 45, status: currentOrder.status, orderId: currentOrder.id };
            }
            const newPos = Math.max(1, prev.position - (Math.random() > 0.6 ? 1 : 0));
            // Transition status
            let newStatus = prev.status;
            if (newPos === 1 && prev.status === 'pending') {
              newStatus = 'accepted';
              // sync to mock DB
              setMyOrders(prevOrders => prevOrders.map(o => o.id === currentOrder.id ? { ...o, status: 'accepted' } : o));
              setAdminOrders(prevOrders => prevOrders.map(o => o.id === currentOrder.id ? { ...o, status: 'accepted' } : o));
            }
            return {
              position: newPos,
              estimatedTime: newPos * 15,
              status: newStatus,
              orderId: currentOrder.id
            };
          });
        } else {
          fetchQueueStatus(active.id);
        }
      } else {
        setActiveOrderQueue(null);
      }
    }, 6000); // Poll every 6s

    return () => clearInterval(interval);
  }, [myOrders, isDemo]);

  // ----------------------------------------------------
  // CART ACTIONS
  // ----------------------------------------------------
  const addToCart = (productId) => {
    setCart(prev => {
      const existing = prev.find(item => item.product_id === productId);
      if (existing) {
        return prev.map(item => item.product_id === productId ? { ...item, quantity: item.quantity + 1 } : item);
      }
      return [...prev, { product_id: productId, quantity: 1 }];
    });
  };

  const removeFromCart = (productId) => {
    setCart(prev => {
      const existing = prev.find(item => item.product_id === productId);
      if (existing && existing.quantity > 1) {
        return prev.map(item => item.product_id === productId ? { ...item, quantity: item.quantity - 1 } : item);
      }
      return prev.filter(item => item.product_id !== productId);
    });
  };

  const getCartTotal = () => {
    return cart.reduce((sum, item) => {
      const prod = products.find(p => p.id === item.product_id);
      return sum + (prod ? prod.price * item.quantity : 0);
    }, 0);
  };

  const handleCheckout = async () => {
    if (cart.length === 0) return;
    if (!phoneInput) {
      alert(t('phone_number') + ' kiritilishi shart');
      return;
    }

    if (isDemo) {
      // Simulate order checkout in Demo Mode
      const newOrder = {
        id: `demo_o_${Date.now()}`,
        total_price: getCartTotal(),
        status: 'pending',
        queue_number: myOrders.length + 1,
        order_type: orderType,
        address: addressInput,
        created_at: new Date().toISOString(),
        order_items: cart.map(item => {
          const prod = products.find(p => p.id === item.product_id);
          return {
            quantity: item.quantity,
            price: prod ? prod.price : 0,
            products: {
              title_uz: prod?.title_uz,
              title_ru: prod?.title_ru,
              title_en: prod?.title_en
            }
          };
        })
      };

      setMyOrders([newOrder, ...myOrders]);
      setActiveOrderQueue({
        position: 3,
        estimatedTime: 45,
        status: 'pending'
      });
      setCart([]);
      handleTabChange('orders');
      alert(t('checkout_success'));
      return;
    }

    try {
      const response = await fetch(`${API_BASE}/orders`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Telegram ${getTelegramInitData()}`
        },
        body: JSON.stringify({
          items: cart,
          order_type: orderType,
          address: addressInput,
          phone: phoneInput
        })
      });

      if (!response.ok) {
        throw new Error('Buyurtma berishda xatolik yuz berdi');
      }

      const resData = await response.json();
      setMyOrders([resData.order, ...myOrders]);
      setActiveOrderQueue(resData.queue);
      setCart([]);
      handleTabChange('orders');
      alert(t('checkout_success'));
    } catch (err) {
      alert(err.message);
    }
  };

  // ----------------------------------------------------
  // BOOKING ACTIONS
  // ----------------------------------------------------
  const handleBooking = async (e) => {
    e.preventDefault();
    if (!bookingTime) {
      alert('Iltimos vaqtni tanlang');
      return;
    }

    if (isDemo) {
      const newBooking = {
        id: `demo_b_${Date.now()}`,
        table_number: parseInt(bookingTable),
        booking_time: bookingTime,
        guests_count: parseInt(bookingGuests),
        status: 'pending',
        created_at: new Date().toISOString()
      };
      setMyBookings([newBooking, ...myBookings]);
      setBookingSuccessMsg(t('booking_success'));
      setBookingTime('');
      setTimeout(() => setBookingSuccessMsg(''), 4000);
      return;
    }

    try {
      const response = await fetch(`${API_BASE}/bookings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Telegram ${getTelegramInitData()}`
        },
        body: JSON.stringify({
          table_number: bookingTable,
          booking_time: bookingTime,
          guests_count: bookingGuests
        })
      });

      if (!response.ok) throw new Error('Stol band qilishda xatolik yuz berdi');

      const data = await response.json();
      setMyBookings([data, ...myBookings]);
      setBookingSuccessMsg(t('booking_success'));
      setBookingTime('');
      setTimeout(() => setBookingSuccessMsg(''), 4000);
    } catch (err) {
      alert(err.message);
    }
  };

  // ----------------------------------------------------
  // ADMIN PANEL ACTIONS
  // ----------------------------------------------------
  const handleAdminLogin = async (e) => {
    e.preventDefault();
    setAdminError('');

    if (isDemo) {
      if (adminUsername === 'admin' && adminPassword === 'admin123') {
        setIsAdminLoggedIn(true);
        setAdminToken('mock_jwt_token');
        generateMockAdminData();
        setAdminMenu(products);
      } else {
        setAdminError('Login yoki parol xato! (Demo login: admin / admin123)');
      }
      return;
    }

    try {
      const response = await fetch(`${API_BASE}/admin/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: adminUsername, password: adminPassword })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Kirish muvaffaqiyatsiz tugadi');
      }

      setAdminToken(data.token);
      setIsAdminLoggedIn(true);
      fetchAdminOrders(data.token);
      fetchAdminBookings(data.token);
      fetchAdminProducts(data.token);
    } catch (err) {
      setAdminError(err.message);
    }
  };

  const generateMockAdminData = () => {
    setAdminOrders([
      {
        id: 'o_mock_1',
        queue_number: 1,
        total_price: 35000,
        status: 'pending',
        order_type: 'delivery',
        address: 'Toshkent sh., Yunusobod tumani',
        created_at: new Date(Date.now() - 3600000).toISOString(),
        users: { name: 'Ali Valiyev', phone: '+998909998877' },
        order_items: [{ quantity: 1, price: 35000, products: { title_uz: 'Osh (Palov)', title_ru: 'Плов', title_en: 'Pilaf' } }]
      },
      {
        id: 'o_mock_2',
        queue_number: 2,
        total_price: 53000,
        status: 'accepted',
        order_type: 'pickup',
        address: '',
        created_at: new Date(Date.now() - 1800000).toISOString(),
        users: { name: 'Komil Samiyev', phone: '+998935554433' },
        order_items: [
          { quantity: 1, price: 28000, products: { title_uz: 'Lag\'mon', title_ru: 'Лагман', title_en: 'Lagman' } },
          { quantity: 2, price: 10000, products: { title_uz: 'Somsa', title_ru: 'Самса', title_en: 'Somsa' } }
        ]
      }
    ]);

    setAdminBookings([
      {
        id: 'b_mock_1',
        table_number: 3,
        booking_time: new Date(Date.now() + 86400000).toISOString(),
        guests_count: 4,
        status: 'pending',
        users: { name: 'Durdona opa', phone: '+998971112233' }
      }
    ]);
  };

  const fetchAdminOrders = async (token = adminToken) => {
    try {
      const response = await fetch(`${API_BASE}/admin/orders`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        setAdminOrders(await response.json());
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchAdminBookings = async (token = adminToken) => {
    try {
      const response = await fetch(`${API_BASE}/admin/bookings`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        setAdminBookings(await response.json());
      }
    } catch (e) {
      console.error(e);
    }
  };

  const updateOrderStatus = async (orderId, newStatus) => {
    if (isDemo) {
      setAdminOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: newStatus } : o));
      // Update customer state if matches
      setMyOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: newStatus } : o));
      return;
    }

    try {
      const response = await fetch(`${API_BASE}/admin/orders/${orderId}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${adminToken}`
        },
        body: JSON.stringify({ status: newStatus })
      });

      if (response.ok) {
        fetchAdminOrders();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const getFilteredAdminOrders = () => {
    return adminOrders.filter(order => {
      if (adminOrderFilter === 'pending') {
        return order.status === 'pending';
      }
      if (adminOrderFilter === 'accepted') {
        return order.status === 'accepted';
      }
      if (adminOrderFilter === 'history') {
        return ['completed', 'cancelled'].includes(order.status);
      }
      return true;
    });
  };

  const getAdminOrdersCount = (filter) => {
    return adminOrders.filter(order => {
      if (filter === 'pending') {
        return order.status === 'pending';
      }
      if (filter === 'accepted') {
        return order.status === 'accepted';
      }
      if (filter === 'history') {
        return ['completed', 'cancelled'].includes(order.status);
      }
      return true;
    }).length;
  };

  const updateBookingStatus = async (bookingId, newStatus) => {
    if (isDemo) {
      setAdminBookings(prev => prev.map(b => b.id === bookingId ? { ...b, status: newStatus } : b));
      // Update customer state
      setMyBookings(prev => prev.map(b => b.id === bookingId ? { ...b, status: newStatus } : b));
      return;
    }

    try {
      const response = await fetch(`${API_BASE}/admin/bookings/${bookingId}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${adminToken}`
        },
        body: JSON.stringify({ status: newStatus })
      });

      if (response.ok) {
        fetchAdminBookings();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // ----------------------------------------------------
  // AI LOAD STRESS TEST TRIGGER
  // ----------------------------------------------------
  const runLoadSimulation = async () => {
    setIsSimulating(true);
    setSimulationResult(null);

    if (isDemo) {
      // Mock stress test analysis
      setTimeout(() => {
        setSimulationResult({
          totalSimulated: 100,
          timeTakenMs: 432,
          averageTimePerOrderMs: "4.32",
          queueContiguous: true,
          status: "SUCCESS",
          message: "Demo Mode FIFO queues processed correctly. Order sequence preserved!"
        });
        setIsSimulating(false);
      }, 1500);
      return;
    }

    try {
      const response = await fetch(`${API_BASE}/admin/simulate-load`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${adminToken}`
        }
      });
      const data = await response.json();
      setSimulationResult(data);
      fetchAdminOrders();
    } catch (err) {
      alert('AI Stress Test failed: ' + err.message);
    } finally {
      setIsSimulating(false);
    }
  };

  // ----------------------------------------------------
  // ADMIN PRODUCT CRUD ACTIONS
  // ----------------------------------------------------
  
  const refreshProductsList = async () => {
    try {
      const prodRes = await fetch(`${API_BASE}/products`);
      if (prodRes.ok) {
        const prodData = await prodRes.json();
        setProducts(prodData);
      }
    } catch (e) {
      console.error('Failed to refresh products:', e);
    }
  };

  const fetchAdminProducts = async (token = adminToken) => {
    if (isDemo) {
      setAdminMenu(products);
      return;
    }
    try {
      const response = await fetch(`${API_BASE}/admin/products`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setAdminMenu(data);
      }
    } catch (e) {
      console.error('Failed to fetch admin products:', e);
    }
  };

  const handleOpenAddProduct = () => {
    setEditingProduct(null);
    setFormTitleUz('');
    setFormTitleRu('');
    setFormTitleEn('');
    setFormDescUz('');
    setFormDescRu('');
    setFormDescEn('');
    setFormCategory('national');
    setFormPrice('');
    setFormImageUrl('');
    setFormIsAvailable(true);
    setFormLangTab('uz');
    setImageLoadError(false);
    setProductFormOpen(true);
  };

  const handleOpenEditProduct = (product) => {
    setEditingProduct(product);
    setFormTitleUz(product.title_uz || '');
    setFormTitleRu(product.title_ru || '');
    setFormTitleEn(product.title_en || '');
    setFormDescUz(product.description_uz || '');
    setFormDescRu(product.description_ru || '');
    setFormDescEn(product.description_en || '');
    setFormCategory(product.category || 'national');
    setFormPrice(product.price || '');
    setFormImageUrl(product.image_url || '');
    setFormIsAvailable(product.is_available);
    setFormLangTab('uz');
    setImageLoadError(false);
    setProductFormOpen(true);
  };

  const handleSaveProduct = async (e) => {
    e.preventDefault();
    if (!formTitleUz) {
      alert('Taom nomi (O\'zbekcha) kiritilishi shart!');
      return;
    }
    if (!formPrice || isNaN(formPrice) || parseFloat(formPrice) <= 0) {
      alert('Narxi musbat raqam bo\'lishi shart!');
      return;
    }
    if (!formImageUrl || !formImageUrl.trim()) {
      alert('Iltimos, taom rasmi havolasini kiriting!');
      return;
    }
    const urlPattern = /^https?:\/\/.+/i;
    if (!urlPattern.test(formImageUrl)) {
      alert('Havola \'http://\' yoki \'https://\' bilan boshlanishi shart!');
      return;
    }

    const productData = {
      title_uz: formTitleUz,
      title_ru: formTitleRu || formTitleUz,
      title_en: formTitleEn || formTitleUz,
      description_uz: formDescUz,
      description_ru: formDescRu || formDescUz,
      description_en: formDescEn || formDescUz,
      category: formCategory,
      price: parseFloat(formPrice),
      image_url: formImageUrl,
      is_available: formIsAvailable
    };

    setIsSavingProduct(true);

    if (isDemo) {
      if (editingProduct) {
        // Edit mode in demo
        const updatedProds = products.map(p => p.id === editingProduct.id ? { ...p, ...productData } : p);
        setProducts(updatedProds);
        setAdminMenu(updatedProds);
      } else {
        // Add mode in demo
        const newProduct = {
          id: `p_demo_${Date.now()}`,
          ...productData
        };
        const updatedProds = [...products, newProduct];
        setProducts(updatedProds);
        setAdminMenu(updatedProds);
      }
      setProductFormOpen(false);
      setEditingProduct(null);
      setIsSavingProduct(false);
      return;
    }

    try {
      const url = editingProduct 
        ? `${API_BASE}/admin/products/${editingProduct.id}`
        : `${API_BASE}/admin/products`;
      const method = editingProduct ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${adminToken}`
        },
        body: JSON.stringify(productData)
      });

      if (!response.ok) {
        throw new Error('Taomni saqlashda xatolik yuz berdi.');
      }

      await fetchAdminProducts();
      await refreshProductsList();
      setProductFormOpen(false);
      setEditingProduct(null);
    } catch (err) {
      alert(err.message);
    } finally {
      setIsSavingProduct(false);
    }
  };

  const handleOpenDeleteProduct = (product) => {
    setProductToDelete(product);
    setDeleteConfirmOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!productToDelete) return;
    setIsDeletingProduct(true);

    if (isDemo) {
      const updatedProds = products.filter(p => p.id !== productToDelete.id);
      setProducts(updatedProds);
      setAdminMenu(updatedProds);
      setDeleteConfirmOpen(false);
      setProductToDelete(null);
      setIsDeletingProduct(false);
      return;
    }

    try {
      const response = await fetch(`${API_BASE}/admin/products/${productToDelete.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${adminToken}`
        }
      });

      if (!response.ok) {
        throw new Error('Taomni o\'chirishda xatolik yuz berdi.');
      }

      await fetchAdminProducts();
      await refreshProductsList();
      setDeleteConfirmOpen(false);
      setProductToDelete(null);
    } catch (err) {
      alert(err.message);
    } finally {
      setIsDeletingProduct(false);
    }
  };

  const getLocalizedTitle = (product) => {
    if (!product) return '';
    const lang = i18n.language;
    if (lang === 'ru') return product.title_ru || product.title_uz;
    if (lang === 'en') return product.title_en || product.title_uz;
    return product.title_uz;
  };

  const getLocalizedDescription = (product) => {
    if (!product) return '';
    const lang = i18n.language;
    if (lang === 'ru') return product.description_ru || product.description_uz || 'Блюдо приготовлено из высококачественных ингредиентов.';
    if (lang === 'en') return product.description_en || product.description_uz || 'Prepared from premium and high-quality ingredients.';
    return product.description_uz || 'Premium va sifatli masalliqlardan tayyorlangan taom.';
  };

  return (
    <div className="bg-dark-950 text-white min-h-screen pb-24 font-sans select-none">
      
      {/* ⚠️ DEMO MODE BANNER */}
      {isDemo && (
        <div className="bg-gradient-to-r from-amber-600 to-amber-800 text-xs text-center py-1.5 px-4 flex items-center justify-between font-medium">
          <span className="flex items-center gap-1.5">
            <Database className="w-3.5 h-3.5 animate-pulse" />
            Loyiha Demo (Local In-Memory DB) rejimida ishlamoqda.
          </span>
          <button 
            onClick={fetchAuth} 
            className="bg-white/20 hover:bg-white/30 text-white px-2 py-0.5 rounded text-[10px] flex items-center gap-1 transition-all"
          >
            <RefreshCw className="w-3 h-3" /> Qayta ulanish
          </button>
        </div>
      )}

      {/* HEADER */}
      <header className="glass sticky top-0 z-40 px-4 py-3 flex items-center justify-between border-b border-white/5">
        <div className="flex items-center gap-2">
          <div className="bg-gradient-to-tr from-brand-600 to-brand-400 p-2 rounded-xl shadow-premium">
            <Utensils className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="font-extrabold text-base tracking-tight text-white flex items-center gap-1">
              Milli Taste <Sparkles className="w-3.5 h-3.5 text-brand-400 animate-pulse" />
            </h1>
            <p className="text-[10px] text-zinc-400">Telegram Mini App</p>
          </div>
        </div>

        {/* User name & language switcher */}
        <div className="flex items-center gap-2">
          <select 
            value={i18n.language} 
            onChange={(e) => i18n.changeLanguage(e.target.value)}
            className="bg-dark-900 border border-white/10 rounded-lg text-xs px-2 py-1 outline-none text-zinc-300 font-medium cursor-pointer"
          >
            <option value="uz">O'zb</option>
            <option value="ru">Рус</option>
            <option value="en">Eng</option>
          </select>
          {user && (
            <div className="hidden xs:flex flex-col items-end">
              <span className="text-[11px] font-semibold text-zinc-200">{user.name.split(' ')[0]}</span>
              <span className="text-[8px] text-brand-400 capitalize">{user.role}</span>
            </div>
          )}
        </div>
      </header>

      {/* MAIN CONTENT AREA */}
      <main className="max-w-md mx-auto px-4 pt-4">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 text-zinc-400 gap-3">
            <RefreshCw className="w-8 h-8 animate-spin text-brand-500" />
            <p className="text-sm">Ma'lumotlar yuklanmoqda...</p>
          </div>
        ) : (
          <>
            {/* 1. MENU TAB */}
            {activeTab === 'menu' && (
              <div>
                {/* Categorized horizontal scrolling */}
                <div className="flex gap-2 overflow-x-auto pb-4 pt-1 mb-2 scrollbar-none">
                  {['all', 'national', 'drinks', 'dessert'].map((cat) => (
                    <button
                      key={cat}
                      onClick={() => {
                        // Custom filter logic
                        const el = document.getElementById(`category-${cat}`);
                        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                      }}
                      className="glass-card hover:border-brand-500/30 text-xs px-3.5 py-2 rounded-xl whitespace-nowrap text-zinc-300 hover:text-white transition-all font-medium"
                    >
                      {t(`categories.${cat}`)}
                    </button>
                  ))}
                </div>

                {/* Products list grouped by category */}
                {['national', 'drinks', 'dessert'].map((cat) => {
                  const catProducts = products.filter(p => p.category === cat);
                  if (catProducts.length === 0) return null;

                  return (
                    <div key={cat} id={`category-${cat}`} className="mb-6 scroll-mt-20">
                      <h2 className="text-sm font-bold text-zinc-400 tracking-wider uppercase mb-3 flex items-center gap-2">
                        <span className="w-1.5 h-3 bg-brand-500 rounded-full"></span>
                        {t(`categories.${cat}`)}
                      </h2>
                      <div className="grid grid-cols-1 gap-3">
                        {catProducts.map((prod) => {
                          const cartItem = cart.find(item => item.product_id === prod.id);
                          return (
                            <div 
                              key={prod.id} 
                              className="glass-card p-3 rounded-2xl flex gap-3.5 border border-white/5 shadow-glass hover:shadow-premium transition-all duration-300 group"
                            >
                              <div className="relative w-20 h-20 rounded-xl overflow-hidden bg-dark-900 flex-shrink-0">
                                <img 
                                  src={prod.image_url || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?q=80&w=200&auto=format&fit=crop'} 
                                  alt={getLocalizedTitle(prod)}
                                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                />
                              </div>
                              <div className="flex flex-col justify-between flex-grow">
                                <div>
                                  <h3 className="font-semibold text-sm text-zinc-100 group-hover:text-brand-400 transition-colors">
                                    {getLocalizedTitle(prod)}
                                  </h3>
                                  <p className="text-[10px] text-zinc-400 mt-1 line-clamp-2 leading-relaxed">
                                    {getLocalizedDescription(prod)}
                                  </p>
                                </div>
                                <div className="flex items-center justify-between mt-2 pt-1 border-t border-white/5">
                                  <span className="font-extrabold text-xs text-zinc-200">
                                    {prod.price.toLocaleString()} UZS
                                  </span>

                                  {/* Add button or counter */}
                                  {cartItem ? (
                                    <div className="flex items-center gap-2.5 bg-dark-900 border border-white/10 rounded-lg px-1.5 py-0.5 shadow-inner">
                                      <button 
                                        onClick={() => removeFromCart(prod.id)}
                                        className="text-zinc-400 hover:text-white p-0.5 rounded transition-colors"
                                      >
                                        <Minus className="w-3.5 h-3.5" />
                                      </button>
                                      <span className="text-xs font-bold text-brand-400 min-w-[12px] text-center">
                                        {cartItem.quantity}
                                      </span>
                                      <button 
                                        onClick={() => addToCart(prod.id)}
                                        className="text-zinc-400 hover:text-white p-0.5 rounded transition-colors"
                                      >
                                        <Plus className="w-3.5 h-3.5" />
                                      </button>
                                    </div>
                                  ) : (
                                    <button
                                      onClick={() => addToCart(prod.id)}
                                      className="bg-brand-600 hover:bg-brand-500 text-white font-semibold text-[10px] px-3 py-1.5 rounded-lg transition-all shadow-md active:scale-95"
                                    >
                                      {t('add_to_cart')}
                                    </button>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* 2. CART TAB */}
            {activeTab === 'cart' && (
              <div className="space-y-4">
                <h2 className="text-base font-bold flex items-center gap-2">
                  <ShoppingCart className="w-5 h-5 text-brand-500" />
                  {t('cart')}
                </h2>

                {cart.length === 0 ? (
                  <div className="glass-card rounded-2xl py-12 px-4 text-center border border-white/5">
                    <ShoppingCart className="w-12 h-12 text-zinc-600 mx-auto mb-3" />
                    <p className="text-sm text-zinc-400">{t('cart_empty')}</p>
                    <button 
                      onClick={() => handleTabChange('menu')}
                      className="mt-4 bg-brand-600 hover:bg-brand-500 text-white text-xs px-4 py-2 rounded-xl transition-all"
                    >
                      {t('menu')}ga o'tish
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="space-y-2">
                      {cart.map(item => {
                        const prod = products.find(p => p.id === item.product_id);
                        if (!prod) return null;
                        return (
                          <div key={item.product_id} className="glass-card p-3 rounded-xl flex justify-between items-center border border-white/5">
                            <div>
                              <h4 className="font-semibold text-xs text-zinc-200">{getLocalizedTitle(prod)}</h4>
                              <p className="text-[10px] text-zinc-400 mt-0.5">
                                {prod.price.toLocaleString()} UZS x {item.quantity}
                              </p>
                            </div>
                            <div className="flex items-center gap-3">
                              <span className="font-bold text-xs text-zinc-200">
                                {(prod.price * item.quantity).toLocaleString()} UZS
                              </span>
                              <div className="flex items-center bg-dark-900 border border-white/5 rounded-lg px-1 py-0.5">
                                <button onClick={() => removeFromCart(prod.id)} className="p-0.5 text-zinc-400"><Minus className="w-3 h-3" /></button>
                                <span className="text-xs font-semibold px-2">{item.quantity}</span>
                                <button onClick={() => addToCart(prod.id)} className="p-0.5 text-zinc-400"><Plus className="w-3 h-3" /></button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Order Preferences Form */}
                    <div className="glass-card p-4 rounded-2xl space-y-3.5 border border-white/5">
                      <h3 className="font-semibold text-xs text-zinc-300 uppercase tracking-wider">Buyurtma sozlamalari</h3>

                      {/* Delivery/Pickup Select */}
                      <div className="grid grid-cols-2 gap-2 p-1 bg-dark-950 rounded-xl border border-white/5">
                        <button
                          onClick={() => setOrderType('delivery')}
                          className={`text-xs py-2 rounded-lg font-medium transition-all ${
                            orderType === 'delivery' ? 'bg-brand-600 text-white shadow-md' : 'text-zinc-400 hover:text-zinc-200'
                          }`}
                        >
                          {t('delivery')}
                        </button>
                        <button
                          onClick={() => setOrderType('pickup')}
                          className={`text-xs py-2 rounded-lg font-medium transition-all ${
                            orderType === 'pickup' ? 'bg-brand-600 text-white shadow-md' : 'text-zinc-400 hover:text-zinc-200'
                          }`}
                        >
                          {t('pickup')}
                        </button>
                      </div>

                      {/* Phone input */}
                      <div className="space-y-1">
                        <label className="text-[11px] font-medium text-zinc-400 flex items-center gap-1.5">
                          <Phone className="w-3 h-3 text-brand-500" />
                          {t('phone_number')}
                        </label>
                        <input 
                          type="tel"
                          value={phoneInput}
                          onChange={(e) => setPhoneInput(e.target.value)}
                          placeholder="+998901234567"
                          className="glass-input w-full text-xs rounded-xl px-3 py-2.5 text-white"
                        />
                      </div>

                      {/* Address input (if Delivery selected) */}
                      {orderType === 'delivery' && (
                        <div className="space-y-1">
                          <label className="text-[11px] font-medium text-zinc-400 flex items-center gap-1.5">
                            <MapPin className="w-3 h-3 text-brand-500" />
                            {t('address')}
                          </label>
                          <textarea 
                            value={addressInput}
                            onChange={(e) => setAddressInput(e.target.value)}
                            placeholder="Toshkent sh., Chilonzor tumani, 9-kvartal, 12-uy..."
                            rows="2"
                            className="glass-input w-full text-xs rounded-xl px-3 py-2.5 text-white resize-none"
                          />
                        </div>
                      )}
                    </div>

                    {/* Total & Checkout button */}
                    <div className="glass-card p-4 rounded-2xl space-y-3.5 border border-white/5">
                      <div className="flex justify-between items-center">
                        <span className="text-zinc-400 text-xs font-semibold">{t('total')}:</span>
                        <span className="text-base font-extrabold text-brand-400">
                          {getCartTotal().toLocaleString()} UZS
                        </span>
                      </div>
                      <button
                        onClick={handleCheckout}
                        className="w-full bg-brand-600 hover:bg-brand-500 active:scale-95 text-white font-bold text-xs py-3 rounded-xl transition-all shadow-lg flex items-center justify-center gap-2"
                      >
                        <ShoppingCart className="w-4 h-4" />
                        {t('place_order')}
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}

            {/* 3. BOOKINGS TAB */}
            {activeTab === 'bookings' && (
              <div className="space-y-4">
                <h2 className="text-base font-bold flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-brand-500" />
                  {t('booking_title')}
                </h2>

                <div className="glass-card p-4 rounded-2xl border border-white/5">
                  <form onSubmit={handleBooking} className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      {/* Table Number */}
                      <div className="space-y-1">
                        <label className="text-[11px] font-medium text-zinc-400">{t('table_number')}</label>
                        <select 
                          value={bookingTable}
                          onChange={(e) => setBookingTable(e.target.value)}
                          className="glass-input w-full text-xs rounded-xl px-3 py-2.5 text-white cursor-pointer"
                        >
                          {[1, 2, 3, 4, 5, 6, 7, 8].map(num => (
                            <option key={num} value={num}>Stol #{num}</option>
                          ))}
                        </select>
                      </div>

                      {/* Guests Count */}
                      <div className="space-y-1">
                        <label className="text-[11px] font-medium text-zinc-400">{t('guests')}</label>
                        <select 
                          value={bookingGuests}
                          onChange={(e) => setBookingGuests(e.target.value)}
                          className="glass-input w-full text-xs rounded-xl px-3 py-2.5 text-white cursor-pointer"
                        >
                          {[1, 2, 4, 6, 8, 10].map(num => (
                            <option key={num} value={num}>{num} kishi</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {/* Booking Time */}
                    <div className="space-y-1">
                      <label className="text-[11px] font-medium text-zinc-400">{t('booking_time')}</label>
                      <input 
                        type="datetime-local"
                        value={bookingTime}
                        onChange={(e) => setBookingTime(e.target.value)}
                        className="glass-input w-full text-xs rounded-xl px-3 py-2.5 text-white cursor-pointer"
                      />
                    </div>

                    {bookingSuccessMsg && (
                      <div className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/35 text-[11px] p-2.5 rounded-xl flex items-center gap-2">
                        <Check className="w-4 h-4 flex-shrink-0" />
                        {bookingSuccessMsg}
                      </div>
                    )}

                    <button
                      type="submit"
                      className="w-full bg-brand-600 hover:bg-brand-500 text-white font-bold text-xs py-3 rounded-xl transition-all shadow-md active:scale-95 flex items-center justify-center gap-2"
                    >
                      <Calendar className="w-4 h-4" />
                      {t('book_now')}
                    </button>
                  </form>
                </div>

                {/* My bookings history */}
                {myBookings.length > 0 && (
                  <div className="space-y-2">
                    <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Mening bronlarim</h3>
                    <div className="space-y-2">
                      {myBookings.map((b) => (
                        <div key={b.id} className="glass-card p-3 rounded-xl flex items-center justify-between border border-white/5">
                          <div>
                            <p className="text-xs font-semibold text-zinc-200">Stol #{b.table_number} ({b.guests_count} kishi)</p>
                            <p className="text-[10px] text-zinc-400 mt-1 flex items-center gap-1">
                              <Clock className="w-3 h-3 text-zinc-400" />
                              {new Date(b.booking_time).toLocaleString('uz-UZ', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                            </p>
                          </div>
                          <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${
                            b.status === 'confirmed' ? 'bg-emerald-500/20 text-emerald-400' :
                            b.status === 'cancelled' ? 'bg-rose-500/20 text-rose-400' : 'bg-amber-500/20 text-amber-400'
                          }`}>
                            {t(`booking_${b.status}`)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* 4. MY ORDERS / LIVE QUEUE TRACKER */}
            {activeTab === 'orders' && (
              <div className="space-y-4">
                <h2 className="text-base font-bold flex items-center gap-2">
                  <Clock className="w-5 h-5 text-brand-500" />
                  {t('queue_title')}
                </h2>

                {/* Active real-time queue card */}
                {activeOrderQueue && (
                  <div className="glass-card p-4 rounded-2xl border border-white/10 shadow-premium bg-gradient-to-br from-dark-900 to-dark-950 animate-pulse-subtle">
                    <div className="flex justify-between items-start pb-3 border-b border-white/5">
                      <div>
                        <span className="text-[10px] bg-brand-500/20 text-brand-400 border border-brand-500/35 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">
                          Navbatdagi holat
                        </span>
                        <p className="text-[10px] text-zinc-400 mt-1">FIFO hisob-kitobi bo'yicha</p>
                      </div>
                      <div className="text-right">
                        <p className="text-[11px] text-zinc-400">{t('queue_status')}</p>
                        <p className="text-xs font-bold text-brand-400 capitalize">{t(`status_${activeOrderQueue.status}`)}</p>
                      </div>
                    </div>

                    {/* FIFO visual queues */}
                    {activeOrderQueue.status === 'accepted' ? (
                      (() => {
                        const activeOrderInfo = myOrders.find(o => o.id === activeOrderQueue.orderId);
                        const isPickup = activeOrderInfo ? activeOrderInfo.order_type === 'pickup' : false;
                        return (
                          <div className="py-6 flex flex-col items-center justify-center text-center space-y-3 animate-fade-in">
                            <div className={`w-16 h-16 rounded-full flex items-center justify-center animate-bounce shadow-lg ${
                              isPickup 
                                ? 'bg-amber-500/15 border border-amber-500/30 text-amber-400 shadow-amber-500/10' 
                                : 'bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 shadow-emerald-500/10'
                            }`}>
                              {isPickup ? <ShoppingBag className="w-8 h-8" /> : <Truck className="w-8 h-8" />}
                            </div>
                            <h4 className={`text-sm font-extrabold ${isPickup ? 'text-amber-400' : 'text-emerald-400'}`}>
                              {isPickup ? "Buyurtmangiz tayyorlanmoqda!" : "Buyurtmangiz yo'lda!"}
                            </h4>
                            <p className="text-xs text-zinc-300 max-w-[240px] pb-2">
                              {isPickup 
                                ? "Buyurtmangiz qabul qilindi. Oshxonada pishirilmoqda, tayyor bo'lgach restorandan olib ketishingiz mumkin!" 
                                : "Buyurtmangiz qabul qilindi va tayyorlanmoqda/yo'lda. Kuryerimiz tez orada manzilingizga yetkazib beradi!"}
                            </p>
                            {activeOrderQueue.position > 0 && (
                              <div className="pt-2 border-t border-white/5 w-full">
                                <span className="text-[10px] text-zinc-400 uppercase tracking-wider block">Navbatdagi o'rni</span>
                                <span className="text-base font-black text-brand-400">#{activeOrderQueue.position}</span>
                              </div>
                            )}
                          </div>
                        );
                      })()
                    ) : (
                      <>
                        <div className="py-5 flex flex-col items-center justify-center">
                          <div className="text-5xl font-black text-brand-400 tracking-tight flex items-end">
                            #{activeOrderQueue.position}
                            <span className="text-xs text-zinc-400 ml-1 mb-2">/ navbat</span>
                          </div>
                          <p className="text-xs text-zinc-300 mt-2 font-medium">
                            {t('queue_position_text', { position: activeOrderQueue.position })}
                          </p>

                          <div className="w-full bg-dark-900 rounded-full h-1.5 mt-5 overflow-hidden">
                            <div 
                              className="bg-brand-500 h-1.5 rounded-full transition-all duration-1000"
                              style={{ width: `${Math.max(10, 100 - (activeOrderQueue.position * 15))}%` }}
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4 pt-3.5 border-t border-white/5 text-center">
                          <div>
                            <p className="text-[10px] text-zinc-400">{t('queue_wait_time')}</p>
                            <p className="text-sm font-bold text-zinc-100 mt-0.5">
                              ~ {t('queue_wait_time_text', { time: activeOrderQueue.estimatedTime })}
                            </p>
                          </div>
                          <div>
                            <p className="text-[10px] text-zinc-400">Restoran yuklamasi</p>
                            <p className="text-sm font-bold text-amber-400 mt-0.5">Yuqori (High Load)</p>
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                )}

                {/* Orders History List */}
                <div className="space-y-3">
                  <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Buyurtmalar tarixi</h3>
                  
                  {myOrders.length === 0 ? (
                    <div className="glass-card rounded-2xl py-8 text-center text-zinc-500 text-xs">
                      Sizda hali buyurtmalar mavjud emas.
                    </div>
                  ) : (
                    myOrders.map(order => (
                      <div 
                        key={order.id} 
                        onClick={() => {
                          if (['pending', 'accepted'].includes(order.status)) {
                            if (isDemo) {
                              setActiveOrderQueue({
                                position: 3,
                                estimatedTime: 45,
                                status: order.status,
                                orderId: order.id
                              });
                            } else {
                              fetchQueueStatus(order.id);
                            }
                          }
                        }}
                        className="glass-card p-4 rounded-xl border border-white/5 shadow-sm space-y-2.5 cursor-pointer hover:border-brand-500/25 transition-all"
                      >
                        <div className="flex justify-between items-center">
                          <span className="text-xs font-bold text-zinc-200">
                            Buyurtma #{order.queue_number}
                          </span>
                          <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${
                            order.status === 'completed' ? 'bg-emerald-500/20 text-emerald-400' :
                            order.status === 'cancelled' ? 'bg-rose-500/20 text-rose-400' :
                            order.status === 'pending' ? 'bg-blue-500/20 text-blue-400' :
                            order.status === 'accepted' ? 'bg-amber-500/20 text-amber-400' :
                            'bg-purple-500/20 text-purple-400'
                          }`}>
                            {t(`status_${order.status}`)}
                          </span>
                        </div>

                        {/* Items list summary */}
                        <div className="text-[11px] text-zinc-400 space-y-0.5">
                          {order.order_items && order.order_items.map((item, idx) => (
                            <div key={idx} className="flex justify-between">
                              <span>{item.products ? (i18n.language === 'ru' ? item.products.title_ru : i18n.language === 'en' ? item.products.title_en : item.products.title_uz) : 'Taom'} x {item.quantity}</span>
                              <span>{(item.price * item.quantity).toLocaleString()} UZS</span>
                            </div>
                          ))}
                        </div>

                        <div className="flex justify-between items-center pt-2 border-t border-white/5">
                          <span className="text-[10px] text-zinc-500">
                            {new Date(order.created_at).toLocaleDateString('uz-UZ', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                          <span className="text-xs font-extrabold text-brand-400">
                            {order.total_price.toLocaleString()} UZS
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {/* 5. ADMIN PORTAL TAB */}
            {activeTab === 'admin' && (
              <div className="space-y-4">
                <h2 className="text-base font-bold flex items-center gap-2">
                  <ShieldAlert className="w-5 h-5 text-rose-500" />
                  Admin Boshqaruv Paneli
                </h2>

                {!isAdminLoggedIn ? (
                  /* Check if client is trying to access and we are not showing login explicitly */
                  (user && user.role === 'client' && !showAdminLoginForm) ? (
                    <div className="glass-card p-6 rounded-2xl border border-rose-500/20 bg-gradient-to-br from-dark-900 to-rose-950/10 text-center space-y-4 animate-fade-in">
                      <div className="w-16 h-16 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-500 flex items-center justify-center mx-auto animate-pulse">
                        <ShieldAlert className="w-8 h-8" />
                      </div>
                      <div className="space-y-2">
                        <h3 className="font-extrabold text-base text-zinc-100">403 Forbidden</h3>
                        <p className="text-xs text-zinc-400 leading-relaxed px-2">
                          Siz ushbu sahifaga kirish huquqiga ega emassiz. Admin boshqaruv paneli faqat restoran xodimlari uchun ruxsat etilgan.
                        </p>
                      </div>
                      <div className="flex flex-col gap-2.5 pt-2">
                        <button
                          type="button"
                          onClick={() => handleTabChange('menu')}
                          className="bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs py-2.5 rounded-xl transition-all shadow-md active:scale-95"
                        >
                          Bosh sahifaga qaytish
                        </button>
                        <button
                          type="button"
                          onClick={() => setShowAdminLoginForm(true)}
                          className="text-[10px] text-zinc-400 hover:text-zinc-200 transition-colors underline"
                        >
                          Admin sifatida tizimga kirish
                        </button>
                      </div>
                    </div>
                  ) : (
                    /* Admin login form */
                    <div className="glass-card p-4 rounded-2xl border border-white/5 space-y-4 animate-fade-in">
                      <div className="flex justify-between items-center">
                        <h3 className="text-xs font-semibold text-zinc-300">Tizimga kirish (JWT token)</h3>
                        {user && user.role === 'client' && (
                          <button
                            type="button"
                            onClick={() => setShowAdminLoginForm(false)}
                            className="text-[10px] text-rose-400 hover:text-rose-300"
                          >
                            Orqaga (403)
                          </button>
                        )}
                      </div>
                      {adminError && (
                        <div className="bg-rose-500/20 text-rose-400 border border-rose-500/35 text-[11px] p-2.5 rounded-xl flex items-center gap-2">
                          <AlertCircle className="w-4 h-4 flex-shrink-0" />
                          {adminError}
                        </div>
                      )}
                    <form onSubmit={handleAdminLogin} className="space-y-3">
                      <div>
                        <label className="text-[10px] font-medium text-zinc-400 block mb-1">Admin Login</label>
                        <input 
                          type="text" 
                          value={adminUsername}
                          onChange={(e) => setAdminUsername(e.target.value)}
                          placeholder="admin"
                          className="glass-input w-full text-xs rounded-xl px-3 py-2.5 text-white"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-medium text-zinc-400 block mb-1">Parol</label>
                        <input 
                          type="password" 
                          value={adminPassword}
                          onChange={(e) => setAdminPassword(e.target.value)}
                          placeholder="••••••••"
                          className="glass-input w-full text-xs rounded-xl px-3 py-2.5 text-white"
                        />
                      </div>
                      <button 
                        type="submit" 
                        className="w-full bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs py-3 rounded-xl transition-all shadow-md"
                      >
                        Kirish
                      </button>
                    </form>
                  </div>
                )) : (
                  /* Admin Dashboard panel content */
                  <div className="space-y-5 animate-fade-in">
                    
                    {/* Admin Sub-Tabs */}
                    <div className="grid grid-cols-3 gap-1.5 p-1 bg-dark-900 rounded-xl border border-white/5 mb-2">
                      <button
                        onClick={() => setAdminSubTab('orders')}
                        className={`text-[10px] xs:text-xs py-2 rounded-lg font-bold uppercase transition-all ${
                          adminSubTab === 'orders' ? 'bg-rose-600 text-white shadow-md' : 'text-zinc-400 hover:text-zinc-200'
                        }`}
                      >
                        Buyurtmalar
                      </button>
                      <button
                        onClick={() => setAdminSubTab('bookings')}
                        className={`text-[10px] xs:text-xs py-2 rounded-lg font-bold uppercase transition-all ${
                          adminSubTab === 'bookings' ? 'bg-rose-600 text-white shadow-md' : 'text-zinc-400 hover:text-zinc-200'
                        }`}
                      >
                        Bronlar
                      </button>
                      <button
                        onClick={() => setAdminSubTab('menu')}
                        className={`text-[10px] xs:text-xs py-2 rounded-lg font-bold uppercase transition-all ${
                          adminSubTab === 'menu' ? 'bg-rose-600 text-white shadow-md' : 'text-zinc-400 hover:text-zinc-200'
                        }`}
                      >
                        Menyu
                      </button>
                    </div>

                    {/* SUB-TAB 1: ORDERS */}
                    {adminSubTab === 'orders' && (
                      <div className="space-y-5">
                        {/* Simulator Trigger */}
                        <div className="glass-card p-4 rounded-2xl border border-rose-500/20 bg-gradient-to-r from-dark-900 to-rose-950/20 space-y-3">
                          <div className="flex items-center gap-2 text-rose-400">
                            <Sparkles className="w-5 h-5 animate-pulse" />
                            <h3 className="font-bold text-xs uppercase tracking-wider">AI Stress-Test Moduli</h3>
                          </div>
                          <p className="text-[11px] text-zinc-400 leading-relaxed">
                            Tizim yuklamasini va FIFO navbat algoritmlarini sinash uchun bir vaqtning o'zida 100 ta soxta buyurtmalarni (load simulation) hosil qiling.
                          </p>

                          {simulationResult && (
                            <div className="bg-dark-950 p-3 rounded-xl border border-white/5 text-[10px] space-y-1.5 font-mono">
                              <p className="font-bold text-emerald-400">Hisobot: {simulationResult.status}</p>
                              <p>Umumiy buyurtmalar: {simulationResult.totalSimulated}</p>
                              <p>Bajarilish vaqti: {simulationResult.timeTakenMs} ms</p>
                              <p>O'rtacha vaqt: {simulationResult.averageTimePerOrderMs} ms</p>
                              <p className={simulationResult.queueContiguous ? "text-emerald-400" : "text-rose-400"}>
                                Navbat kontiguity (FIFO): {simulationResult.queueContiguous ? "OK" : "WARNING"}
                              </p>
                              <p className="text-zinc-400">{simulationResult.message}</p>
                            </div>
                          )}

                          <button
                            onClick={runLoadSimulation}
                            disabled={isSimulating}
                            className="w-full bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs py-2.5 rounded-xl transition-all shadow-md flex items-center justify-center gap-2"
                          >
                            {isSimulating ? (
                              <>
                                <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Simulyatsiya bajarilmoqda...
                              </>
                            ) : (
                              <>
                                <Sparkles className="w-3.5 h-3.5" /> 100 ta AI Buyurtma Yaratish
                              </>
                            )}
                          </button>
                        </div>

                        {/* Active Order Stream monitor */}
                        <div className="space-y-4">
                          <div className="flex justify-between items-center">
                            <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Buyurtmalar Monitori</h3>
                            <button 
                              onClick={() => isDemo ? generateMockAdminData() : fetchAdminOrders()}
                              className="text-[10px] text-zinc-400 hover:text-white flex items-center gap-1 transition-colors"
                            >
                              <RefreshCw className="w-3 h-3" /> Yangilash
                            </button>
                          </div>

                          {/* Premium Tab switcher */}
                          <div className="flex gap-1.5 p-1 bg-dark-950/80 rounded-xl border border-white/5 overflow-x-auto scrollbar-none shadow-inner">
                            {[
                              { id: 'pending', label: 'Qabul qilish', count: getAdminOrdersCount('pending') },
                              { id: 'accepted', label: 'Yakunlash', count: getAdminOrdersCount('accepted') },
                              { id: 'history', label: 'Tarix', count: getAdminOrdersCount('history') }
                            ].map(tab => (
                              <button
                                key={tab.id}
                                onClick={() => setAdminOrderFilter(tab.id)}
                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-extrabold uppercase whitespace-nowrap transition-all ${
                                  adminOrderFilter === tab.id
                                    ? 'bg-rose-600 text-white shadow-sm scale-102'
                                    : 'text-zinc-400 hover:text-zinc-200 hover:bg-white/5'
                                }`}
                              >
                                {tab.label}
                                <span className={`px-1.5 py-0.5 rounded-full text-[9px] font-black ${
                                  adminOrderFilter === tab.id
                                    ? 'bg-rose-800 text-rose-100'
                                    : 'bg-dark-900 text-zinc-400'
                                }`}>
                                  {tab.count}
                                </span>
                              </button>
                            ))}
                          </div>

                          {getFilteredAdminOrders().length === 0 ? (
                            <p className="text-xs text-zinc-500 text-center py-6 glass-card rounded-xl border border-white/5">
                              Ushbu bo'limda buyurtmalar mavjud emas.
                            </p>
                          ) : (
                            <div className="space-y-3">
                              {getFilteredAdminOrders().map(order => (
                                <div 
                                  key={order.id} 
                                  className={`glass-card p-3.5 rounded-xl border space-y-2.5 text-xs transition-all border-l-4 ${
                                    order.order_type === 'pickup' 
                                      ? 'border-white/5 border-l-amber-500 bg-amber-500/[0.02] hover:bg-amber-500/[0.04]' 
                                      : 'border-white/5 border-l-orange-500 bg-orange-500/[0.02] hover:bg-orange-500/[0.04]'
                                  }`}
                                >
                                  <div className="flex justify-between items-center pb-2 border-b border-white/5">
                                    <div className="flex items-center gap-2">
                                      <span className="font-extrabold text-zinc-200 text-xs">Navbat #{order.queue_number}</span>
                                      <span className={`text-[9px] px-1.5 py-0.5 rounded font-black uppercase tracking-wider ${
                                        order.order_type === 'pickup'
                                          ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                                          : 'bg-orange-500/10 text-orange-400 border border-orange-500/20'
                                      }`}>
                                        {order.order_type === 'pickup' ? 'Pick-up' : 'Delivery'}
                                      </span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <span className={`text-[9px] px-2 py-0.5 rounded-full font-bold uppercase ${
                                        order.status === 'completed' ? 'bg-emerald-500/20 text-emerald-400' :
                                        order.status === 'cancelled' ? 'bg-rose-500/20 text-rose-400' :
                                        order.status === 'pending' ? 'bg-blue-500/20 text-blue-400' :
                                        order.status === 'accepted' ? 'bg-amber-500/20 text-amber-400' :
                                        'bg-purple-500/20 text-purple-400'
                                      }`}>
                                        {t(`status_${order.status}`)}
                                      </span>
                                      <span className="font-extrabold text-brand-400">{order.total_price.toLocaleString()} UZS</span>
                                    </div>
                                  </div>

                                  <div className="text-zinc-400 text-[11px] space-y-1">
                                    <p><span className="font-semibold text-zinc-300">Mijoz:</span> {order.users?.name || 'Simulator'} ({order.users?.phone || 'No phone'})</p>
                                    {order.address && <p><span className="font-semibold text-zinc-300">Manzil:</span> {order.address}</p>}
                                    <p className="font-semibold text-zinc-300">Taomlar:</p>
                                    <ul className="list-disc list-inside pl-1 text-zinc-300">
                                      {order.order_items.map((item, i) => (
                                        <li key={i}>{item.products ? item.products.title_uz : 'Taom'} x{item.quantity}</li>
                                      ))}
                                    </ul>
                                  </div>

                                  {/* Dynamic Workflow action buttons */}
                                  {(() => {
                                    const s = order.status;

                                    if (s === 'completed' || s === 'cancelled') {
                                      return null;
                                    }

                                    return (
                                      <div className="flex justify-between items-center gap-2 w-full pt-2.5 border-t border-white/5">
                                        <div className="flex gap-2">
                                          {s === 'pending' && (
                                            <button
                                              onClick={() => updateOrderStatus(order.id, 'accepted')}
                                              className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[9px] px-2.5 py-1.5 rounded uppercase tracking-wider transition-all"
                                            >
                                              Qabul qilish
                                            </button>
                                          )}
                                          
                                          {s === 'accepted' && (
                                            <button
                                              onClick={() => updateOrderStatus(order.id, 'completed')}
                                              className="bg-blue-600 hover:bg-blue-500 text-white font-bold text-[9px] px-2.5 py-1.5 rounded uppercase tracking-wider transition-all"
                                            >
                                              Yakunlash
                                            </button>
                                          )}
                                        </div>

                                        <button
                                          onClick={() => updateOrderStatus(order.id, 'cancelled')}
                                          className="bg-rose-950/20 hover:bg-rose-950/45 text-rose-400 border border-rose-500/20 font-bold text-[9px] px-2.5 py-1.5 rounded uppercase tracking-wider transition-all ml-auto"
                                        >
                                          Rad etish
                                        </button>
                                      </div>
                                    );
                                  })()}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* SUB-TAB 2: BOOKINGS */}
                    {adminSubTab === 'bookings' && (
                      <div className="space-y-2.5 animate-fade-in">
                        <div className="flex justify-between items-center">
                          <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Bronlar Monitori</h3>
                          <button 
                            onClick={() => isDemo ? generateMockAdminData() : fetchAdminBookings()}
                            className="text-[10px] text-zinc-400 hover:text-white flex items-center gap-1"
                          >
                            <RefreshCw className="w-3 h-3" /> Yangilash
                          </button>
                        </div>
                        {adminBookings.length === 0 ? (
                          <p className="text-xs text-zinc-500 text-center py-2">Bronlar mavjud emas.</p>
                        ) : (
                          <div className="space-y-2">
                            {adminBookings.map((b) => (
                              <div key={b.id} className="glass-card p-3 rounded-xl border border-white/5 text-xs space-y-2">
                                <div className="flex justify-between">
                                  <span className="font-bold text-zinc-200">Stol #{b.table_number} ({b.guests_count} kishi)</span>
                                  <span className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase ${
                                    b.status === 'confirmed' ? 'bg-emerald-500/20 text-emerald-400' :
                                    b.status === 'cancelled' ? 'bg-rose-500/20 text-rose-400' : 'bg-amber-500/20 text-amber-400'
                                  }`}>
                                    {b.status}
                                  </span>
                                </div>
                                <div className="text-zinc-400 text-[11px]">
                                  <p><span className="font-semibold text-zinc-300">Mijoz:</span> {b.users?.name} ({b.users?.phone})</p>
                                  <p><span className="font-semibold text-zinc-300">Sana/Vaqt:</span> {new Date(b.booking_time).toLocaleString()}</p>
                                </div>
                                {b.status === 'pending' && (
                                  <div className="flex gap-2 pt-1">
                                    <button 
                                      onClick={() => updateBookingStatus(b.id, 'confirmed')}
                                      className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[9px] px-2.5 py-1 rounded uppercase transition-all"
                                    >
                                      Tasdiqlash
                                    </button>
                                    <button 
                                      onClick={() => updateBookingStatus(b.id, 'cancelled')}
                                      className="bg-rose-950/20 text-rose-400 hover:bg-rose-950/40 font-bold text-[9px] px-2.5 py-1 rounded uppercase transition-all"
                                    >
                                      Bekor qilish
                                    </button>
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    {/* SUB-TAB 3: MENU CRUD */}
                    {adminSubTab === 'menu' && (
                      <div className="space-y-4 animate-fade-in">
                        <div className="flex justify-between items-center gap-2">
                          <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Menyu Boshqaruvi</h3>
                          <button
                            onClick={handleOpenAddProduct}
                            className="bg-rose-600 hover:bg-rose-500 text-white font-bold text-[10px] px-3.5 py-2 rounded-xl transition-all shadow-md flex items-center gap-1 active:scale-95"
                          >
                            <Plus className="w-3.5 h-3.5" /> Qo'shish
                          </button>
                        </div>

                        {/* Search and category filters */}
                        <div className="flex flex-col gap-2">
                          <input
                            type="text"
                            value={adminSearchQuery}
                            onChange={(e) => setAdminSearchQuery(e.target.value)}
                            placeholder="Taom nomini qidirish..."
                            className="glass-input text-xs rounded-xl px-3 py-2.5 text-white w-full"
                          />
                          <select
                            value={adminCategoryFilter}
                            onChange={(e) => setAdminCategoryFilter(e.target.value)}
                            className="glass-input text-xs rounded-xl px-3 py-2.5 text-zinc-300 cursor-pointer bg-dark-900 outline-none w-full"
                          >
                            <option value="all">Barcha turkumlar</option>
                            <option value="national">Milliy taomlar</option>
                            <option value="drinks">Ichimliklar</option>
                            <option value="dessert">Desertlar</option>
                          </select>
                        </div>

                        {/* Table/List of products */}
                        <div className="space-y-2.5 max-h-[50vh] overflow-y-auto pr-1">
                          {adminMenu.filter(p => {
                            const q = adminSearchQuery.toLowerCase();
                            const matchesQuery = (p.title_uz || '').toLowerCase().includes(q) ||
                                                 (p.title_ru || '').toLowerCase().includes(q) ||
                                                 (p.title_en || '').toLowerCase().includes(q) ||
                                                 (p.description_uz || '').toLowerCase().includes(q) ||
                                                 (p.description_ru || '').toLowerCase().includes(q) ||
                                                 (p.description_en || '').toLowerCase().includes(q);
                            const matchesCategory = adminCategoryFilter === 'all' || p.category === adminCategoryFilter;
                            return matchesQuery && matchesCategory;
                          }).length === 0 ? (
                            <p className="text-xs text-zinc-500 text-center py-6">Hech qanday taom topilmadi.</p>
                          ) : (
                            adminMenu
                              .filter(p => {
                                const q = adminSearchQuery.toLowerCase();
                                const matchesQuery = (p.title_uz || '').toLowerCase().includes(q) ||
                                                     (p.title_ru || '').toLowerCase().includes(q) ||
                                                     (p.title_en || '').toLowerCase().includes(q) ||
                                                     (p.description_uz || '').toLowerCase().includes(q) ||
                                                     (p.description_ru || '').toLowerCase().includes(q) ||
                                                     (p.description_en || '').toLowerCase().includes(q);
                                const matchesCategory = adminCategoryFilter === 'all' || p.category === adminCategoryFilter;
                                return matchesQuery && matchesCategory;
                              })
                              .map(p => (
                                <div key={p.id} className="glass-card p-3 rounded-xl border border-white/5 flex gap-3 items-center justify-between">
                                  <div className="flex items-center gap-3 min-w-0">
                                    <div className="w-12 h-12 rounded-lg overflow-hidden bg-dark-900 flex-shrink-0 border border-white/5">
                                      <img 
                                        src={p.image_url || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?q=80&w=200&auto=format&fit=crop'} 
                                        alt={p.title_uz} 
                                        className="w-full h-full object-cover"
                                      />
                                    </div>
                                    <div className="min-w-0">
                                      <h4 className="font-semibold text-xs text-zinc-200 truncate">{p.title_uz}</h4>
                                      <p className="text-[9px] text-zinc-400 capitalize mt-0.5">
                                        {p.price.toLocaleString()} UZS
                                      </p>
                                      <span className={`inline-block text-[8px] font-bold px-1.5 py-0.5 rounded mt-1 uppercase ${
                                        p.is_available ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                                      }`}>
                                        {p.is_available ? 'Sotuvda bor' : 'Tugagan'}
                                      </span>
                                    </div>
                                  </div>
                                  <div className="flex gap-2 flex-shrink-0">
                                    <button
                                      onClick={() => handleOpenEditProduct(p)}
                                      className="p-2 text-zinc-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors border border-white/5"
                                      title="Tahrirlash"
                                    >
                                      <Sparkles className="w-3.5 h-3.5 text-blue-400" />
                                    </button>
                                    <button
                                      onClick={() => handleOpenDeleteProduct(p)}
                                      className="p-2 text-zinc-400 hover:text-rose-400 hover:bg-rose-950/10 rounded-lg transition-colors border border-white/5"
                                      title="O'chirish"
                                    >
                                      <Trash2 className="w-3.5 h-3.5 text-rose-500" />
                                    </button>
                                  </div>
                                </div>
                              ))
                          )}
                        </div>
                      </div>
                    )}

                    {/* Logout button */}
                    <button
                      onClick={() => {
                        setIsAdminLoggedIn(false);
                        setAdminToken('');
                      }}
                      className="w-full border border-white/10 hover:border-rose-500/30 text-zinc-400 hover:text-rose-400 text-xs py-2.5 rounded-xl flex items-center justify-center gap-2 transition-all mt-4"
                    >
                      <LogOut className="w-4 h-4" />
                      Admin Paneldan Chiqish
                    </button>

                  </div>
                )}
              </div>
            )}
          </>
        )}
      </main>

      {/* ➕ ADD/EDIT PRODUCT MODAL */}
      {productFormOpen && (
        <div className="fixed inset-0 bg-dark-950/80 backdrop-blur-md flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="glass-card w-full max-w-md rounded-2xl border border-white/10 overflow-hidden shadow-premium flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="p-4 border-b border-white/5 flex justify-between items-center bg-gradient-to-r from-dark-900 to-rose-950/20">
              <h3 className="font-extrabold text-sm uppercase tracking-wider text-white flex items-center gap-1.5">
                <Utensils className="w-4 h-4 text-rose-500" />
                {editingProduct ? "Taomni Tahrirlash" : "Yangi Taom Qo'shish"}
              </h3>
              <button 
                onClick={() => setProductFormOpen(false)} 
                className="text-zinc-400 hover:text-white transition-colors text-sm font-bold p-1"
              >
                ✕
              </button>
            </div>

            {/* Modal Content / Form */}
            <form onSubmit={handleSaveProduct} className="flex-grow overflow-y-auto p-4 space-y-4">
              {/* Language Tabs */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">Tilni tanlang (Tillar bo'yicha kiriting)</label>
                <div className="grid grid-cols-3 gap-1 bg-dark-900 p-1 rounded-xl border border-white/5">
                  {[
                    { id: 'uz', label: "O'zbekcha" },
                    { id: 'ru', label: 'Русский' },
                    { id: 'en', label: 'English' }
                  ].map(tab => (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setFormLangTab(tab.id)}
                      className={`text-[10px] py-1.5 rounded-lg font-bold transition-all ${
                        formLangTab === tab.id ? 'bg-rose-600 text-white shadow-md' : 'text-zinc-400 hover:text-zinc-200'
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Title input per language tab */}
              <div className="space-y-3.5 bg-dark-900/50 p-3 rounded-xl border border-white/5">
                {formLangTab === 'uz' && (
                  <div className="space-y-1">
                    <label className="text-[10px] font-semibold text-zinc-400 block">Taom nomi (UZ) *</label>
                    <input
                      type="text"
                      value={formTitleUz}
                      onChange={(e) => setFormTitleUz(e.target.value)}
                      placeholder="Masalan: Osh (Palov)"
                      required
                      className="glass-input w-full text-xs rounded-xl px-3 py-2 text-white"
                    />
                  </div>
                )}
                {formLangTab === 'ru' && (
                  <div className="space-y-1">
                    <label className="text-[10px] font-semibold text-zinc-400 block">Название блюда (RU)</label>
                    <input
                      type="text"
                      value={formTitleRu}
                      onChange={(e) => setFormTitleRu(e.target.value)}
                      placeholder="Например: Плов"
                      className="glass-input w-full text-xs rounded-xl px-3 py-2 text-white"
                    />
                  </div>
                )}
                {formLangTab === 'en' && (
                  <div className="space-y-1">
                    <label className="text-[10px] font-semibold text-zinc-400 block">Dish Name (EN)</label>
                    <input
                      type="text"
                      value={formTitleEn}
                      onChange={(e) => setFormTitleEn(e.target.value)}
                      placeholder="Example: Uzbek Pilaf"
                      className="glass-input w-full text-xs rounded-xl px-3 py-2 text-white"
                    />
                  </div>
                )}

                {/* Description input per language tab */}
                {formLangTab === 'uz' && (
                  <div className="space-y-1">
                    <label className="text-[10px] font-semibold text-zinc-400 block">Tavsif (UZ)</label>
                    <textarea
                      value={formDescUz}
                      onChange={(e) => setFormDescUz(e.target.value)}
                      placeholder="Taom tarkibi, tayyorlanish usuli..."
                      rows="2"
                      className="glass-input w-full text-xs rounded-xl px-3 py-2 text-white resize-none"
                    />
                  </div>
                )}
                {formLangTab === 'ru' && (
                  <div className="space-y-1">
                    <label className="text-[10px] font-semibold text-zinc-400 block">Описание (RU)</label>
                    <textarea
                      value={formDescRu}
                      onChange={(e) => setFormDescRu(e.target.value)}
                      placeholder="Состав блюда, описание..."
                      rows="2"
                      className="glass-input w-full text-xs rounded-xl px-3 py-2 text-white resize-none"
                    />
                  </div>
                )}
                {formLangTab === 'en' && (
                  <div className="space-y-1">
                    <label className="text-[10px] font-semibold text-zinc-400 block">Description (EN)</label>
                    <textarea
                      value={formDescEn}
                      onChange={(e) => setFormDescEn(e.target.value)}
                      placeholder="Ingredients, preparation description..."
                      rows="2"
                      className="glass-input w-full text-xs rounded-xl px-3 py-2 text-white resize-none"
                    />
                  </div>
                )}
              </div>

              {/* Category, Price, Image, Status */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-semibold text-zinc-400 block">Turkum</label>
                  <select
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value)}
                    className="glass-input w-full text-xs rounded-xl px-3 py-2 text-white cursor-pointer bg-dark-900"
                  >
                    <option value="national">Milliy taomlar</option>
                    <option value="drinks">Ichimliklar</option>
                    <option value="dessert">Desertlar</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-semibold text-zinc-400 block">Narxi (UZS) *</label>
                  <input
                    type="number"
                    value={formPrice}
                    onChange={(e) => setFormPrice(e.target.value)}
                    placeholder="Narxi"
                    required
                    className="glass-input w-full text-xs rounded-xl px-3 py-2 text-white"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-semibold text-zinc-400 block">Rasm URL manzili</label>
                <input
                  type="url"
                  value={formImageUrl}
                  onChange={(e) => {
                    setFormImageUrl(e.target.value);
                    setImageLoadError(false);
                  }}
                  placeholder="https://images.unsplash.com/photo-12345..."
                  className="glass-input w-full text-xs rounded-xl px-3 py-2 text-white"
                />
                {formImageUrl && !imageLoadError && (
                  <img
                    src={formImageUrl}
                    onError={() => setImageLoadError(true)}
                    className="max-w-[320px] aspect-video object-cover rounded-lg border border-white/10 mt-2 shadow-md"
                  />
                )}
                {formImageUrl && imageLoadError && (
                  <div className="text-rose-500 text-xs font-semibold mt-2">
                    Rasm yuklanmadi. Havolani tekshiring!
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between p-3 bg-dark-900/50 border border-white/5 rounded-xl">
                <div className="space-y-0.5">
                  <span className="text-[11px] font-bold text-zinc-200">Sotuvda mavjudligi</span>
                  <p className="text-[9px] text-zinc-400">Agar tugagan bo'lsa, menyudan yashiriladi</p>
                </div>
                <button
                  type="button"
                  onClick={() => setFormIsAvailable(!formIsAvailable)}
                  className={`relative inline-flex h-5 w-10 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out outline-none ${
                    formIsAvailable ? 'bg-emerald-600' : 'bg-zinc-700'
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                      formIsAvailable ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              {/* Form Actions */}
              <div className="flex gap-2.5 pt-2 border-t border-white/5">
                <button
                  type="button"
                  onClick={() => setProductFormOpen(false)}
                  className="flex-1 border border-white/10 hover:border-white/20 text-zinc-400 hover:text-white font-bold text-xs py-2.5 rounded-xl transition-all"
                >
                  Bekor qilish
                </button>
                <button
                  type="submit"
                  disabled={isSavingProduct}
                  className="flex-1 bg-rose-600 hover:bg-rose-500 disabled:bg-rose-800 text-white font-bold text-xs py-2.5 rounded-xl transition-all shadow-md flex items-center justify-center gap-1.5"
                >
                  {isSavingProduct ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Saqlanmoqda...
                    </>
                  ) : (
                    <>
                      <Check className="w-3.5 h-3.5" /> Saqlash
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 🗑️ DELETE CONFIRMATION MODAL */}
      {deleteConfirmOpen && (
        <div className="fixed inset-0 bg-dark-950/80 backdrop-blur-md flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="glass-card w-full max-w-sm rounded-2xl border border-white/10 p-5 space-y-4 shadow-premium text-center">
            <div className="w-12 h-12 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-500 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>
            
            <div className="space-y-1.5">
              <h3 className="font-extrabold text-sm text-zinc-100">Taomni o'chirish</h3>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Haqiqatdan ham ushbu <span className="font-bold text-rose-400">"{productToDelete?.title_uz}"</span> taomni o'chirmoqchimisiz? Bu amalni ortga qaytarib bo'lmaydi.
              </p>
            </div>

            <div className="flex gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => {
                  setDeleteConfirmOpen(false);
                  setProductToDelete(null);
                }}
                className="flex-1 border border-white/10 hover:border-white/20 text-zinc-400 hover:text-white font-bold text-xs py-2.5 rounded-xl transition-all"
              >
                Bekor qilish
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={isDeletingProduct}
                className="flex-1 bg-rose-600 hover:bg-rose-500 disabled:bg-rose-800 text-white font-bold text-xs py-2.5 rounded-xl transition-all shadow-md flex items-center justify-center gap-1.5"
              >
                {isDeletingProduct ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" /> O'chirilmoqda...
                  </>
                ) : (
                  "Ha, o'chirish"
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* FLOAT GLASS NAVIGATION BAR (TABS) */}
      <nav className="glass fixed bottom-4 left-4 right-4 max-w-sm mx-auto rounded-2xl border border-white/10 shadow-premium flex items-center justify-around py-3 px-2 z-50">
        
        {/* Menu tab button */}
        <button 
          onClick={() => handleTabChange('menu')}
          className={`flex flex-col items-center gap-1 transition-all ${
            activeTab === 'menu' ? 'text-brand-400 scale-105 font-semibold' : 'text-zinc-500 hover:text-zinc-300'
          }`}
        >
          <Utensils className="w-4.5 h-4.5" />
          <span className="text-[9px] tracking-tight">{t('menu')}</span>
        </button>

        {/* Cart tab button with indicator */}
        <button 
          onClick={() => handleTabChange('cart')}
          className={`relative flex flex-col items-center gap-1 transition-all ${
            activeTab === 'cart' ? 'text-brand-400 scale-105 font-semibold' : 'text-zinc-500 hover:text-zinc-300'
          }`}
        >
          <ShoppingCart className="w-4.5 h-4.5" />
          {cart.length > 0 && (
            <span className="absolute -top-1.5 -right-2 bg-brand-500 text-white text-[8px] font-bold w-4 h-4 rounded-full flex items-center justify-center animate-bounce shadow-md">
              {cart.reduce((sum, i) => sum + i.quantity, 0)}
            </span>
          )}
          <span className="text-[9px] tracking-tight">{t('cart')}</span>
        </button>

        {/* Booking tab button */}
        <button 
          onClick={() => handleTabChange('bookings')}
          className={`flex flex-col items-center gap-1 transition-all ${
            activeTab === 'bookings' ? 'text-brand-400 scale-105 font-semibold' : 'text-zinc-500 hover:text-zinc-300'
          }`}
        >
          <Calendar className="w-4.5 h-4.5" />
          <span className="text-[9px] tracking-tight">{t('booking')}</span>
        </button>

        {/* Active Queue/Orders tab button */}
        <button 
          onClick={() => handleTabChange('orders')}
          className={`relative flex flex-col items-center gap-1 transition-all ${
            activeTab === 'orders' ? 'text-brand-400 scale-105 font-semibold' : 'text-zinc-500 hover:text-zinc-300'
          }`}
        >
          <Clock className="w-4.5 h-4.5" />
          {myOrders.some(o => ['pending', 'accepted'].includes(o.status)) && (
            <span className="absolute top-0 right-1 w-2 h-2 bg-brand-500 rounded-full animate-ping" />
          )}
          <span className="text-[9px] tracking-tight">{t('orders')}</span>
        </button>

        {/* Admin Portal tab button */}
        <button 
          onClick={() => handleTabChange('admin')}
          className={`flex flex-col items-center gap-1 transition-all ${
            activeTab === 'admin' ? 'text-rose-400 scale-105 font-semibold' : 'text-zinc-500 hover:text-zinc-300'
          }`}
        >
          <ShieldAlert className="w-4.5 h-4.5" />
          <span className="text-[9px] tracking-tight">Admin</span>
        </button>

      </nav>
    </div>
  );
}

export default App;
