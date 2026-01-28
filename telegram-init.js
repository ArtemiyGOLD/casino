// telegram-init.js - Инициализация Telegram
console.log('🔧 Инициализация Telegram Mini App...');

// Глобальные переменные
window.tg = null;
window.currentUser = null;

// Проверка и инициализация Telegram
function initTelegram() {
    console.log('🔍 Проверяем Telegram WebApp...');
    
    // Проверяем наличие SDK
    if (!window.Telegram || !window.Telegram.WebApp) {
        console.error('❌ Telegram WebApp SDK не найден!');
        showErrorMessage('Telegram SDK не загружен. Откройте приложение через Telegram бота.');
        return false;
    }
    
    window.tg = window.Telegram.WebApp;
    console.log('✅ Telegram WebApp обнаружен:', tg.platform);
    
    // Настраиваем приложение
    tg.expand(); // Развернуть на весь экран
    tg.enableClosingConfirmation(); // Запрос подтверждения закрытия
    
    // Показываем версию
    console.log('📱 Версия WebApp:', tg.version);
    console.log('👤 Данные инициализации:', tg.initDataUnsafe);
    
    // Проверяем данные пользователя
    if (!tg.initDataUnsafe?.user) {
        console.warn('⚠️ Данные пользователя не получены');
        
        // Если разработка, создаем тестового пользователя
        if (window.location.hostname.includes('localhost') || window.location.hostname.includes('127.0.0.1')) {
            console.log('🔧 Режим разработки: создаем тестового пользователя');
            tg.initDataUnsafe = {
                user: {
                    id: 123456789,
                    first_name: 'Тестовый',
                    last_name: 'Игрок',
                    username: 'test_player',
                    language_code: 'ru',
                    is_premium: false
                }
            };
        } else {
            showErrorMessage('Ошибка авторизации. Перезапустите приложение через бота.');
            return false;
        }
    }
    
    return true;
}

// Функция для показа ошибок
function showErrorMessage(message) {
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
                <h2 style="margin-bottom: 15px;">Ошибка запуска</h2>
                <p style="margin-bottom: 20px; opacity: 0.8;">${message}</p>
                <div style="
                    background: rgba(0,0,0,0.3);
                    padding: 15px;
                    border-radius: 10px;
                    margin: 20px 0;
                    font-size: 14px;
                    text-align: left;
                ">
                    <strong>Как исправить:</strong>
                    <ol style="margin: 10px 0 0 15px;">
                        <li>Откройте Telegram</li>
                        <li>Найдите бота @CoinGamesDemoBot</li>
                        <li>Нажмите кнопку "Menu" внизу экрана</li>
                        <li>Или отправьте команду /start</li>
                    </ol>
                </div>
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

// Настройка кнопок Telegram
function setupTelegramButtons() {
    if (!window.tg) return;
    
    // Основная кнопка
    window.tg.MainButton.setText('✖️ Закрыть');
    window.tg.MainButton.setColor('#007aff');
    window.tg.MainButton.onClick(() => {
        window.tg.close();
    });
    window.tg.MainButton.show();
    
    // Кнопка "Назад"
    window.tg.BackButton.onClick(() => {
        if (window.currentScreen !== 'main') {
            showScreen('main');
        }
    });
}

// Функция для переключения экранов
window.showScreen = function(screenName) {
    console.log('🔄 Переключаемся на экран:', screenName);
    
    // Скрываем все экраны
    document.querySelectorAll('.screen').forEach(screen => {
        screen.classList.remove('active');
    });
    
    // Показываем нужный экран
    const targetScreen = document.getElementById(screenName + 'Screen');
    if (targetScreen) {
        targetScreen.classList.add('active');
        window.currentScreen = screenName;
        
        // Управляем кнопкой "Назад"
        if (window.tg?.BackButton) {
            if (screenName === 'main') {
                window.tg.BackButton.hide();
            } else {
                window.tg.BackButton.show();
            }
        }
    }
};

// Уведомления
window.showNotification = function(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.innerHTML = `
        <div style="display: flex; align-items: center; gap: 10px;">
            <span style="font-size: 20px;">
                ${type === 'success' ? '✅' : type === 'error' ? '❌' : 'ℹ️'}
            </span>
            <span>${message}</span>
        </div>
    `;
    
    document.body.appendChild(notification);
    
    // Анимация
    setTimeout(() => notification.classList.add('show'), 10);
    
    // Автоудаление
    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => notification.remove(), 300);
    }, 3000);
};

// Инициализация при загрузке
document.addEventListener('DOMContentLoaded', () => {
    console.log('📄 DOM загружен, инициализируем Telegram...');
    
    if (initTelegram()) {
        console.log('✅ Telegram инициализирован, запускаем приложение...');
        
        // Даем время на загрузку остальных скриптов
        setTimeout(() => {
            if (window.app && window.app.init) {
                window.app.init();
            } else if (window.initApp) {
                window.initApp();
            } else {
                console.log('⚠️ Основное приложение не загружено, используем базовый функционал');
                setupBasicApp();
            }
        }, 500);
    }
});

// Базовый функционал если основной app.js не загрузился
function setupBasicApp() {
    console.log('🔄 Настраиваем базовый функционал...');
    
    if (window.tg && window.tg.initDataUnsafe?.user) {
        const user = window.tg.initDataUnsafe.user;
        
        // Обновляем информацию о пользователе
        document.getElementById('userName').textContent = user.first_name || 'Игрок';
        document.getElementById('userId').textContent = `ID: ${user.id}`;
        document.getElementById('userAvatar').textContent = user.first_name ? user.first_name[0].toUpperCase() : '👤';
        
        // Показываем приветствие
        setTimeout(() => {
            showNotification(`Привет, ${user.first_name}! 🎮`, 'success');
        }, 1000);
    }
    
    // Настраиваем кнопки Telegram
    setupTelegramButtons();
}