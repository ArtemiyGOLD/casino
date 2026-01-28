// supabase-auth.js - Работа с Supabase (авторизация, пользователи)
console.log('🔐 Инициализация Supabase...');

// Конфигурация Supabase (твои ключи)
const SUPABASE_URL = 'https://wtwlmhrosdkbogfjvkvo.supabase.co';
const SUPABASE_KEY = 'sb_publishable_ee3s6kfMw3cssALH_y2j7w_tU2fNikh';

// Инициализация клиента
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// Текущий пользователь
let currentUser = null;

// ==================== СХЕМА БАЗЫ ДАННЫХ ====================
/*
users таблица:
id - uuid (primary key)
username - text (unique)
password - text (в реальном приложении нужно хэшировать!)
name - text
balance - integer (default: 1000)
role - text (default: 'user')
created_at - timestamp

games таблица:
id - uuid (primary key)
user_id - uuid (foreign key)
game_type - text
bet_amount - integer
win_amount - integer
result - jsonb
created_at - timestamp

transactions таблица:
id - uuid (primary key)
from_user_id - uuid
to_user_id - uuid
amount - integer
type - text
description - text
created_at - timestamp
*/

// ==================== ОСНОВНЫЕ ФУНКЦИИ ====================

/**
 * Инициализация базы (создание тестовых пользователей если их нет)
 */
async function initDatabase() {
    try {
        console.log('🔧 Проверяем базу данных...');
        
        // Проверяем есть ли админ
        const { data: admin } = await supabase
            .from('users')
            .select('*')
            .eq('username', 'admin')
            .single();
        
        if (!admin) {
            console.log('👑 Создаем тестового админа...');
            await supabase.from('users').insert([
                {
                    username: 'admin',
                    password: 'admin123', // ВНИМАНИЕ: в продакшене хэшируйте пароли!
                    name: 'Администратор',
                    balance: 1000000,
                    role: 'admin'
                }
            ]);
        }
        
        // Проверяем есть ли тестовый игрок
        const { data: player } = await supabase
            .from('users')
            .select('*')
            .eq('username', 'player')
            .single();
        
        if (!player) {
            console.log('👤 Создаем тестового игрока...');
            await supabase.from('users').insert([
                {
                    username: 'player',
                    password: 'player123',
                    name: 'Тестовый игрок',
                    balance: 5000,
                    role: 'user'
                }
            ]);
        }
        
        console.log('✅ База данных готова');
        return true;
        
    } catch (error) {
        console.error('❌ Ошибка инициализации базы:', error);
        return false;
    }
}

/**
 * Регистрация нового пользователя
 */
async function registerUser(username, password, name) {
    try {
        console.log('📝 Регистрация пользователя:', username);
        
        // Проверяем, есть ли пользователь с таким логином
        const { data: existingUser } = await supabase
            .from('users')
            .select('id')
            .eq('username', username)
            .single();
        
        if (existingUser) {
            throw new Error('Пользователь с таким логином уже существует');
        }
        
        // Создаем нового пользователя
        const { data: user, error } = await supabase
            .from('users')
            .insert([
                {
                    username,
                    password, // ВНИМАНИЕ: в реальном приложении пароли нужно хэшировать!
                    name: name || username,
                    balance: 1000, // Стартовый баланс
                    role: 'user'
                }
            ])
            .select()
            .single();
        
        if (error) throw error;
        
        console.log('✅ Пользователь зарегистрирован:', user.username);
        return user;
        
    } catch (error) {
        console.error('❌ Ошибка регистрации:', error);
        throw error;
    }
}

/**
 * Вход пользователя
 */
async function loginUser(username, password) {
    try {
        console.log('🔑 Попытка входа:', username);
        
        // Ищем пользователя
        const { data: user, error } = await supabase
            .from('users')
            .select('*')
            .eq('username', username)
            .single();
        
        if (error || !user) {
            throw new Error('Пользователь не найден');
        }
        
        // Проверяем пароль (в реальном приложении сравниваем хэши)
        if (user.password !== password) {
            throw new Error('Неверный пароль');
        }
        
        // Убираем пароль из объекта
        const { password: _, ...userWithoutPassword } = user;
        currentUser = userWithoutPassword;
        
        // Сохраняем в sessionStorage
        sessionStorage.setItem('currentUserId', user.id);
        
        console.log('✅ Успешный вход:', user.username);
        return userWithoutPassword;
        
    } catch (error) {
        console.error('❌ Ошибка входа:', error);
        throw error;
    }
}

