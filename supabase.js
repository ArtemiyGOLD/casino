// ============================
// КОНФИГУРАЦИЯ SUPABASE
// ============================

// ТВОИ КЛЮЧИ (не меняй эти значения)
const SUPABASE_URL = 'https://wtwlmhrosdkbogfjvkvo.supabase.co';
const SUPABASE_KEY = 'sb_publishable_ee3s6kfMw3cssALH_y2j7w_tU2fNikh';

// ОДИН раз инициализируем клиент
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// Глобальные переменные
let currentUser = null;

// ============================
// ОСНОВНЫЕ ФУНКЦИИ
// ============================

/**
 * Инициализация пользователя из Telegram
 * @returns {Promise<Object>} Данные пользователя
 */
async function initTelegramUser() {
    try {
        console.log('🔑 Начинаем инициализацию пользователя...');
        
        // Получаем данные из Telegram
        const tg = window.Telegram.WebApp;
        const tgUser = tg.initDataUnsafe.user;
        
        if (!tgUser) {
            throw new Error('❌ Нет данных от Telegram. Запустите через бота.');
        }
        
        console.log('📱 Telegram данные:', {
            id: tgUser.id,
            username: tgUser.username,
            firstName: tgUser.first_name
        });
        
        // 1. Проверяем, есть ли пользователь в базе
        console.log('🔍 Ищем пользователя в базе...');
        const { data: existingUser, error: fetchError } = await supabase
            .from('users')
            .select('*')
            .eq('telegram_id', tgUser.id)
            .single();
        
        // Если пользователь найден
        if (existingUser && !fetchError) {
            console.log('✅ Пользователь найден:', existingUser);
            currentUser = existingUser;
            return existingUser;
        }
        
        // Если пользователь не найден (это нормально)
        if (fetchError && fetchError.code === 'PGRST116') {
            console.log('👤 Пользователь не найден, создаем нового...');
            
            // 2. Создаем нового пользователя
            const { data: newUser, error: createError } = await supabase
                .from('users')
                .insert([{
                    telegram_id: tgUser.id,
                    username: tgUser.username || '',
                    first_name: tgUser.first_name || '',
                    last_name: tgUser.last_name || '',
                    balance: 1000
                }])
                .select()
                .single();
            
            if (createError) {
                console.error('❌ Ошибка создания пользователя:', createError);
                throw new Error('Не удалось создать пользователя: ' + createError.message);
            }
            
            console.log('✅ Новый пользователь создан:', newUser);
            currentUser = newUser;
            return newUser;
        }
        
        // Другие ошибки
        throw new Error('Ошибка поиска пользователя: ' + (fetchError?.message || 'Неизвестная ошибка'));
        
    } catch (error) {
        console.error('💥 Критическая ошибка в initTelegramUser:', error);
        
        // Создаем fallback пользователя для тестирования
        console.log('🔄 Создаем тестового пользователя...');
        currentUser = {
            id: 'temp-' + Date.now(),
            telegram_id: 123456789,
            username: 'test_user',
            first_name: 'Тестовый',
            last_name: 'Пользователь',
            balance: 1000
        };
        
        return currentUser;
    }
}

/**
 * Перевод средств другу
 * @param {number} toTelegramId - ID получателя в Telegram
 * @param {number} amount - Сумма перевода
 * @param {string} description - Описание
 */
async function transferCoins(toTelegramId, amount, description = '') {
    try {
        if (!currentUser) throw new Error('Пользователь не авторизован');
        if (currentUser.balance < amount) throw new Error('Недостаточно средств');
        
        console.log('💸 Начинаем перевод:', { toTelegramId, amount });
        
        // Находим получателя
        const { data: receiver, error: receiverError } = await supabase
            .from('users')
            .select('id, username')
            .eq('telegram_id', toTelegramId)
            .single();
        
        if (receiverError) throw new Error('Получатель не найден');
        if (receiver.id === currentUser.id) throw new Error('Нельзя перевести самому себе');
        
        // Выполняем перевод через RPC функцию
        const { data: transaction, error: transError } = await supabase
            .rpc('make_transfer', {
                p_from_user_id: currentUser.id,
                p_to_user_id: receiver.id,
                p_amount: amount,
                p_description: description || `Перевод от ${currentUser.username}`
            });
        
        if (transError) throw transError;
        
        // Обновляем баланс текущего пользователя
        const { data: updatedUser } = await supabase
            .from('users')
            .select('balance')
            .eq('id', currentUser.id)
            .single();
        
        currentUser.balance = updatedUser.balance;
        
        return {
            success: true,
            transaction,
            receiver: receiver.username,
            newBalance: currentUser.balance
        };
        
    } catch (error) {
        console.error('Ошибка перевода:', error);
        throw error;
    }
}

