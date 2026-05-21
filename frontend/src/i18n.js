import i18nInstance from 'i18next';
import { initReactI18next } from 'react-i18next';

const resources = {
  uz: {
    translation: {
      welcome: "Xush kelibsiz",
      menu: "Menyu",
      cart: "Savatcha",
      orders: "Buyurtmalar",
      booking: "Stol Bron",
      admin: "Admin Panel",
      categories: {
        all: "Barchasi",
        national: "Milliy taomlar",
        drinks: "Ichimliklar",
        dessert: "Desertlar"
      },
      cart_empty: "Savatchangiz bo'sh",
      total: "Jami",
      add_to_cart: "Savatchaga qo'shish",
      checkout: "Buyurtma berish",
      delivery: "Yetkazib berish (Dostavka)",
      pickup: "Olib ketish (Samovivoz)",
      phone_number: "Telefon raqamingiz",
      address: "Yetkazib berish manzili",
      place_order: "Buyurtmani tasdiqlash",
      queue_title: "FIFO Navbat Tizimi",
      queue_status: "Buyurtma holati",
      queue_position: "Sizning navbatingiz",
      queue_position_text: "Siz navbatda {{position}}-o'rindasiz",
      queue_wait_time: "Taxminiy tayyor bo'lish vaqti",
      queue_wait_time_text: "{{time}} daqiqa",
      status_pending: "Yangi",
      status_accepted: "Qabul qilindi",
      status_completed: "Yakunlandi",
      status_cancelled: "Bekor qilindi",
      booking_title: "Stol band qilish (Bron)",
      table_number: "Stol raqami",
      guests: "Mehmonlar soni",
      booking_time: "Sana va vaqt",
      book_now: "Stolni bron qilish",
      booking_success: "Stol muvaffaqiyatli bron qilindi!",
      booking_pending: "Tasdiqlanishi kutilmoqda",
      booking_confirmed: "Bron tasdiqlandi",
      booking_cancelled: "Bron bekor qilindi",
      language: "Til",
      contact_share: "Telegram orqali telefon ulash",
      checkout_success: "Buyurtma muvaffaqiyatli qabul qilindi!"
    }
  },
  ru: {
    translation: {
      welcome: "Добро пожаловать",
      menu: "Меню",
      cart: "Корзина",
      orders: "Заказы",
      booking: "Бронь",
      admin: "Админ Панель",
      categories: {
        all: "Все",
        national: "Национальные блюда",
        drinks: "Напитки",
        dessert: "Десерты"
      },
      cart_empty: "Ваша корзина пуста",
      total: "Итого",
      add_to_cart: "В корзину",
      checkout: "Оформить заказ",
      delivery: "Доставка",
      pickup: "Самовывоз",
      phone_number: "Номер телефона",
      address: "Адрес доставки",
      place_order: "Подтвердить заказ",
      queue_title: "FIFO Система Очереди",
      queue_status: "Статус заказа",
      queue_position: "Ваша очередь",
      queue_position_text: "Вы {{position}}-й в очереди",
      queue_wait_time: "Примерное время ожидания",
      queue_wait_time_text: "{{time}} минут",
      status_pending: "Новый",
      status_accepted: "Принят",
      status_completed: "Завершен",
      status_cancelled: "Отменено",
      booking_title: "Бронирование стола",
      table_number: "Номер стола",
      guests: "Количество гостей",
      booking_time: "Дата и время",
      book_now: "Забронировать",
      booking_success: "Стол успешно забронирован!",
      booking_pending: "Ожидает подтверждения",
      booking_confirmed: "Бронь подтверждена",
      booking_cancelled: "Бронь отменена",
      language: "Язык",
      contact_share: "Поделиться номером через Telegram",
      checkout_success: "Заказ успешно принят!"
    }
  },
  en: {
    translation: {
      welcome: "Welcome",
      menu: "Menu",
      cart: "Cart",
      orders: "Orders",
      booking: "Booking",
      admin: "Admin Panel",
      categories: {
        all: "All",
        national: "National Dishes",
        drinks: "Drinks",
        dessert: "Desserts"
      },
      cart_empty: "Your cart is empty",
      total: "Total",
      add_to_cart: "Add to Cart",
      checkout: "Checkout",
      delivery: "Delivery",
      pickup: "Pickup",
      phone_number: "Phone Number",
      address: "Delivery Address",
      place_order: "Confirm Order",
      queue_title: "FIFO Queue System",
      queue_status: "Order Status",
      queue_position: "Your position",
      queue_position_text: "You are #{{position}} in queue",
      queue_wait_time: "Estimated wait time",
      queue_wait_time_text: "{{time}} mins",
      status_pending: "New",
      status_accepted: "Accepted",
      status_completed: "Completed",
      status_cancelled: "Cancelled",
      booking_title: "Table Booking",
      table_number: "Table Number",
      guests: "Number of guests",
      booking_time: "Date & Time",
      book_now: "Book Table",
      booking_success: "Table booked successfully!",
      booking_pending: "Pending confirmation",
      booking_confirmed: "Booking confirmed",
      booking_cancelled: "Booking cancelled",
      language: "Language",
      contact_share: "Share contact via Telegram",
      checkout_success: "Order placed successfully!"
    }
  }
};

i18nInstance
  .use(initReactI18next)
  .init({
    resources,
    lng: 'uz', // default language
    fallbackLng: 'uz',
    interpolation: {
      escapeValue: false
    }
  });

export default i18nInstance;
