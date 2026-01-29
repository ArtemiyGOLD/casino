// telegram-init.js
const SUPABASE_URL = "https://wtwlmhrosdkbogfjvkvo.supabase.co";
const SUPABASE_KEY =
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inltb3JldHB0a2t4cGp6ZmlkdG9pIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk2OTYwMjcsImV4cCI6MjA4NTI3MjAyN30.6xsk0DyKVRO2dtN17yCE2BUCW39d2lgv4fx8t0YmKvk";

class TelegramCasino {
    constructor() {
        this.tg = window.Telegram?.WebApp;
        // Важно: создаем клиента с глобальными заголовками
        this.supabase = window.supabase.createClient(
            SUPABASE_URL,
            SUPABASE_KEY,
            {
                global: {
                    headers: {
                        // Этот заголовок будет добавляться ко ВСЕМ запросам к Supabase
                        tg_user_id: this.tg?.initDataUnsafe?.user?.id || "",
                    },
                },
            },
        );
        this.user = null;
        this.balance = 0;
    }

    // Инициализация приложения
    async init() {
        if (!this.tg) {
            this.showError("Откройте приложение через Telegram бота");
            return false;
        }
        console.log("Тест подключения к Supabase...");
        const { data, error } = await this.supabase
            .from("users")
            .select("count");
        console.log("Результат теста:", data, error);

        // Настройка Telegram
        this.tg.expand();
        this.tg.enableClosingConfirmation();
        this.tg.BackButton.onClick(() => this.goBack());

        console.log("✅ Telegram WebApp инициализирован");

        // Получаем данные пользователя из Telegram
        await this.handleTelegramUser();
        return true;
    }

    // Обработка пользователя Telegram
    async handleTelegramUser() {
        console.log("🟡 [A] Начало handleTelegramUser");

        const tgUser = this.tg.initDataUnsafe?.user;
        console.log("🟡 [B] Данные из Telegram:", tgUser);

        if (!tgUser) {
            console.error("❌ [C] Нет данных пользователя Telegram");
            this.showError("Не удалось получить данные пользователя");
            return;
        }

        console.log("🟡 [D] tgUser.id =", tgUser.id);

        try {
            // Сохраняем/получаем пользователя в Supabase
            console.log("🟡 [E] Вызываю getOrCreateUser...");
            this.user = await this.getOrCreateUser(tgUser);
            console.log("🟡 [F] Результат getOrCreateUser:", this.user);

            if (this.user) {
                this.balance = this.user.balance;
                console.log(
                    "🟡 [G] Данные пользователя получены. Баланс:",
                    this.balance,
                );
                this.updateUI();
                this.showNotification(
                    `Добро пожаловать, ${this.user.first_name}! 🎮`,
                    "success",
                );
            } else {
                console.error("❌ [H] getOrCreateUser вернул null/undefined");
            }
        } catch (error) {
            console.error("❌ [I] Ошибка в handleTelegramUser:", error);
            // Выведем детали ошибки для отладки
            console.error(
                "Детали ошибки:",
                error.message,
                error.details,
                error.code,
            );
        }
    }