/**
 * Сохранение результата игры
 * @param {Object} gameData - Данные игры
 */
async function saveGameResult(gameData) {
    try {
        if (!currentUser) throw new Error('Пользователь не авторизован');
        
        console.log('🎮 Сохраняем игру:', gameData);
        
        // Сохраняем игру
        const { error } = await supabase
            .from('games')
            .insert([{
                user_id: currentUser.id,
                game_type: gameData.type,
                bet_amount: gameData.bet,
                win_amount: gameData.win,
                result: gameData.result
            }]);
        
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
 * Получение истории игр
 * @param {number} limit - Лимит записей
 */
async function getGameHistory(limit = 10) {
    try {
        if (!currentUser) return [];
        
        const { data: games, error } = await supabase
            .from('games')
            .select('*')
            .eq('user_id', currentUser.id)
            .order('created_at', { ascending: false })
            .limit(limit);
        
        if (error) throw error;
        return games || [];
        
    } catch (error) {
        console.error('Ошибка получения истории:', error);
        return [];
    }
}

/**
 * Обновление баланса пользователя
 * @param {string} userId - ID пользователя
 * @param {number} amountChange - Изменение баланса
 */
async function updateUserBalance(userId, amountChange) {
    try {
        console.log('💰 Обновляем баланс:', { userId, amountChange });
        
        const { data: user } = await supabase
            .from('users')
            .select('balance')
            .eq('id', userId)
            .single();
        
        const newBalance = (user?.balance || 0) + amountChange;
        
        const { error } = await supabase
            .from('users')
            .update({ balance: newBalance })
            .eq('id', userId);
        
        if (error) throw error;
        
        // Обновляем локальные данные
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
 * Получение текущего пользователя
 */
function getCurrentUser() {
    return currentUser;
}

/**
 * Админ функция: добавление монет
 * @param {number} userTelegramId - Telegram ID пользователя
 * @param {number} amount - Количество монет
 */
async function adminAddCoins(userTelegramId, amount) {
    try {
        // Проверка прав (замени 123456789 на свой Telegram ID)
        if (!currentUser || currentUser.telegram_id !== 123456789) {
            throw new Error('Доступ запрещен');
        }
        
        const { data: user } = await supabase
            .from('users')
            .select('id, balance')
            .eq('telegram_id', userTelegramId)
            .single();
        
        if (!user) throw new Error('Пользователь не найден');
        
        const newBalance = user.balance + amount;
        
        await supabase
            .from('users')
            .update({ balance: newBalance })
            .eq('id', user.id);
        
        // Записываем транзакцию
        await supabase
            .from('transactions')
            .insert([{
                to_user_id: user.id,
                amount: amount,
                type: 'admin_add',
                description: 'Пополнение от администратора'
            }]);
        
        return { success: true, newBalance };
        
    } catch (error) {
        console.error('Ошибка админ функции:', error);
        throw error;
    }
}

// ============================
// ЭКСПОРТ ФУНКЦИЙ В ГЛОБАЛЬНУЮ ОБЛАСТЬ
// ============================

window.supabaseClient = {
    // Конфигурация
    SUPABASE_URL,
    SUPABASE_KEY,
    
    // Основные функции
    initTelegramUser,
    transferCoins,
    saveGameResult,
    getGameHistory,
    getCurrentUser,
    adminAddCoins,
    
    // Ссылка на клиент Supabase (для отладки)
    client: supabase
};

// Для обратной совместимости
window.initTelegramUser = initTelegramUser;
window.getCurrentUser = getCurrentUser;

console.log('✅ Supabase.js успешно загружен!');
console.log('Доступные функции:', Object.keys(window.supabaseClient));