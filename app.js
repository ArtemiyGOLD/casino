// Проверка что функции доступны
console.log('initTelegramUser доступен?', typeof initTelegramUser);
console.log('window.initTelegramUser доступен?', typeof window.initTelegramUser);
// ВСТАВЬ ПЕРВОЙ СТРОКОЙ В app.js
console.log("📱 Telegram данные:", window.Telegram?.WebApp?.initDataUnsafe);
console.log("👤 Пользователь:", window.Telegram?.WebApp?.initDataUnsafe?.user);

// ====================
// ОСНОВНАЯ КОНФИГУРАЦИЯ
// ====================

// Telegram WebApp
const tg = window.Telegram?.WebApp;
let currentUser = null;
let currentScreen = 'main';

// ====================
// ПРОВЕРКА ЗАПУСКА В TELEGRAM
// ====================

function checkTelegramEnvironment() {
    console.log('🔍 Проверка окружения Telegram...');
    
    if (!window.Telegram || !tg) {
        console.error('❌ Telegram WebApp SDK не загружен!');
        showFallbackScreen('Telegram WebApp SDK не загружен. Откройте в Telegram.');
        return false;
    }
    
    // Расширяем на весь экран
    tg.expand();
    tg.enableClosingConfirmation();
    
    // Проверяем данные пользователя
    const initData = tg.initDataUnsafe;
    console.log('📱 Данные от Telegram:', initData);
    
    if (!initData?.user) {
        console.error('❌ Данные пользователя не получены!');
        console.log('Возможные причины:');
        console.log('1. Открыто в браузере, а не в Telegram');
        console.log('2. Menu Button не настроен в @BotFather');
        console.log('3. Проблемы с авторизацией');
        
        showFallbackScreen('Запустите через Telegram бота. Нажмите Menu Button внизу экрана.');
        return false;
    }
    
    console.log('✅ Telegram данные получены:', initData.user);
    return true;
}

// ====================
// ЗАГРУЗОЧНЫЙ ЭКРАН (FALLBACK)
// ====================

function showFallbackScreen(message) {
    document.body.innerHTML = `
        <div class="fallback-container">
            <div class="fallback-card glass">
                <div class="fallback-icon">⚠️</div>
                <h2>Неправильный запуск</h2>
                <p>${message}</p>
                <div class="fallback-steps">
                    <h3>Правильный способ:</h3>
                    <ol>
                        <li>Откройте Telegram</li>
                        <li>Найдите бота <strong>@ваш_бот</strong></li>
                        <li>Нажмите кнопку <strong>Menu Button</strong> внизу</li>
                        <li>Или отправьте команду <code>/start</code></li>
                    </ol>
                </div>
                <button class="btn btn-primary" onclick="window.location.href='https://t.me/ваш_бот'">
                    📲 Перейти в бота
                </button>
                <div class="debug-info">
                    <p><strong>Текущий URL:</strong> ${window.location.href}</p>
                    <p><strong>User Agent:</strong> ${navigator.userAgent}</p>
                </div>
            </div>
        </div>
    `;
    
    // Добавляем стили для fallback
    const style = document.createElement('style');
    style.textContent = `
        .fallback-container {
            min-height: 100vh;
            background: linear-gradient(135deg, #0f0f23 0%, #1a1a2e 100%);
            padding: 20px;
            display: flex;
            align-items: center;
            justify-content: center;
        }
        .fallback-card {
            max-width: 500px;
            width: 100%;
            padding: 30px;
            text-align: center;
        }
        .fallback-icon {
            font-size: 60px;
            margin-bottom: 20px;
        }
        .fallback-steps {
            text-align: left;
            background: rgba(255,255,255,0.05);
            padding: 20px;
            border-radius: 12px;
            margin: 20px 0;
        }
        .fallback-steps ol {
            padding-left: 20px;
        }
        .fallback-steps li {
            margin: 8px 0;
        }
        .debug-info {
            margin-top: 20px;
            padding: 15px;
            background: rgba(0,0,0,0.3);
            border-radius: 10px;
            font-size: 12px;
            text-align: left;
        }
    `;
    document.head.appendChild(style);
}

// ====================
// ОСНОВНАЯ ФУНКЦИЯ ИНИЦИАЛИЗАЦИИ
// ====================

