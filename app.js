// app.js - Основное приложение
console.log('🚀 Загрузка основного приложения...');

// Основной объект приложения
window.app = {
    // Инициализация
    init: async function() {
        console.log('🎮 Инициализация приложения...');
        
        try {
            // 1. Инициализируем пользователя через Supabase
            if (window.supabaseClient && window.supabaseClient.initTelegramUser) {
                console.log('👤 Инициализируем пользователя в базе...');
                const user = await window.supabaseClient.initTelegramUser();
                
                if (user) {
                    window.currentUser = user;
                    this.updateUI(user);
                    console.log('✅ Пользователь инициализирован:', user);
                }
            } else {
                console.warn('⚠️ Supabase клиент не найден, используем данные Telegram');
                this.updateUI(window.tg?.initDataUnsafe?.user);
            }
            
            // 2. Настраиваем игры
            this.initGames();
            
            // 3. Проверяем админа
            this.checkAdmin();
            
            // 4. Показываем главный экран
            if (window.showScreen) {
                window.showScreen('main');
            }
            
            console.log('🎉 Приложение успешно запущено!');
            
        } catch (error) {
            console.error('💥 Ошибка инициализации:', error);
            window.showNotification('Ошибка загрузки приложения', 'error');
        }
    },
    
    // Обновление интерфейса
    updateUI: function(user) {
        if (!user) return;
        
        // Информация о пользователе
        if (user.first_name) {
            document.getElementById('userName').textContent = user.first_name;
            document.getElementById('userAvatar').textContent = user.first_name[0].toUpperCase();
        }
        
        if (user.telegram_id) {
            document.getElementById('userId').textContent = `ID: ${user.telegram_id}`;
        }
        
        // Баланс
        if (user.balance !== undefined) {
            document.getElementById('balanceAmount').textContent = user.balance;
        }
    },
    
    // Инициализация игр
    initGames: function() {
        console.log('🎮 Инициализация игр...');
        
        // Проверяем, что игры загружены
        if (window.diceGame && window.slotsGame) {
            console.log('✅ Игры уже инициализированы');
        } else {
            console.log('🔄 Инициализируем игры...');
            document.addEventListener('DOMContentLoaded', () => {
                window.diceGame = new DiceGame();
                window.slotsGame = new SlotsGame();
            });
        }
    },
    
    // Проверка админа
    checkAdmin: function() {
        const user = window.currentUser || window.tg?.initDataUnsafe?.user;
        if (!user) return;
        
        // Список ID админов (замените на свои)
        const adminIds = [123456789, 987654321];
        const adminBtn = document.getElementById('adminBtn');
        
        if (adminIds.includes(user.id) && adminBtn) {
            adminBtn.style.display = 'flex';
            console.log('👑 Админ обнаружен');
        }
    },
    
    // Обновление баланса
    updateBalance: async function() {
        try {
            if (window.supabaseClient && window.supabaseClient.getCurrentUser) {
                const user = window.supabaseClient.getCurrentUser();
                if (user && user.balance !== undefined) {
                    document.getElementById('balanceAmount').textContent = user.balance;
                    return user.balance;
                }
            }
        } catch (error) {
            console.error('Ошибка обновления баланса:', error);
        }
        return 0;
    },
    
    // Перевод средств
    makeTransfer: async function() {
        const friendId = document.getElementById('friendId')?.value;
        const amount = parseInt(document.getElementById('transferAmount')?.value || '0');
        const comment = document.getElementById('transferComment')?.value || '';
        
        if (!friendId || !amount || amount <= 0) {
            window.showNotification('Заполните все поля корректно', 'error');
            return;
        }
        
        try {
            if (window.supabaseClient && window.supabaseClient.transferCoins) {
                const result = await window.supabaseClient.transferCoins(
                    parseInt(friendId), 
                    amount, 
                    comment
                );
                
                if (result.success) {
                    window.showNotification(`✅ Переведено ${amount} монет!`, 'success');
                    await this.updateBalance();
                    window.showScreen('main');
                }
            }
        } catch (error) {
            window.showNotification(error.message, 'error');
        }
    },
    
    // Загрузка истории
    loadHistory: async function() {
        try {
            if (window.supabaseClient && window.supabaseClient.getGameHistory) {
                const history = await window.supabaseClient.getGameHistory(10);
                const historyList = document.getElementById('historyList');
                
                if (historyList && history.length > 0) {
                    let html = '';
                    history.forEach(game => {
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
                }
            }
        } catch (error) {
            console.error('Ошибка загрузки истории:', error);
        }
    }
};

// Экспортируем функции для HTML
window.showAdminPanel = function() {
    window.showScreen('admin');
};

window.adminAddCoins = async function() {
    const userId = document.getElementById('adminUserId')?.value;
    const amount = parseInt(document.getElementById('adminAmount')?.value || '0');
    
    if (!userId || !amount) {
        window.showNotification('Заполните все поля', 'error');
        return;
    }
    
    try {
        if (window.supabaseClient && window.supabaseClient.adminAddCoins) {
            const result = await window.supabaseClient.adminAddCoins(
                parseInt(userId), 
                amount
            );
            
            if (result.success) {
                window.showNotification(`✅ Добавлено ${amount} монет пользователю ${userId}`, 'success');
            }
        }
    } catch (error) {
        window.showNotification(error.message, 'error');
    }
};

window.adminGetAllUsers = async function() {
    // Реализация получения списка пользователей
    window.showNotification('Функция в разработке', 'info');
};