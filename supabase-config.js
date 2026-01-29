// Конфигурация Supabase
const SUPABASE_URL = "https://ymoretptkkxpjzfidtoi.supabase.co"; // ЗАМЕНИТЕ на свой URL
const SUPABASE_ANON_KEY = "sb_secret_dH1eHJf1-nhU_VRoVsk38g_3So-jG8k"; // ЗАМЕНИТЕ на свой ключ

// Инициализируем Supabase клиент с проверкой
let supabaseClient = null;

try {
    // Проверяем, доступна ли библиотека Supabase
    if (typeof supabase !== "undefined" && SUPABASE_URL && SUPABASE_ANON_KEY) {
        supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
        console.log("✅ Supabase клиент создан");
    } else {
        console.log("⚠️ Supabase не доступен. Проверьте:");
        console.log("- Загружена ли библиотека Supabase в index.html");
        console.log("- Указаны ли SUPABASE_URL и SUPABASE_ANON_KEY");
        console.log("Переключаемся на localStorage режим");
    }
} catch (error) {
    console.error("❌ Ошибка создания Supabase клиента:", error);
    supabaseClient = null;
}

// Экспортируем клиент
window.supabaseClient = supabaseClient;

// Функция проверки подключения
async function checkSupabaseConnection() {
    if (!supabaseClient) {
        console.log("ℹ️ Supabase клиент не инициализирован");
        return false;
    }

    try {
        // Быстрая проверка с таймаутом
        const timeoutPromise = new Promise((_, reject) =>
            setTimeout(() => reject(new Error("Таймаут подключения")), 3000),
        );

        const connectionPromise = supabaseClient.auth.getSession();
        const result = await Promise.race([connectionPromise, timeoutPromise]);

        return true;
    } catch (error) {
        console.warn("⚠️ Ошибка подключения к Supabase:", error.message);
        return false;
    }
}

window.checkSupabaseConnection = checkSupabaseConnection;