/**
 * Выход пользователя
 */
function logoutUser() {
    currentUser = null;
    sessionStorage.removeItem('currentUserId');
    console.log('✅ Пользователь вышел');
}

/**
 * Получение текущего пользователя
 */
async function getCurrentUser() {
    // Если уже загружен в памяти
    if (currentUser) return currentUser;
    
    // Пробуем загрузить из sessionStorage
    const userId = sessionStorage.getItem('currentUserId');
    if (!userId) return null;
    
    try {
        const { data: user, error } = await supabase
            .from('users')
            .select('*')
            .eq('id', userId)
            .single();
        
        if (error || !user) {
            sessionStorage.removeItem('currentUserId');
            return null;
        }
        
        // Убираем пароль
        const { password: _, ...userWithoutPassword } = user;
        currentUser = userWithoutPassword;
        
        return currentUser;
        
    } catch (error) {
        console.error('Ошибка загрузки пользователя:', error);
        return null;
    }
}

/**
 * Обновление баланса пользователя
 */
async function updateUserBalance(userId, amount) {
    try {
        // Получаем текущий баланс
        const { data: user } = await supabase
            .from('users')
            .select('balance')
            .eq('id', userId)
            .single();
        
        if (!user) throw new Error('Пользователь не найден');
        
        const newBalance = user.balance + amount;
        
        // Обновляем баланс
        const { error } = await supabase
            .from('users')
            .update({ balance: newBalance })
            .eq('id', userId);
        
        if (error) throw error;
        
        // Обновляем текущего пользователя если это он
        if (currentUser && currentUser.id === userId) {
            currentUser.balance = newBalance;
        }
        
        return newBalance;
        
    } catch (error) {
        console.error('Ошибка обновления баланса:', error);
        throw error;
    }
}

/**
 * Перевод средств между пользователями
 */
async function transferCoins(fromUserId, toUsername, amount, description = '') {
    try {
        if (amount <= 0) throw new Error('Сумма должна быть положительной');
        
        // Находим получателя
        const { data: toUser } = await supabase
            .from('users')
            .select('*')
            .eq('username', toUsername)
            .single();
        
        if (!toUser) throw new Error('Получатель не найден');
        if (fromUserId === toUser.id) throw new Error('Нельзя переводить самому себе');
        
        // Проверяем баланс отправителя
        const { data: fromUser } = await supabase
            .from('users')
            .select('balance')
            .eq('id', fromUserId)
            .single();
        
        if (!fromUser) throw new Error('Отправитель не найден');
        if (fromUser.balance < amount) throw new Error('Недостаточно средств');
        
        // Обновляем балансы через транзакцию (в одной операции)
        const { error: updateError } = await supabase.rpc('make_transfer', {
            p_from_user_id: fromUserId,
            p_to_user_id: toUser.id,
            p_amount: amount,
            p_description: description || `Перевод от ${currentUser?.username || 'пользователя'}`
        });
        
        if (updateError) throw updateError;
        
        // Обновляем текущего пользователя
        if (currentUser && currentUser.id === fromUserId) {
            const newBalance = fromUser.balance - amount;
            currentUser.balance = newBalance;
        }
        
        return {
            success: true,
            toUser: toUser.username,
            amount,
            newBalance: fromUser.balance - amount
        };
        
    } catch (error) {
        console.error('Ошибка перевода:', error);
        throw error;
    }
}

/**
 * Сохранение результата игры
 */
async function saveGameResult(gameData) {
    try {
        if (!currentUser) throw new Error('Пользователь не авторизован');
        
        const { error } = await supabase
            .from('games')
            .insert([
                {
                    user_id: currentUser.id,
                    game_type: gameData.type,
                    bet_amount: gameData.bet,
                    win_amount: gameData.win,
                    result: gameData.result
                }
            ]);
        
        if (error) throw error;
        
        // Обновляем баланс
        const amountChange = gameData.win - gameData.bet;
        await updateUserBalance(currentUser.id, amountChange);
        
        return true;
        
    } catch (error) {
        console.error('Ошибка сохранения игры:', error);
        throw error;
    }
}

/**
 * Получение истории игр пользователя
 */
async function getGameHistory(userId, limit = 10) {
    try {
        const { data: games, error } = await supabase
            .from('games')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false })
            .limit(limit);
        
        if (error) throw error;
        return games || [];
        
    } catch (error) {
        console.error('Ошибка получения истории:', error);
        return [];
    }
}

