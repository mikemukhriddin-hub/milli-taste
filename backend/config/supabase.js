const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

const isDemoMode = !supabaseUrl || !supabaseKey || supabaseUrl.includes('your-supabase');

let supabase;

if (isDemoMode) {
  console.warn('⚠️  Supabase URL or Key is not configured. Running in DEMO/SIMULATION Mode with In-Memory Database.');
  
  // Create an in-memory data store for the simulation mode
  const mockDb = {
    users: [],
    products: [
      {
        id: 'p1',
        title_uz: 'Osh (Palov)',
        title_ru: 'Плов',
        title_en: 'Pilaf (Osh)',
        category: 'national',
        price: 35000.00,
        image_url: 'https://images.unsplash.com/photo-1541832676-9b763b0239ab?q=80&w=600&auto=format&fit=crop',
        is_available: true
      },
      {
        id: 'p2',
        title_uz: 'Lag\'mon',
        title_ru: 'Лагман',
        title_en: 'Lagman',
        category: 'national',
        price: 28000.00,
        image_url: 'https://images.unsplash.com/photo-1585032226651-759b368d7246?q=80&w=600&auto=format&fit=crop',
        is_available: true
      },
      {
        id: 'p3',
        title_uz: 'Somsa (Go\'shtli)',
        title_ru: 'Самса с мясом',
        title_en: 'Meat Somsa',
        category: 'national',
        price: 10000.00,
        image_url: 'https://images.unsplash.com/photo-1601050690597-df056fb4ce78?q=80&w=600&auto=format&fit=crop',
        is_available: true
      },
      {
        id: 'p4',
        title_uz: 'Ko\'k choy',
        title_ru: 'Зеленый чай',
        title_en: 'Green Tea',
        category: 'drinks',
        price: 5000.00,
        image_url: 'https://images.unsplash.com/photo-1597481499750-3e6b22637e12?q=80&w=600&auto=format&fit=crop',
        is_available: true
      },
      {
        id: 'p5',
        title_uz: 'Limonad',
        title_ru: 'Лимонад',
        title_en: 'Lemonade',
        category: 'drinks',
        price: 15000.00,
        image_url: 'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?q=80&w=600&auto=format&fit=crop',
        is_available: true
      },
      {
        id: 'p6',
        title_uz: 'Medovik',
        title_ru: 'Медовик',
        title_en: 'Honey Cake',
        category: 'dessert',
        price: 20000.00,
        image_url: 'https://images.unsplash.com/photo-1606313564200-e75d5e30476c?q=80&w=600&auto=format&fit=crop',
        is_available: true
      }
    ],
    orders: [],
    order_items: [],
    bookings: []
  };

  // Build a query chain builder similar to Supabase js client for basic operations
  const createMockChain = (table) => {
    return {
      select: function(query = '*') {
        if (!this._op) this._op = 'select';
        this._query = query;
        return this;
      },
      insert: function(data) {
        this._op = 'insert';
        this._data = data;
        return this;
      },
      update: function(data) {
        this._op = 'update';
        this._data = data;
        return this;
      },
      delete: function() {
        this._op = 'delete';
        return this;
      },
      eq: function(field, value) {
        this._filter = this._filter || [];
        this._filter.push({ field, value, type: 'eq' });
        return this;
      },
      neq: function(field, value) {
        this._filter = this._filter || [];
        this._filter.push({ field, value, type: 'neq' });
        return this;
      },
      gte: function(field, value) {
        this._filter = this._filter || [];
        this._filter.push({ field, value, type: 'gte' });
        return this;
      },
      lte: function(field, value) {
        this._filter = this._filter || [];
        this._filter.push({ field, value, type: 'lte' });
        return this;
      },
      in: function(field, values) {
        this._filter = this._filter || [];
        this._filter.push({ field, value: values, type: 'in' });
        return this;
      },
      order: function(field, { ascending = true } = {}) {
        this._order = { field, ascending };
        return this;
      },
      limit: function(num) {
        this._limit = num;
        return this;
      },
      single: function() {
        this._single = true;
        return this;
      },
      // Execution function
      then: async function(resolve, reject) {
        try {
          let data = [...mockDb[table]];

          // Filtering
          if (this._filter) {
            for (const f of this._filter) {
              if (f.type === 'eq') {
                data = data.filter(item => item[f.field] == f.value);
              } else if (f.type === 'neq') {
                data = data.filter(item => item[f.field] != f.value);
              } else if (f.type === 'gte') {
                data = data.filter(item => item[f.field] >= f.value);
              } else if (f.type === 'lte') {
                data = data.filter(item => item[f.field] <= f.value);
              } else if (f.type === 'in') {
                const valArray = Array.isArray(f.value) ? f.value : [f.value];
                data = data.filter(item => valArray.includes(item[f.field]));
              }
            }
          }

          // Insert
          if (this._op === 'insert') {
            const itemsToInsert = Array.isArray(this._data) ? this._data : [this._data];
            const inserted = itemsToInsert.map(item => {
              const newItem = {
                id: item.id || `uuid_${Math.random().toString(36).substr(2, 9)}`,
                created_at: new Date().toISOString(),
                ...item
              };
              mockDb[table].push(newItem);
              return newItem;
            });
            data = Array.isArray(this._data) ? inserted : inserted[0];
          }

          // Update
          if (this._op === 'update') {
            const targetIds = data.map(item => item.id);
            mockDb[table] = mockDb[table].map(item => {
              if (targetIds.includes(item.id)) {
                return { ...item, ...this._data };
              }
              return item;
            });
            data = mockDb[table].filter(item => targetIds.includes(item.id));
            if (this._single) data = data[0];
          }

          // Delete
          if (this._op === 'delete') {
            const targetIds = data.map(item => item.id);
            mockDb[table] = mockDb[table].filter(item => !targetIds.includes(item.id));
            // return empty / or deleted
          }

          // Ordering
          if (this._order) {
            const { field, ascending } = this._order;
            data.sort((a, b) => {
              if (a[field] < b[field]) return ascending ? -1 : 1;
              if (a[field] > b[field]) return ascending ? 1 : -1;
              return 0;
            });
          }

          // Limit
          if (this._limit) {
            data = data.slice(0, this._limit);
          }

          // Single row
          if (this._single && Array.isArray(data)) {
            data = data[0] || null;
          }

          // Relationship Enrichment for orders and bookings
          if (table === 'orders') {
            const enrichOrder = (o) => {
              if (!o) return o;
              const enriched = { ...o };
              // User relation
              const u = mockDb.users.find(user => user.id === o.user_id);
              enriched.users = u ? { name: u.name, phone: u.phone, telegram_id: u.telegram_id } : null;
              
              // Order Items relation
              enriched.order_items = mockDb.order_items
                .filter(item => item.order_id === o.id)
                .map(item => {
                  const p = mockDb.products.find(prod => prod.id === item.product_id);
                  return {
                    id: item.id,
                    quantity: item.quantity,
                    price: item.price,
                    products: p ? { title_uz: p.title_uz, title_ru: p.title_ru, title_en: p.title_en } : null
                  };
                });
              return enriched;
            };

            if (Array.isArray(data)) {
              data = data.map(enrichOrder);
            } else if (data) {
              data = enrichOrder(data);
            }
          }

          if (table === 'bookings') {
            const enrichBooking = (b) => {
              if (!b) return b;
              const enriched = { ...b };
              const u = mockDb.users.find(user => user.id === b.user_id);
              enriched.users = u ? { name: u.name, phone: u.phone, telegram_id: u.telegram_id } : null;
              return enriched;
            };

            if (Array.isArray(data)) {
              data = data.map(enrichBooking);
            } else if (data) {
              data = enrichBooking(data);
            }
          }

          resolve({ data, error: null });
        } catch (err) {
          console.error(`Mock database error on table ${table}:`, err);
          resolve({ data: null, error: err });
        }
      }
    };
  };

  supabase = {
    from: (table) => createMockChain(table),
    auth: {
      signUp: async () => ({ data: { user: {} }, error: null }),
      signInWithPassword: async () => ({ data: { session: {} }, error: null }),
    },
    // Realtime mocks
    channel: () => ({
      on: () => ({
        subscribe: () => {}
      })
    })
  };
} else {
  supabase = createClient(supabaseUrl, supabaseKey);
}

module.exports = {
  supabase,
  isDemoMode
};