async function initApp() {
    console.log('🚀 Инициализация приложения...');
    
    // Проверяем запуск в Telegram
    if (!checkTelegramEnvironment()) {
        return;
    }
    
    try {
        // 1. Инициализируем пользователя
        console.log('👤 Инициализация пользователя в Supabase...');
        currentUser = await initTelegramUser();
        
        if (!currentUser) {
            throw new Error('Не удалось инициализировать пользователя');
        }
        
        console.log('✅ Пользователь получен:', currentUser);
        
        // 2. Обновляем UI
        updateUserInfo(currentUser);
        updateBalance();
        
        // 3. Настраиваем кнопки Telegram
        setupTelegramButtons();
        
        // 4. Проверяем админа
        checkAdminStatus();
        
        // 5. Показываем приветствие
        setTimeout(() => {
            showNotification(`Добро пожаловать, ${currentUser.first_name || 'игрок'}! 🎮`, 'success');
        }, 500);
        
        console.log('🎉 Приложение успешно запущено!');
        
    } catch (error) {
        console.error('💥 Ошибка инициализации:', error);
        
        // Показываем ошибку пользователю
        document.body.innerHTML = `
            <div class="error-container">
                <div class="error-card glass">
                    <h2>❌ Ошибка загрузки</h2>
                    <p>${error.message}</p>
                    <p style="margin-top: 20px;">Попробуйте:</p>
                    <ul>
                        <li>Перезапустить приложение</li>
                        <li>Очистить кэш Telegram</li>
                        <li>Подождать несколько минут</li>
                    </ul>
                    <button class="btn btn-primary" onclick="location.reload()">
                        🔄 Перезагрузить
                    </button>
                </div>
            </div>
        `;
        
        // Добавляем стили для ошибки
        const style = document.createElement('style');
        style.textContent = `
            .error-container {
                min-height: 100vh;
                background: #1a1a2e;
                padding: 20px;
                display: flex;
                align-items: center;
                justify-content: center;
            }
            .error-card {
                max-width: 500px;
                width: 100%;
                padding: 30px;
                text-align: center;
            }
        `;
        document.head.appendChild(style);
    }
}

// ====================
// РАБОТА С ПОЛЬЗОВАТЕЛЕМ
// ====================

function updateUserInfo(user) {
    const userName = user.first_name || user.username || 'Игрок';
    document.getElementById('userName').textContent = userName;
    document.getElementById('userId').textContent = `ID: ${user.telegram_id}`;
    
    // Устанавливаем аватар (первая буква имени)
    const avatar = document.getElementById('userAvatar');
    if (user.first_name) {
        avatar.textContent = user.first_name.charAt(0).toUpperCase();
    }
}

async function updateBalance() {
    if (!currentUser) return;
    
    try {
        // Обновляем данные из базы
        const user = await getCurrentUserFromDB();
        if (user) {
            currentUser = user;
            document.getElementById('balanceAmount').textContent = user.balance;
        }
    } catch (error) {
        console.error('Ошибка обновления баланса:', error);
        // Используем кэшированное значение
        if (currentUser.balance) {
            document.getElementById('balanceAmount').textContent = currentUser.balance;
        }
    }
}

// ====================
// НАСТРОЙКА КНОПОК TELEGRAM
// ====================

function setupTelegramButtons() {
    if (!tg) return;
    
    // Основная кнопка "Закрыть"
    tg.MainButton.setText("✖️ Закрыть");
    tg.MainButton.onClick(() => {
        tg.close();
    });
    tg.MainButton.show();
    
    // Кнопка "Назад" для Mini Apps
    if (tg.BackButton) {
        tg.BackButton.onClick(() => {
            if (currentScreen !== 'main') {
                showScreen('main');
            }
        });
    }
}

// ====================
// ПЕРЕКЛЮЧЕНИЕ ЭКРАНОВ
// ====================

function showScreen(screenName) {
    console.log(`🔄 Переключаемся на экран: ${screenName}`);
    
    // Скрываем все экраны
    document.querySelectorAll('.screen').forEach(screen => {
        screen.style.display = 'none';
    });
    
    // Показываем нужный экран
    const targetScreen = document.getElementById(`${screenName}Screen`);
    if (targetScreen) {
        targetScreen.style.display = 'block';
        currentScreen = screenName;
        
        // Настраиваем кнопку "Назад"
        if (tg?.BackButton) {
            if (screenName === 'main') {
                tg.BackButton.hide();
            } else {
                tg.BackButton.show();
            }
        }
        
        // Загружаем данные для экрана
        loadScreenData(screenName);
    }
}

function loadScreenData(screenName) {
    switch(screenName) {
        case 'history':
            loadGameHistory();
            break;
        case 'admin':
            loadAdminPanel();
            break;
        // Для других экранов можно добавить загрузку данных
    }
}