    // Получаем или создаем пользователя в Supabase
    async getOrCreateUser(tgUser) {
        console.log("🟡 [1] Начало getOrCreateUser. tgUser.id =", tgUser?.id);

        try {
            // 1. Пробуем найти пользователя
            console.log(
                "🟡 [2] Пытаюсь найти пользователя с tg_user_id =",
                tgUser.id,
            );
            const { data: existingUser, error: selectError } =
                await this.supabase
                    .from("users")
                    .select("*")
                    .eq("tg_user_id", tgUser.id)
                    .single(); // .single() выбросит ошибку, если записей 0 или больше 1

            console.log("🟡 [3] Ответ от Supabase на SELECT:", {
                existingUser,
                selectError,
            });

            if (existingUser) {
                console.log("✅ [4] Пользователь найден:", existingUser);
                return existingUser;
            }

            // 2. Если не нашли — создаем нового (обратите внимание, что .single() выбросит ошибку при отсутствии данных)
            // Код создания будет выполнен только в блоке catch
            console.log("🟡 [5] Пользователь не найден, будет создан новый");
        } catch (error) {
            // Сюда попадем, если .single() не нашел запись (ошибка 'PGRST116') или другая ошибка
            console.log(
                "🟡 [6] Попадаем в catch. Ошибка от .single():",
                error.code,
                error.message,
            );

            if (error.code === "PGRST116") {
                // Ошибка "0 rows returned"
                console.log("🟡 [7] Создаю нового пользователя...");
                const { data: newUser, error: insertError } =
                    await this.supabase
                        .from("users")
                        .insert([
                            {
                                tg_user_id: tgUser.id,
                                username: tgUser.username,
                                first_name: tgUser.first_name,
                                last_name: tgUser.last_name,
                                balance: 1000,
                                role: "user",
                            },
                        ])
                        .select()
                        .single();

                console.log("🟡 [8] Ответ от Supabase на INSERT:", {
                    newUser,
                    insertError,
                });

                if (insertError) throw insertError;
                console.log("✅ [9] Новый пользователь создан:", newUser);
                return newUser;
            } else {
                // Любая другая ошибка
                console.error(
                    "❌ [10] Неожиданная ошибка в getOrCreateUser:",
                    error,
                );
                throw error;
            }
        }
    }

    // Обновление баланса
    async updateBalance(amount) {
        if (!this.user) return;

        try {
            const newBalance = this.balance + amount;

            const { error } = await this.supabase
                .from("users")
                .update({ balance: newBalance })
                .eq("tg_user_id", this.user.tg_user_id);

            if (error) throw error;

            this.balance = newBalance;
            this.user.balance = newBalance;
            this.updateUI();

            return newBalance;
        } catch (error) {
            console.error("Ошибка обновления баланса:", error);
            return null;
        }
    }

    // Сохранение игры
    async saveGame(gameData) {
        if (!this.user) return false;

        try {
            const { error } = await this.supabase.from("games").insert([
                {
                    user_id: this.user.id,
                    game_type: gameData.type,
                    bet_amount: gameData.bet,
                    win_amount: gameData.win,
                    result: gameData.result,
                },
            ]);

            if (error) throw error;

            // Обновляем баланс
            await this.updateBalance(gameData.win - gameData.bet);

            return true;
        } catch (error) {
            console.error("Ошибка сохранения игры:", error);
            return false;
        }
    }

    // Получение истории игр
    async getGameHistory(limit = 10) {
        if (!this.user) return [];

        try {
            const { data: games, error } = await this.supabase
                .from("games")
                .select("*")
                .eq("user_id", this.user.id)
                .order("created_at", { ascending: false })
                .limit(limit);

            if (error) throw error;
            return games || [];
        } catch (error) {
            console.error("Ошибка получения истории:", error);
            return [];
        }
    }

    // ========== АДМИН ФУНКЦИИ ==========
    async getAllUsers() {
        if (!this.user || this.user.role !== "admin") return [];

        try {
            const { data: users, error } = await this.supabase
                .from("users")
                .select("*")
                .order("created_at", { ascending: false });

            if (error) throw error;
            return users || [];
        } catch (error) {
            console.error("Ошибка получения пользователей:", error);
            return [];
        }
    }

    async adminUpdateUser(userId, updates) {
        if (!this.user || this.user.role !== "admin") return false;

        try {
            const { error } = await this.supabase
                .from("users")
                .update(updates)
                .eq("id", userId);

            if (error) throw error;
            return true;
        } catch (error) {
            console.error("Ошибка обновления пользователя:", error);
            return false;
        }
    }

