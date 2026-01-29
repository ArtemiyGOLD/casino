// telegram-init.js
const SUPABASE_URL = "https://wtwlmhrosdkbogfjvkvo.supabase.co";
const SUPABASE_KEY = "sb_publishable_ee3s6kfMw3cssALH_y2j7w_tU2fNikh";

class TelegramCasino {
    constructor() {
        this.tg = window.Telegram?.WebApp;
        this.supabase = window.supabase.createClient(
            SUPABASE_URL,
            SUPABASE_KEY,
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
        const tgUser = this.tg.initDataUnsafe?.user;

        if (!tgUser) {
            this.showError("Не удалось получить данные пользователя");
            return;
        }

        console.log("👤 Данные Telegram:", tgUser);

        // Сохраняем/получаем пользователя в Supabase
        this.user = await this.getOrCreateUser(tgUser);

        if (this.user) {
            this.balance = this.user.balance;
            this.updateUI();
            this.showNotification(
                `Добро пожаловать, ${this.user.first_name}! 🎮`,
                "success",
            );
        }
    }

    // Получаем или создаем пользователя в Supabase
    async getOrCreateUser(tgUser) {
        try {
            // Проверяем есть ли пользователь
            const { data: existingUser } = await this.supabase
                .from("users")
                .select("*")
                .eq("tg_user_id", tgUser.id)
                .single();

            if (existingUser) {
                console.log("✅ Пользователь найден в базе");
                return existingUser;
            }

            // Создаем нового пользователя
            const { data: newUser, error } = await this.supabase
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

            if (error) throw error;

            console.log("✅ Новый пользователь создан");
            return newUser;
        } catch (error) {
            console.error("❌ Ошибка работы с пользователем:", error);
            this.showNotification("Ошибка подключения к базе", "error");
            return null;
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
            document.getElementById("userAvatar")?.textContent =
                this.user.first_name?.[0]?.toUpperCase() || "👤";
            document.getElementById("balanceAmount")?.textContent =
                this.balance;
            document.getElementById("userId")?.textContent =
                `@${this.user.username || "user"}`;

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
