// Конфигурация Supabase
const SUPABASE_URL = 'https://wtwlmhrosdkbogfjvkvo.supabase.co';
const SUPABASE_KEY = 'sb_publishable_ee3s6kfMw3cssALH_y2j7w_tU2fNikh';

// Инициализация клиента
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// Текущий пользователь
let currentUser = null;

// Инициализация пользователя из Telegram
async function initTelegramUser() {
    const tg = window.Telegram.WebApp;
    const tgUser = tg.initDataUnsafe.user;
    
    if (!tgUser) {
        throw new Error('Пользователь Telegram не найден');
    }
    
    // Проверяем, существует ли пользователь в базе
    const { data: existingUser, error: fetchError } = await supabase
        .from('users')
        .select('*')
        .eq('telegram_id', tgUser.id)
        .single();
    
    if (fetchError && fetchError.code !== 'PGRST116') { // PGRST116 = no rows returned
        console.error('Ошибка при поиске пользователя:', fetchError);
        throw fetchError;
    }
    
    if (existingUser) {
        currentUser = existingUser;
        return currentUser;
    }
    
    // Создаем нового пользователя
    const { data: newUser, error: createError } = await supabase
        .from('users')
        .insert([{
            telegram_id: tgUser.id,
            username: tgUser.username,
            first_name: tgUser.first_name,
            last_name: tgUser.last_name,
            balance: 1000 // Стартовый баланс
        }])
        .select()
        .single();
    
    if (createError) {
        console.error('Ошибка при создании пользователя:', createError);
        throw createError;
    }
    
    currentUser = newUser;
    return currentUser;
}

// Обновление баланса пользователя
async function updateUserBalance(userId, amountChange) {
    const { data: user, error: fetchError } = await supabase
        .from('users')
        .select('balance')
        .eq('id', userId)
        .single();
    
    if (fetchError) {
        throw fetchError;
    }
    
    const newBalance = user.balance + amountChange;
    
    const { data: updatedUser, error: updateError } = await supabase
        .from('users')
        .update({ balance: newBalance })
        .eq('id', userId)
        .select()
        .single();
    
    if (updateError) {
        throw updateError;
    }
    
    currentUser = updatedUser;
    return updatedUser;
}

// Запись результата игры
async function saveGameResult(gameData) {
    const { error } = await supabase
        .from('games')
        .insert([{
            user_id: currentUser.id,
            game_type: gameData.type,
            bet_amount: gameData.bet,
            win_amount: gameData.win,
            result: gameData.result
        }]);
    
    if (error) {
        console.error('Ошибка при сохранении игры:', error);
        throw error;
    }
    
    // Обновляем баланс
    const amountChange = gameData.win - gameData.bet;
    await updateUserBalance(currentUser.id, amountChange);
    
    return true;
}

// Получение истории игр
async function getGameHistory(limit = 10) {
    const { data: games, error } = await supabase
        .from('games')
        .select('*')
        .eq('user_id', currentUser.id)
        .order('created_at', { ascending: false })
        .limit(limit);
    
    if (error) {
        console.error('Ошибка при получении истории:', error);
        return [];
    }
    
    return games;
}

// Перевод средств другу
async function transferCoins(toTelegramId, amount, description = '') {
    if (!currentUser) {
        throw new Error('Пользователь не авторизован');
    }
    
    if (currentUser.balance < amount) {
        throw new Error('Недостаточно средств');
    }
    
    // Находим получателя
    const { data: receiver, error: receiverError } = await supabase
        .from('users')
        .select('id, username')
        .eq('telegram_id', toTelegramId)
        .single();
    
    if (receiverError) {
        throw new Error('Пользователь не найден');
    }
    
    if (receiver.id === currentUser.id) {
        throw new Error('Нельзя перевести самому себе');
    }
    
    // Создаем транзакцию через RPC функцию
    const { data: transaction, error: transError } = await supabase
        .rpc('make_transfer', {
            p_from_user_id: currentUser.id,
            p_to_user_id: receiver.id,
            p_amount: amount,
            p_description: description || `Перевод от ${currentUser.username}`
        });
    
    if (transError) {
        throw new Error('Ошибка перевода: ' + transError.message);
    }
    
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
}

// Админ функции (только для админа)
async function adminAddCoins(userTelegramId, amount) {
    // Проверяем, что текущий пользователь - админ
    // Здесь нужно добавить проверку ролей или ID
    const adminTelegramId = 123456789; // Заменить на твой ID
    
    if (currentUser.telegram_id !== adminTelegramId) {
        throw new Error('Доступ запрещен');
    }
    
    const { data: user, error: userError } = await supabase
        .from('users')
        .select('id, balance')
        .eq('telegram_id', userTelegramId)
        .single();
    
    if (userError) {
        throw new Error('Пользователь не найден');
    }
    
    const newBalance = user.balance + amount;
    
    const { error: updateError } = await supabase
        .from('users')
        .update({ balance: newBalance })
        .eq('id', user.id);
    
    if (updateError) {
        throw updateError;
    }
    
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
}

// Экспорт функций
window.supabaseClient = {
    initTelegramUser,
    updateUserBalance,
    saveGameResult,
    getGameHistory,
    transferCoins,
    adminAddCoins,
    getCurrentUser: () => currentUser,
    setCurrentUser: (user) => { currentUser = user; }
};