    // ========== UI ФУНКЦИИ ==========
    updateUI() {
        // Обновляем отображение пользователя
        if (this.user) {
            const userNameElement = document.getElementById("userName");
            if (userNameElement) {
                userNameElement.textContent = this.user.first_name || "Игрок";
            }

            const userAvatarElement = document.getElementById("userAvatar");
            if (userAvatarElement) {
                const firstLetter = this.user.first_name
                    ? this.user.first_name[0].toUpperCase()
                    : "👤";
                userAvatarElement.textContent = firstLetter;
            }

            const balanceAmountElement =
                document.getElementById("balanceAmount");
            if (balanceAmountElement) {
                balanceAmountElement.textContent = this.balance;
            }

            const userIdElement = document.getElementById("userId");
            if (userIdElement) {
                const username = this.user.username
                    ? `@${this.user.username}`
                    : "user";
                userIdElement.textContent = `@${username}`;
            }

            // Показываем админ-панель если нужно
            const adminBtn = document.getElementById("adminBtn");
            if (adminBtn && this.user.role === "admin") {
                adminBtn.style.display = "flex";
            }
        }
    }

    showScreen(screenName) {
        // Скрываем все экраны
        document.querySelectorAll(".screen").forEach((screen) => {
            screen.classList.remove("active");
        });

        // Показываем нужный экран
        const target = document.getElementById(`${screenName}Screen`);
        if (target) {
            target.classList.add("active");
            window.currentScreen = screenName;

            // Управляем кнопкой "Назад"
            if (screenName === "main") {
                this.tg.BackButton.hide();
            } else {
                this.tg.BackButton.show();
            }
        }
    }

    goBack() {
        if (window.currentScreen !== "main") {
            this.showScreen("main");
        }
    }

    showNotification(message, type = "info") {
        const notification = document.createElement("div");
        notification.className = `notification ${type}`;
        notification.innerHTML = `
            <div style="display: flex; align-items: center; gap: 10px;">
                <span style="font-size: 20px;">
                    ${type === "success" ? "✅" : type === "error" ? "❌" : "ℹ️"}
                </span>
                <span>${message}</span>
            </div>
        `;

        document.body.appendChild(notification);
        setTimeout(() => notification.classList.add("show"), 10);

        setTimeout(() => {
            notification.classList.remove("show");
            setTimeout(() => notification.remove(), 300);
        }, 3000);
    }

    showError(message) {
        document.body.innerHTML = `
            <div style="
                background: linear-gradient(135deg, #0f0f23 0%, #1a1a2e 100%);
                min-height: 100vh;
                display: flex;
                align-items: center;
                justify-content: center;
                padding: 20px;
                color: white;
                text-align: center;
            ">
                <div style="
                    background: rgba(255,255,255,0.1);
                    backdrop-filter: blur(20px);
                    border-radius: 20px;
                    padding: 30px;
                    max-width: 400px;
                    border: 1px solid rgba(255,255,255,0.2);
                ">
                    <div style="font-size: 48px; margin-bottom: 20px;">⚠️</div>
                    <h3 style="margin-bottom: 15px;">Ошибка запуска</h3>
                    <p style="margin-bottom: 20px; opacity: 0.8;">${message}</p>
                    <button onclick="location.reload()" style="
                        background: linear-gradient(135deg, #007aff, #5856d6);
                        color: white;
                        border: none;
                        padding: 15px 30px;
                        border-radius: 15px;
                        font-size: 16px;
                        font-weight: bold;
                        cursor: pointer;
                        width: 100%;
                    ">
                        🔄 Перезагрузить
                    </button>
                </div>
            </div>
        `;
    }
}

// Создаем глобальный экземпляр
window.telegramCasino = new TelegramCasino();

// Инициализируем при загрузке
document.addEventListener("DOMContentLoaded", async () => {
    console.log("🎰 Запуск казино...");

    // Загружаем скрипт Telegram WebApp если его нет
    if (!window.Telegram?.WebApp) {
        const script = document.createElement("script");
        script.src = "https://telegram.org/js/telegram-web-app.js";
        script.onload = async () => {
            await window.telegramCasino.init();
        };
        document.head.appendChild(script);
    } else {
        await window.telegramCasino.init();
    }
});
