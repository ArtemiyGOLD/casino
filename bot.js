const TelegramBot = require('node-telegram-bot-api');
const token = '8317876583:AAEubEsheErSYMei_o3OnFmrLUCWYuZgCbs';
const bot = new TelegramBot(token, { polling: true });

// Команда /start
bot.onText(/\/start/, async (msg) => {
    const chatId = msg.chat.id;
    const firstName = msg.from.first_name;
    
    try {
        // Отправляем приветствие
        await bot.sendMessage(chatId, `🎮 Привет, ${firstName}!\nДобро пожаловать в Coin Games!`, {
            reply_markup: {
                keyboard: [
                    [{ text: "🎮 Открыть игры", web_app: { url: "https://c-nine-tau.vercel.app/" } }]
                ],
                resize_keyboard: true
            }
        });
        
        // Настраиваем Menu Button
        await bot.setChatMenuButton({
            chat_id: chatId,
            menu_button: {
                type: 'web_app',
                text: '🎮 Игры',
                web_app: { url: 'https://c-nine-tau.vercel.app/' }
            }
        });
        
        console.log(`✅ Настроен Menu Button для пользователя ${firstName} (${chatId})`);
        
    } catch (error) {
        console.error('Ошибка настройки бота:', error);
    }
});

// Команда /help
bot.onText(/\/help/, (msg) => {
    const chatId = msg.chat.id;
    bot.sendMessage(chatId, `📚 Доступные команды:\n\n` +
        `/start - Запустить игру\n` +
        `/help - Помощь\n` +
        `/balance - Проверить баланс\n\n` +
        `Для игры нажмите кнопку "🎮 Открыть игры" или Menu Button внизу экрана.`);
});

// Команда /balance
bot.onText(/\/balance/, async (msg) => {
    const chatId = msg.chat.id;
    
    // Здесь можно добавить логику получения баланса из базы
    bot.sendMessage(chatId, `💰 Проверить баланс можно внутри игрового приложения.\n\n` +
        `Нажмите кнопку "🎮 Открыть игры" чтобы войти в игру.`);
});

// Обработка сообщений с кнопками
bot.on('message', (msg) => {
    // Игнорируем команды
    if (msg.text?.startsWith('/')) return;
    
    // Если пользователь написал что-то еще
    if (msg.text && !msg.text.includes('🎮')) {
        bot.sendMessage(msg.chat.id, 
            `Для игры используйте кнопку "🎮 Открыть игры" внизу экрана.\n` +
            `Или отправьте команду /help для помощи.`
        );
    }
});

console.log('🤖 Бот запущен и готов к работе...');