// ==================== АДМИН ФУНКЦИИ ====================

/**
 * Получение всех пользователей (только для админа)
 */
async function getAllUsers() {
    try {
        const { data: users, error } = await supabase
            .from('users')
            .select('*')
            .order('created_at', { ascending: false });
        
        if (error) throw error;
        return users || [];
        
    } catch (error) {
        console.error('Ошибка получения пользователей:', error);
        return [];
    }
}

/**
 * Обновление данных пользователя (админ)
 */
async function adminUpdateUser(userId, updates) {
    try {
        // Не позволяем менять пароль через эту функцию
        if (updates.password) {
            delete updates.password;
        }
        
        const { error } = await supabase
            .from('users')
            .update(updates)
            .eq('id', userId);
        
        if (error) throw error;
        
        return true;
        
    } catch (error) {
        console.error('Ошибка обновления пользователя:', error);
        throw error;
    }
}

/**
 * Удаление пользователя (админ)
 */
async function adminDeleteUser(userId) {
    try {
        const { error } = await supabase
            .from('users')
            .delete()
            .eq('id', userId);
        
        if (error) throw error;
        
        return true;
        
    } catch (error) {
        console.error('Ошибка удаления пользователя:', error);
        throw error;
    }
}

/**
 * Быстрое пополнение баланса (админ)
 */
async function adminAddCoinsToUser(userId, amount) {
    try {
        // Получаем текущий баланс
        const { data: user } = await supabase
            .from('users')
            .select('balance, username')
            .eq('id', userId)
            .single();
        
        if (!user) throw new Error('Пользователь не найден');
        
        const newBalance = user.balance + amount;
        
        // Обновляем баланс
        const { error } = await supabase
            .from('users')
            .update({ balance: newBalance })
            .eq('id', userId);
        
        if (error) throw error;
        
        // Записываем транзакцию
        await supabase.from('transactions').insert([
            {
                to_user_id: userId,
                amount: amount,
                type: 'admin_add',
                description: `Пополнение от администратора (${amount} монет)`
            }
        ]);
        
        return {
            success: true,
            username: user.username,
            newBalance
        };
        
    } catch (error) {
        console.error('Ошибка пополнения баланса:', error);
        throw error;
    }
}

/**
 * Получение статистики (админ)
 */
async function getAdminStats() {
    try {
        // Получаем всех пользователей
        const { data: users } = await supabase
            .from('users')
            .select('balance, role');
        
        // Получаем все игры
        const { data: games } = await supabase
            .from('games')
            .select('id');
        
        if (!users) users = [];
        if (!games) games = [];
        
        const totalBalance = users.reduce((sum, user) => sum + (user.balance || 0), 0);
        const totalAdmins = users.filter(user => user.role === 'admin').length;
        
        return {
            totalUsers: users.length,
            totalBalance,
            totalGames: games.length,
            totalAdmins
        };
        
    } catch (error) {
        console.error('Ошибка получения статистики:', error);
        return {
            totalUsers: 0,
            totalBalance: 0,
            totalGames: 0,
            totalAdmins: 0
        };
    }
}

// ==================== ЭКСПОРТ ФУНКЦИЙ ====================

window.supabaseAuth = {
    // Конфигурация
    SUPABASE_URL,
    SUPABASE_KEY,
    
    // Инициализация
    initDatabase,
    
    // Авторизация
    register: registerUser,
    login: loginUser,
    logout: logoutUser,
    getCurrentUser,
    
    // Пользовательские функции
    updateBalance: updateUserBalance,
    transfer: transferCoins,
    saveGameResult,
    getGameHistory,
    
    // Админ функции
    getAllUsers,
    updateUser: adminUpdateUser,
    deleteUser: adminDeleteUser,
    addCoins: adminAddCoinsToUser,
    getStats: getAdminStats,
    
    // Текущий пользователь
    currentUser: () => currentUser,
    
    // Клиент Supabase (для отладки)
    client: supabase
};

// Инициализируем при загрузке
document.addEventListener('DOMContentLoaded', async () => {
    console.log('🚀 Инициализация Supabase...');
    await initDatabase();
    
    // Проверяем авторизован ли пользователь
    const user = await getCurrentUser();
    if (user) {
        console.log('✅ Пользователь уже авторизован:', user.username);
        // Обновим интерфейс через app.js
        if (window.app && window.app.onUserLoaded) {
            window.app.onUserLoaded(user);
        }
    }
    
    console.log('✅ Supabase готов к работе');
});