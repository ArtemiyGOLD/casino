// Глобальные переменные
let currentScreen = 'main';
const tg = window.Telegram.WebApp;

// Инициализация приложения
async function initApp() {
    try {
        // Инициализируем Telegram Web App
        tg.expand();
        tg.setHeaderColor('#1a1a2e');
        tg.setBackgroundColor('#0f0f23');
        
        // Показываем кнопку "Закрыть"
        tg.MainButton.setText('Закрыть');
        tg.MainButton.onClick(tg.close);
        tg.MainButton.show();
        
        // Инициализируем пользователя через Supabase
        const user = await initTelegramUser();
        
        // Обновляем интерфейс
        updateUserInfo(user);
        updateBalance();
        
        // Проверяем, админ ли это
        if (user.telegram_id === 6429524318) { // Замени на свой ID
            document.getElementById('adminBtn').style.display = 'flex';
        }
        
    } catch (error) {
        console.error('Ошибка инициализации:', error);
        showNotification('Ошибка загрузки приложения', 'error');
    }
}

// Обновление информации о пользователе
function updateUserInfo(user) {
    document.getElementById('userName').textContent = 
        user.first_name || user.username || 'Пользователь';
    
    document.getElementById('userId').textContent = `ID: ${user.telegram_id}`;
    
    // Аватарка из инициалов
    const avatar = document.getElementById('userAvatar');
    if (user.first_name) {
        avatar.textContent = user.first_name.charAt(0).toUpperCase();
    }
}

// Обновление баланса
async function updateBalance() {
    const user = window.supabaseClient.getCurrentUser();
    if (user) {
        document.getElementById('balanceAmount').textContent = user.balance;
    }
}

// Переключение экранов
function showScreen(screenName) {
    // Скрываем все экраны
    const screens = document.querySelectorAll('.games-screen, #mainScreen');
    screens.forEach(screen => {
        screen.style.display = 'none';
    });
    
    // Показываем нужный экран
    currentScreen = screenName;
    
    if (screenName === 'main') {
        document.getElementById('mainScreen').style.display = 'block';
        updateBalance();
    } else {
        const screenElement = document.getElementById(screenName + 'Screen');
        if (screenElement) {
            screenElement.style.display = 'block';
            screenElement.style.animation = 'fadeIn 0.3s ease';
        }
        
        // Загружаем историю если открыли этот экран
        if (screenName === 'history') {
            loadGameHistory();
        }
    }
}

// Перевод средств
async function makeTransfer() {
    const friendId = document.getElementById('friendId').value;
    const amount = parseInt(document.getElementById('transferAmount').value);
    const comment = document.getElementById('transferComment').value;
    
    if (!friendId || !amount) {
        showNotification('Заполните все поля', 'error');
        return;
    }
    
    if (amount <= 0) {
        showNotification('Введите корректную сумму', 'error');
        return;
    }
    
    try {
        const result = await window.supabaseClient.transferCoins(
            parseInt(friendId),
            amount,
            comment
        );
        
        showNotification(`✅ Успешно переведено ${amount} монет!`, 'success');
        
        // Очищаем форму
        document.getElementById('friendId').value = '';
        document.getElementById('transferAmount').value = '100';
        document.getElementById('transferComment').value = '';
        
        // Обновляем баланс
        updateBalance();
        
        // Возвращаемся на главный экран
        setTimeout(() => showScreen('main'), 1500);
        
    } catch (error) {
        showNotification(`❌ ${error.message}`, 'error');
    }
}

// Загрузка истории игр
async function loadGameHistory() {
    const historyList = document.getElementById('historyList');
    historyList.innerHTML = '<div style="text-align: center; padding: 20px; color: rgba(255,255,255,0.5);">Загрузка...</div>';
    
    try {
        const games = await window.supabaseClient.getGameHistory(20);
        
        if (games.length === 0) {
            historyList.innerHTML = `
                <div style="text-align: center; padding: 40px; color: rgba(255,255,255,0.5);">
                    🎮 Игр еще не было<br>
                    <small style="font-size: 14px;">Сыграйте в первую игру!</small>
                </div>
            `;
            return;
        }
        
        let html = '';
        games.forEach(game => {
            const date = new Date(game.created_at).toLocaleDateString('ru-RU');
            const time = new Date(game.created_at).toLocaleTimeString('ru-RU', { 
                hour: '2-digit', 
                minute: '2-digit' 
            });
            
            const isWin = game.win_amount > 0;
            const result = game.result;
            
            let gameIcon = '🎮';
            let gameName = 'Игра';
            let details = '';
            
            if (game.game_type === 'dice') {
                gameIcon = '🎲';
                gameName = 'Кости';
                if (result && result.dice1 && result.dice2) {
                    details = `${result.dice1} + ${result.dice2} = ${result.sum}`;
                }
            } else if (game.game_type === 'slots') {
                gameIcon = '🎰';
                gameName = 'Слоты';
                if (result && result.symbols) {
                    details = result.symbols.join(' ');
                }
            }
            
            html += `
                <div class="history-item">
                    <div class="history-game">
                        <div class="history-icon">${gameIcon}</div>
                        <div class="history-details">
                            <h4>${gameName}</h4>
                            <span>${date} ${time}</span>
                            ${details ? `<br><small>${details}</small>` : ''}
                        </div>
                    </div>
                    <div class="history-amount ${isWin ? 'history-win' : 'history-loss'}">
                        ${isWin ? '+' : ''}${game.win_amount - game.bet_amount}
                    </div>
                </div>
            `;
        });
        
        historyList.innerHTML = html;
        
    } catch (error) {
        console.error('Ошибка загрузки истории:', error);
        historyList.innerHTML = `
            <div style="text-align: center; padding: 40px; color: rgba(255,255,255,0.5);">
                Ошибка загрузки истории
            </div>
        `;
    }
}

// Админ функции
function showAdminPanel() {
    showScreen('admin');
}

async function adminAddCoins() {
    const userId = document.getElementById('adminUserId').value;
    const amount = parseInt(document.getElementById('adminAmount').value);
    
    if (!userId || !amount) {
        showNotification('Заполните все поля', 'error');
        return;
    }
    
    try {
        await window.supabaseClient.adminAddCoins(parseInt(userId), amount);
        showNotification(`✅ Добавлено ${amount} монет пользователю ${userId}`, 'success');
        
        // Очищаем поля
        document.getElementById('adminUserId').value = '';
        document.getElementById('adminAmount').value = '1000';
        
    } catch (error) {
        showNotification(`❌ ${error.message}`, 'error');
    }
}

async function adminGetAllUsers() {
    // Здесь нужно реализовать запрос к API для получения всех пользователей
    // Можно использовать Supabase Edge Function
    showNotification('Функция в разработке', 'info');
}

// Функция для показа уведомлений (из games.js, но доступна глобально)
window.showNotification = function(message, type = 'info') {
    const notifications = document.getElementById('notifications') || document.body;
    
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    
    notifications.appendChild(notification);
    
    // Показываем уведомление
    setTimeout(() => notification.classList.add('show'), 10);
    
    // Убираем через 3 секунды
    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => notification.remove(), 300);
    }, 3000);
};

// Обновление баланса в глобальной области видимости
window.updateBalance = updateBalance;

// Запуск приложения при загрузке
document.addEventListener('DOMContentLoaded', initApp);