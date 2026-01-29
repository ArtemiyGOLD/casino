class AuthSystem {
    constructor() {
        this.currentUser = null;
        this.isOnline = false;
        this.initialized = false;
        this.users = [];
        this.init();
    }

    async init() {
        console.log("🚀 Инициализация системы авторизации...");

        // Инициализируем локальное хранилище
        this.initLocalStorage();

        // Пытаемся подключиться к Supabase (быстро, с таймаутом)
        await this.tryConnectToSupabase();

        // Проверяем текущую сессию
        await this.checkCurrentSession();

        this.initialized = true;
        console.log(
            "✅ Система авторизации готова. Режим:",
            this.isOnline ? "Supabase" : "LocalStorage",
        );
    }

    initLocalStorage() {
        try {
            const usersData = localStorage.getItem("casinoUsers");
            this.users = usersData ? JSON.parse(usersData) : [];
            this.initAdminUser();
        } catch (e) {
            console.error("❌ Ошибка инициализации localStorage:", e);
            this.users = [];
        }
    }

    initAdminUser() {
        if (!this.users.find((u) => u.username === "admin")) {
            const adminUser = {
                id: this.generateId(),
                username: "admin",
                password: "admin123",
                balance: 10000,
                isAdmin: true,
                stats: { totalGames: 0, gamesWon: 0 },
                email: "admin@casino.local",
                created_at: new Date().toISOString(),
            };
            this.users.push(adminUser);
            this.saveLocalUsers();
        }
    }

    async tryConnectToSupabase() {
        try {
            // Проверяем наличие Supabase клиента
            if (!window.supabaseClient) {
                console.log(
                    "ℹ️ Supabase клиент не найден, используем localStorage",
                );
                this.isOnline = false;
                this.updateConnectionStatus();
                return;
            }

            // Быстрая проверка соединения с таймаутом
            const timeout = new Promise((_, reject) =>
                setTimeout(
                    () => reject(new Error("Таймаут подключения")),
                    2000,
                ),
            );

            const connectionTest = supabaseClient.auth.getSession();

            const result = await Promise.race([connectionTest, timeout]);

            if (result.data && result.data.session !== undefined) {
                this.isOnline = true;
                console.log("✅ Supabase подключен успешно");
            } else {
                this.isOnline = false;
                console.log(
                    "⚠️ Supabase не отвечает, переключаемся на localStorage",
                );
            }
        } catch (error) {
            console.warn("⚠️ Ошибка подключения к Supabase:", error.message);
            this.isOnline = false;
        }

        this.updateConnectionStatus();
    }

    updateConnectionStatus() {
        const statusEl = document.getElementById("connectionStatus");
        if (statusEl) {
            if (this.isOnline) {
                statusEl.innerHTML =
                    '<i class="fas fa-wifi" style="color: #2ecc71;"></i> <span>Онлайн</span>';
                statusEl.title = "Подключено к Supabase";
            } else {
                statusEl.innerHTML =
                    '<i class="fas fa-wifi-slash" style="color: #e74c3c;"></i> <span>Оффлайн</span>';
                statusEl.title = "Работает в локальном режиме";
            }
        }
    }

    async checkCurrentSession() {
        console.log("🔍 Проверка текущей сессии...");

        if (this.isOnline) {
            try {
                const {
                    data: { session },
                    error,
                } = await supabaseClient.auth.getSession();

                if (error) {
                    console.warn("⚠️ Ошибка получения сессии:", error.message);
                    this.checkLocalSession();
                    return;
                }

                if (session) {
                    console.log(
                        "👤 Найдена активная сессия для:",
                        session.user.id,
                    );
                    await this.loadUserFromSupabase(session.user.id);
                } else {
                    console.log("ℹ️ Активной сессии нет");
                    this.checkLocalSession();
                }
            } catch (error) {
                console.error("❌ Ошибка при проверке сессии:", error);
                this.checkLocalSession();
            }
        } else {
            this.checkLocalSession();
        }
    }

    checkLocalSession() {
        try {
            const savedUser = localStorage.getItem("currentUser");
            if (savedUser) {
                const user = JSON.parse(savedUser);
                this.currentUser = user;
                console.log(
                    "👤 Загружен пользователь из localStorage:",
                    user.username,
                );
                this.updateUI();
            }
        } catch (e) {
            console.error(
                "❌ Ошибка загрузки пользователя из localStorage:",
                e,
            );
            localStorage.removeItem("currentUser");
        }
    }

    async loadUserFromSupabase(userId) {
        try {
            const { data: user, error } = await supabaseClient
                .from("users")
                .select("*")
                .eq("id", userId)
                .single();

            if (error) {
                console.warn(
                    "⚠️ Пользователь не найден в Supabase, проверяем локально",
                );

                // Ищем пользователя в локальном хранилище
                const localUser = this.users.find(
                    (u) => u.id === userId || u.email?.includes(userId),
                );
                if (localUser) {
                    console.log("👤 Найден локальный пользователь");
                    this.currentUser = localUser;
                    this.updateUI();
                    return true;
                }

                return false;
            }

            // Преобразуем данные из Supabase в наш формат
            this.currentUser = {
                id: user.id,
                username: user.username,
                email: user.email,
                balance: user.balance || 1000,
                isAdmin: user.is_admin || false,
                stats: {
                    totalGames: user.total_games || 0,
                    gamesWon: user.games_won || 0,
                },
                password: user.password, // Внимание: в реальном приложении так не делать!
            };

            // Сохраняем в localStorage для оффлайн режима
            localStorage.setItem(
                "currentUser",
                JSON.stringify(this.currentUser),
            );

            console.log(
                "✅ Пользователь загружен из Supabase:",
                this.currentUser.username,
            );
            this.updateUI();
            return true;
        } catch (error) {
            console.error(
                "❌ Ошибка загрузки пользователя из Supabase:",
                error,
            );
            return false;
        }
    }

    generateId() {
        return (
            "user_" +
            Date.now().toString(36) +
            Math.random().toString(36).substr(2)
        );
    }

    saveLocalUsers() {
        try {
            localStorage.setItem("casinoUsers", JSON.stringify(this.users));
        } catch (e) {
            console.error("❌ Ошибка сохранения пользователей:", e);
        }
    }

    // ============ РЕГИСТРАЦИЯ ============
    async register(username, password, email = null) {
        if (!username || !password) {
            return { success: false, message: "Заполните все поля" };
        }

        if (username.length < 3) {
            return {
                success: false,
                message: "Имя пользователя должно быть не менее 3 символов",
            };
        }

        if (password.length < 4) {
            return {
                success: false,
                message: "Пароль должен быть не менее 4 символов",
            };
        }

        if (this.isOnline) {
            return await this.registerSupabase(username, password, email);
        } else {
            return this.registerLocal(username, password, email);
        }
    }

    async registerSupabase(username, password, email) {
        try {
            const userEmail = email || `${username}@casino.local`;

            console.log("📝 Регистрация в Supabase:", username);

            // 1. Регистрация в Auth
            const { data: authData, error: authError } =
                await supabaseClient.auth.signUp({
                    email: userEmail,
                    password: password,
                    options: {
                        data: { username: username },
                    },
                });

            if (authError) {
                console.error("❌ Ошибка регистрации в Auth:", authError);

                // Если пользователь уже существует, пробуем войти
                if (
                    authError.message.includes("already registered") ||
                    authError.message.includes("User already registered")
                ) {
                    console.log(
                        "ℹ️ Пользователь уже существует, пробуем войти...",
                    );
                    return await this.login(username, password);
                }

                return {
                    success: false,
                    message: authError.message || "Ошибка регистрации",
                };
            }

            console.log("✅ Auth регистрация успешна:", authData.user.id);

            // 2. Создание записи в таблице users
            const { error: userError } = await supabaseClient
                .from("users")
                .insert([
                    {
                        id: authData.user.id,
                        username: username,
                        email: userEmail,
                        password: password, // Внимание: в реальном приложении так не делать!
                        balance: 1000,
                        is_admin: username === "admin",
                        total_games: 0,
                        games_won: 0,
                        created_at: new Date().toISOString(),
                    },
                ]);

            if (userError) {
                console.error(
                    "❌ Ошибка создания пользователя в таблице:",
                    userError,
                );

                // Пытаемся удалить пользователя из Auth если создание в таблице не удалось
                try {
                    await supabaseClient.auth.signOut();
                } catch (e) {
                    console.warn("⚠️ Не удалось очистить сессию:", e);
                }

                return {
                    success: false,
                    message:
                        "Ошибка создания аккаунта. Попробуйте другой логин.",
                };
            }

            console.log("✅ Пользователь создан в таблице");

            // 3. Автоматический вход после регистрации
            const loginResult = await this.login(username, password);

            if (loginResult.success) {
                return {
                    success: true,
                    message: "Регистрация и вход успешны! Добро пожаловать!",
                };
            } else {
                return {
                    success: false,
                    message:
                        "Регистрация прошла, но вход не удался. Попробуйте войти вручную.",
                };
            }
        } catch (error) {
            console.error("❌ Неожиданная ошибка при регистрации:", error);
            return {
                success: false,
                message: "Неожиданная ошибка. Попробуйте позже.",
            };
        }
    }

    registerLocal(username, password, email) {
        // Проверяем, нет ли уже такого пользователя
        const existingUser = this.users.find((u) => u.username === username);
        if (existingUser) {
            return {
                success: false,
                message: "Пользователь с таким именем уже существует",
            };
        }

        // Создаем нового пользователя
        const newUser = {
            id: this.generateId(),
            username: username,
            password: password,
            email: email || `${username}@casino.local`,
            balance: 1000,
            isAdmin: username === "admin",
            stats: { totalGames: 0, gamesWon: 0 },
            created_at: new Date().toISOString(),
        };

        // Добавляем в массив пользователей
        this.users.push(newUser);
        this.saveLocalUsers();

        // Автоматически входим под новым пользователем
        this.currentUser = newUser;
        localStorage.setItem("currentUser", JSON.stringify(newUser));
        this.updateUI();

        console.log("✅ Локальная регистрация успешна:", username);

        return {
            success: true,
            message: "Регистрация и вход успешны!",
        };
    }

    // ============ ВХОД ============
    async login(username, password) {
        if (!username || !password) {
            return { success: false, message: "Заполните все поля" };
        }

        console.log("🔐 Попытка входа:", username);

        if (this.isOnline) {
            const result = await this.loginSupabase(username, password);

            // Если вход в Supabase не удался, пробуем локальный вход
            if (!result.success) {
                console.log(
                    "⚠️ Вход в Supabase не удался, пробуем локальный вход",
                );
                const localResult = this.loginLocal(username, password);
                if (localResult.success) {
                    console.log(
                        "✅ Успешный локальный вход после неудачи Supabase",
                    );
                    // Переключаемся в оффлайн режим
                    this.isOnline = false;
                    this.updateConnectionStatus();
                }
                return localResult;
            }

            return result;
        } else {
            return this.loginLocal(username, password);
        }
    }

    async loginSupabase(username, password) {
        try {
            // Пытаемся войти через email (предполагаем формат username@casino.local)
            const email = `${username}@casino.local`;

            const { data: authData, error: authError } =
                await supabaseClient.auth.signInWithPassword({
                    email: email,
                    password: password,
                });

            if (authError) {
                console.warn("❌ Ошибка входа в Supabase:", authError.message);

                // Пробуем альтернативные форматы email
                const altEmail = `${username}@example.com`;
                const { data: altAuthData, error: altAuthError } =
                    await supabaseClient.auth.signInWithPassword({
                        email: altEmail,
                        password: password,
                    });

                if (altAuthError) {
                    return {
                        success: false,
                        message: "Неверный логин или пароль",
                    };
                }

                // Если альтернативный email сработал
                await this.loadUserFromSupabase(altAuthData.user.id);
                return {
                    success: true,
                    message: "Вход успешен!",
                    user: this.currentUser,
                };
            }

            // Успешный вход
            await this.loadUserFromSupabase(authData.user.id);

            return {
                success: true,
                message: "Вход успешен!",
                user: this.currentUser,
            };
        } catch (error) {
            console.error("❌ Неожиданная ошибка при входе в Supabase:", error);
            return {
                success: false,
                message: "Ошибка входа. Попробуйте позже.",
            };
        }
    }

    loginLocal(username, password) {
        // Ищем пользователя в локальном хранилище
        const user = this.users.find(
            (u) => u.username === username && u.password === password,
        );

        if (!user) {
            return {
                success: false,
                message: "Неверный логин или пароль",
            };
        }

        // Нашли пользователя
        this.currentUser = user;
        localStorage.setItem("currentUser", JSON.stringify(user));
        this.updateUI();

        console.log("✅ Локальный вход успешен:", username);

        return {
            success: true,
            message: "Вход успешен!",
            user: user,
        };
    }

    // ============ ВЫХОД ============
    async logout() {
        console.log("👋 Выход пользователя:", this.currentUser?.username);

        if (this.isOnline) {
            try {
                await supabaseClient.auth.signOut();
                console.log("✅ Сессия Supabase закрыта");
            } catch (error) {
                console.warn("⚠️ Ошибка при выходе из Supabase:", error);
            }
        }

        // Очищаем текущего пользователя
        this.currentUser = null;
        localStorage.removeItem("currentUser");

        // Обновляем интерфейс
        this.updateUI();

        return {
            success: true,
            message: "Выход выполнен",
        };
    }

    // ============ ОБНОВЛЕНИЕ БАЛАНСА ============
    async updateUserBalance(userId, newBalance) {
        console.log("💰 Обновление баланса:", userId, "->", newBalance);

        if (this.isOnline) {
            return await this.updateBalanceSupabase(userId, newBalance);
        } else {
            return this.updateBalanceLocal(userId, newBalance);
        }
    }

    async updateBalanceSupabase(userId, newBalance) {
        try {
            const { error } = await supabaseClient
                .from("users")
                .update({ balance: newBalance })
                .eq("id", userId);

            if (error) throw error;

            // Обновляем локально если это текущий пользователь
            if (this.currentUser && this.currentUser.id === userId) {
                this.currentUser.balance = newBalance;
                localStorage.setItem(
                    "currentUser",
                    JSON.stringify(this.currentUser),
                );
                this.updateUI();
            }

            console.log("✅ Баланс обновлен в Supabase");
            return true;
        } catch (error) {
            console.error("❌ Ошибка обновления баланса в Supabase:", error);
            return false;
        }
    }

    updateBalanceLocal(userId, newBalance) {
        // Ищем пользователя
        const userIndex = this.users.findIndex((u) => u.id === userId);

        if (userIndex === -1) {
            console.warn(
                "⚠️ Пользователь не найден для обновления баланса:",
                userId,
            );
            return false;
        }

        // Обновляем баланс
        this.users[userIndex].balance = newBalance;
        this.saveLocalUsers();

        // Обновляем текущего пользователя если нужно
        if (this.currentUser && this.currentUser.id === userId) {
            this.currentUser.balance = newBalance;
            localStorage.setItem(
                "currentUser",
                JSON.stringify(this.currentUser),
            );
            this.updateUI();
        }

        console.log("✅ Локальный баланс обновлен");
        return true;
    }

    // ============ ОБНОВЛЕНИЕ СТАТИСТИКИ ============
    async updateUserStats(userId, won) {
        console.log("📊 Обновление статистики:", userId, "выиграл:", won);

        if (this.isOnline) {
            return await this.updateStatsSupabase(userId, won);
        } else {
            return this.updateStatsLocal(userId, won);
        }
    }

    async updateStatsSupabase(userId, won) {
        try {
            // Сначала получаем текущую статистику
            const { data: user, error: fetchError } = await supabaseClient
                .from("users")
                .select("total_games, games_won")
                .eq("id", userId)
                .single();

            if (fetchError) throw fetchError;

            // Обновляем статистику
            const newTotalGames = (user.total_games || 0) + 1;
            const newGamesWon = (user.games_won || 0) + (won ? 1 : 0);

            const { error: updateError } = await supabaseClient
                .from("users")
                .update({
                    total_games: newTotalGames,
                    games_won: newGamesWon,
                })
                .eq("id", userId);

            if (updateError) throw updateError;

            // Обновляем локально если это текущий пользователь
            if (this.currentUser && this.currentUser.id === userId) {
                if (!this.currentUser.stats) {
                    this.currentUser.stats = { totalGames: 0, gamesWon: 0 };
                }
                this.currentUser.stats.totalGames = newTotalGames;
                this.currentUser.stats.gamesWon = newGamesWon;
                localStorage.setItem(
                    "currentUser",
                    JSON.stringify(this.currentUser),
                );
                this.updateStats();
            }

            console.log("✅ Статистика обновлена в Supabase");
            return true;
        } catch (error) {
            console.error("❌ Ошибка обновления статистики в Supabase:", error);
            return false;
        }
    }

    updateStatsLocal(userId, won) {
        const userIndex = this.users.findIndex((u) => u.id === userId);

        if (userIndex === -1) {
            console.warn(
                "⚠️ Пользователь не найден для обновления статистики:",
                userId,
            );
            return false;
        }

        // Инициализируем статистику если её нет
        if (!this.users[userIndex].stats) {
            this.users[userIndex].stats = { totalGames: 0, gamesWon: 0 };
        }

        // Обновляем статистику
        this.users[userIndex].stats.totalGames++;
        if (won) {
            this.users[userIndex].stats.gamesWon++;
        }

        this.saveLocalUsers();

        // Обновляем текущего пользователя если нужно
        if (this.currentUser && this.currentUser.id === userId) {
            if (!this.currentUser.stats) {
                this.currentUser.stats = { totalGames: 0, gamesWon: 0 };
            }
            this.currentUser.stats.totalGames =
                this.users[userIndex].stats.totalGames;
            this.currentUser.stats.gamesWon =
                this.users[userIndex].stats.gamesWon;
            localStorage.setItem(
                "currentUser",
                JSON.stringify(this.currentUser),
            );
            this.updateStats();
        }

        console.log("✅ Локальная статистика обновлена");
        return true;
    }

    // ============ ПОЛУЧЕНИЕ ВСЕХ ПОЛЬЗОВАТЕЛЕЙ (для админа) ============
    async getAllUsers() {
        if (!this.currentUser?.isAdmin) {
            console.warn(
                "⚠️ Попытка получить пользователей без прав администратора",
            );
            return [];
        }

        if (this.isOnline) {
            return await this.getUsersFromSupabase();
        } else {
            return this.getUsersFromLocal();
        }
    }

    async getUsersFromSupabase() {
        try {
            const { data: users, error } = await supabaseClient
                .from("users")
                .select("*")
                .order("created_at", { ascending: false });

            if (error) throw error;

            return users.map((user) => ({
                id: user.id,
                username: user.username,
                email: user.email,
                balance: user.balance,
                isAdmin: user.is_admin,
                stats: {
                    totalGames: user.total_games,
                    gamesWon: user.games_won,
                },
                created_at: user.created_at,
            }));
        } catch (error) {
            console.error(
                "❌ Ошибка получения пользователей из Supabase:",
                error,
            );
            return this.getUsersFromLocal();
        }
    }

    getUsersFromLocal() {
        return this.users.map((user) => ({
            id: user.id,
            username: user.username,
            email: user.email,
            balance: user.balance,
            isAdmin: user.isAdmin,
            stats: user.stats,
            created_at: user.created_at,
        }));
    }

    // ============ СОХРАНЕНИЕ ИСТОРИИ ИГР ============
    async saveGameHistory(userId, gameType, betAmount, winAmount, result) {
        console.log("📝 Сохранение истории игры:", {
            userId,
            gameType,
            betAmount,
            winAmount,
        });

        if (this.isOnline) {
            return await this.saveHistoryToSupabase(
                userId,
                gameType,
                betAmount,
                winAmount,
                result,
            );
        }
        return true; // В оффлайн режиме просто возвращаем true
    }

    async saveHistoryToSupabase(
        userId,
        gameType,
        betAmount,
        winAmount,
        result,
    ) {
        try {
            const { error } = await supabaseClient.from("game_history").insert([
                {
                    user_id: userId,
                    game_type: gameType,
                    bet_amount: betAmount,
                    win_amount: winAmount,
                    result: result,
                    created_at: new Date().toISOString(),
                },
            ]);

            if (error) throw error;

            console.log("✅ История игры сохранена в Supabase");
            return true;
        } catch (error) {
            console.error("❌ Ошибка сохранения истории в Supabase:", error);
            return false;
        }
    }

    // ============ ОБНОВЛЕНИЕ ИНТЕРФЕЙСА ============
    updateUI() {
        // Обновляем имя пользователя
        const usernameEl = document.getElementById("usernameDisplay");
        if (usernameEl) {
            usernameEl.textContent = this.currentUser?.username || "Гость";
        }

        // Обновляем баланс
        const balanceEl = document.getElementById("userBalance");
        if (balanceEl) {
            balanceEl.textContent = this.currentUser?.balance || 0;
        }

        // Показываем/скрываем кнопку выхода
        const logoutBtn = document.getElementById("logoutBtn");
        if (logoutBtn) {
            logoutBtn.style.display = this.currentUser ? "block" : "none";
        }

        // Показываем/скрываем панели
        const authPanel = document.getElementById("authPanel");
        const statsPanel = document.getElementById("statsPanel");
        const adminPanel = document.getElementById("adminPanel");

        if (authPanel) {
            authPanel.style.display = this.currentUser ? "none" : "block";
        }

        if (statsPanel) {
            statsPanel.style.display = this.currentUser ? "block" : "none";
            if (this.currentUser) {
                this.updateStats();
            }
        }

        if (adminPanel) {
            adminPanel.style.display = this.currentUser?.isAdmin
                ? "block"
                : "none";
        }

        // Обновляем статистику если пользователь авторизован
        if (this.currentUser) {
            this.updateStats();
        }
    }

    updateStats() {
        if (!this.currentUser) return;

        const totalGamesEl = document.getElementById("totalGames");
        const gamesWonEl = document.getElementById("gamesWon");
        const winRateEl = document.getElementById("winRate");
        const currentBalanceEl = document.getElementById("currentBalance");

        if (totalGamesEl) {
            totalGamesEl.textContent = this.currentUser.stats?.totalGames || 0;
        }

        if (gamesWonEl) {
            gamesWonEl.textContent = this.currentUser.stats?.gamesWon || 0;
        }

        if (winRateEl) {
            const totalGames = this.currentUser.stats?.totalGames || 0;
            const gamesWon = this.currentUser.stats?.gamesWon || 0;
            const winRate =
                totalGames > 0 ? Math.round((gamesWon / totalGames) * 100) : 0;
            winRateEl.textContent = `${winRate}%`;
        }

        if (currentBalanceEl) {
            currentBalanceEl.textContent = this.currentUser.balance || 0;
        }
    }
}

// Создаем глобальный экземпляр системы авторизации
const auth = new AuthSystem();

// Глобальные функции для HTML событий
window.login = async function () {
    const username = document.getElementById("username").value.trim();
    const password = document.getElementById("password").value.trim();

    const result = await auth.login(username, password);
    showMessage(result.message, result.success ? "success" : "error");

    if (result.success) {
        document.getElementById("username").value = "";
        document.getElementById("password").value = "";
    }
};

window.register = async function () {
    const username = document.getElementById("username").value.trim();
    const password = document.getElementById("password").value.trim();

    const result = await auth.register(username, password);
    showMessage(result.message, result.success ? "success" : "error");

    if (result.success) {
        document.getElementById("username").value = "";
        document.getElementById("password").value = "";
    }
};

window.logout = async function () {
    const result = await auth.logout();
    showMessage(result.message, "success");
};

// Вспомогательная функция для показа сообщений
window.showMessage = function (text, type) {
    const messageEl = document.getElementById("authMessage");
    if (messageEl) {
        messageEl.textContent = text;
        messageEl.className = `message ${type}`;
        messageEl.style.display = "block";

        setTimeout(() => {
            messageEl.style.display = "none";
        }, 3000);
    }
};