// ====================
// АДМИН-ПАНЕЛЬ
// ====================

function checkAdminStatus() {
    if (!currentUser) return;
    
    const adminIds = [123456789]; // Твой Telegram ID
    const adminBtn = document.getElementById('adminBtn');
    
    if (adminIds.includes(currentUser.telegram_id)) {
        adminBtn.style.display = 'flex';
        console.log('👑 Пользователь является админом');
    }
}

async function loadAdminPanel() {
    // Здесь будет загрузка данных для админ-панели
    console.log('Загрузка админ-панели...');
}

// ====================
// УВЕДОМЛЕНИЯ
// ====================

function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.innerHTML = `
        <div class="notification-content">
            <div class="notification-icon">
                ${type === 'success' ? '✅' : type === 'error' ? '❌' : 'ℹ️'}
            </div>
            <div class="notification-text">${message}</div>
            <button class="notification-close" onclick="this.parentElement.parentElement.remove()">×</button>
        </div>
    `;
    
    document.body.appendChild(notification);
    
    // Анимация появления
    setTimeout(() => notification.classList.add('show'), 10);
    
    // Автоматическое скрытие
    setTimeout(() => {
        if (notification.parentElement) {
            notification.classList.remove('show');
            setTimeout(() => notification.remove(), 300);
        }
    }, 3000);
}

// ====================
// ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ
// ====================

async function getCurrentUserFromDB() {
    try {
        const { data, error } = await supabase
            .from('users')
            .select('*')
            .eq('telegram_id', currentUser.telegram_id)
            .single();
            
        if (error) throw error;
        return data;
    } catch (error) {
        console.error('Ошибка получения пользователя:', error);
        return null;
    }
}

// ====================
// ПЕРЕВОД СРЕДСТВ
// ====================

async function makeTransfer() {
    const friendId = document.getElementById('friendId')?.value;
    const amount = parseInt(document.getElementById('transferAmount')?.value || '0');
    const comment = document.getElementById('transferComment')?.value || '';
    
    if (!friendId || !amount || amount <= 0) {
        showNotification('Заполните все поля корректно', 'error');
        return;
    }
    
    if (amount > currentUser.balance) {
        showNotification('Недостаточно средств', 'error');
        return;
    }
    
    try {
        const result = await transferCoins(parseInt(friendId), amount, comment);
        
        if (result.success) {
            showNotification(`✅ Переведено ${amount} монет!`, 'success');
            await updateBalance();
            showScreen('main');
        } else {
            showNotification(result.error || 'Ошибка перевода', 'error');
        }
    } catch (error) {
        showNotification(error.message, 'error');
    }
}

// ====================
// ЗАГРУЗКА ИСТОРИИ ИГР
// ====================

async function loadGameHistory() {
    const historyList = document.getElementById('historyList');
    if (!historyList) return;
    
    historyList.innerHTML = '<div class="loading">Загрузка истории...</div>';
    
    try {
        const games = await getGameHistory(10);
        
        if (!games || games.length === 0) {
            historyList.innerHTML = '<div class="empty-state">История игр пуста</div>';
            return;
        }
        
        let html = '';
        games.forEach(game => {
            const date = new Date(game.created_at).toLocaleDateString('ru-RU');
            const profit = game.win_amount - game.bet_amount;
            
            html += `
                <div class="history-item">
                    <div class="history-game">
                        <div class="history-icon">${game.game_type === 'dice' ? '🎲' : '🎰'}</div>
                        <div class="history-details">
                            <h4>${game.game_type === 'dice' ? 'Кости' : 'Слоты'}</h4>
                            <span>${date}</span>
                        </div>
                    </div>
                    <div class="history-amount ${profit >= 0 ? 'win' : 'loss'}">
                        ${profit >= 0 ? '+' : ''}${profit}
                    </div>
                </div>
            `;
        });
        
        historyList.innerHTML = html;
    } catch (error) {
        console.error('Ошибка загрузки истории:', error);
        historyList.innerHTML = '<div class="error">Ошибка загрузки</div>';
    }
}

// ====================
// ЗАПУСК ПРИЛОЖЕНИЯ
// ====================

// Ждем полной загрузки страницы
document.addEventListener('DOMContentLoaded', () => {
    console.log('📄 DOM загружен, запускаем приложение...');
    initApp();
});

// Экспортируем функции для использования в других файлах
window.app = {
    showScreen,
    showNotification,
    updateBalance,
    makeTransfer,
    getCurrentUser: () => currentUser
};