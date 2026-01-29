// Общие функции
function closeModal() {
    const modal = document.querySelector('.modal');
    if (modal) {
        modal.remove();
    }
}

// Закрытие модального окна при клике вне его
document.addEventListener('click', (e) => {
    if (e.target.classList.contains('modal')) {
        closeModal();
    }
});

// Закрытие модального окна по Escape
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        closeModal();
    }
});

// Функция показа сообщений
window.showMessage = function(text, type) {
    const messageEl = document.getElementById('authMessage');
    if (messageEl) {
        messageEl.textContent = text;
        messageEl.className = `message ${type}`;
        messageEl.style.display = 'block';
        
        setTimeout(() => {
            messageEl.style.display = 'none';
        }, 3000);
    } else {
        // Для админ-панели и других мест
        const message = document.createElement('div');
        message.textContent = text;
        message.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 15px 25px;
            border-radius: 12px;
            background: ${type === 'success' ? 'rgba(46, 204, 113, 0.9)' : 'rgba(231, 76, 60, 0.9)'};
            color: white;
            z-index: 10000;
            backdrop-filter: blur(10px);
            border: 1px solid ${type === 'success' ? 'rgba(46, 204, 113, 0.3)' : 'rgba(231, 76, 60, 0.3)'};
            box-shadow: 0 5px 15px rgba(0,0,0,0.3);
        `;
        
        document.body.appendChild(message);
        
        setTimeout(() => {
            message.style.opacity = '0';
            message.style.transform = 'translateY(-20px)';
            setTimeout(() => message.remove(), 300);
        }, 3000);
    }
};

// Глобальные функции для кнопок (добавляем проверки)
window.openDiceGame = function() {
    if (typeof diceGame !== 'undefined' && diceGame.openGame) {
        diceGame.openGame();
    } else {
        showMessage('Игра в кубики еще не загружена', 'error');
    }
};

window.openSlotsGame = function() {
    if (typeof slotsGame !== 'undefined' && slotsGame.openGame) {
        slotsGame.openGame();
    } else {
        showMessage('Игра в слоты еще не загружена', 'error');
    }
};

window.openAdminPanel = function() {
    if (typeof adminPanel !== 'undefined' && adminPanel.openPanel) {
        adminPanel.openPanel();
    } else {
        showMessage('Админ-панель еще не загружена', 'error');
    }
};

window.closeModal = closeModal;

// Функции авторизации (уже объявлены в auth.js, но добавляем проверки)
window.login = async function() {
    if (typeof auth !== 'undefined' && auth.login) {
        const username = document.getElementById('username').value.trim();
        const password = document.getElementById('password').value.trim();
        
        const result = await auth.login(username, password);
        showMessage(result.message, result.success ? 'success' : 'error');
        
        if (result.success) {
            document.getElementById('username').value = '';
            document.getElementById('password').value = '';
        }
    } else {
        showMessage('Система авторизации не загружена', 'error');
    }
};

window.register = async function() {
    if (typeof auth !== 'undefined' && auth.register) {
        const username = document.getElementById('username').value.trim();
        const password = document.getElementById('password').value.trim();
        
        const result = await auth.register(username, password);
        showMessage(result.message, result.success ? 'success' : 'error');
        
        if (result.success) {
            document.getElementById('username').value = '';
            document.getElementById('password').value = '';
        }
    } else {
        showMessage('Система авторизации не загружена', 'error');
    }
};

window.logout = async function() {
    if (typeof auth !== 'undefined' && auth.logout) {
        const result = await auth.logout();
        showMessage(result.message, 'success');
    } else {
        showMessage('Система авторизации не загружена', 'error');
    }
};

// Функции для истории игр
async function openGameHistory() {
    if (!auth.currentUser) {
        showMessage('Сначала войдите в аккаунт', 'error');
        return;
    }
    
    let history = [];
    
    if (auth.isOnline && window.supabaseClient) {
        try {
            const { data, error } = await supabaseClient
                .from('game_history')
                .select('*')
                .eq('user_id', auth.currentUser.id)
                .order('created_at', { ascending: false })
                .limit(20);
            
            if (!error) history = data;
        } catch (error) {
            console.error('Ошибка загрузки истории:', error);
        }
    }
    
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h2><i class="fas fa-history"></i> История игр</h2>
                <button class="close-btn" onclick="closeModal()">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            
            <div class="history-list">
                ${history.length > 0 ? 
                    history.map(game => `
                        <div class="history-item glass-effect">
                            <div class="history-game">${game.game_type === 'dice' ? '🎲 Кубик' : '🎰 Слоты'}</div>
                            <div class="history-details">
                                <div>Ставка: ${game.bet_amount}</div>
                                <div>Выигрыш: ${game.win_amount}</div>
                                <div>${new Date(game.created_at).toLocaleString()}</div>
                            </div>
                        </div>
                    `).join('') :
                    '<p style="text-align: center; padding: 20px;">История игр пуста</p>'
                }
            </div>
        </div>
    `;
    
    document.getElementById('modalsContainer').appendChild(modal);
}

async function openGameHistoryAdmin() {
    if (!auth.currentUser?.isAdmin) {
        showMessage('Требуются права администратора', 'error');
        return;
    }
    
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.innerHTML = `
        <div class="modal-content" style="max-width: 800px;">
            <div class="modal-header">
                <h2><i class="fas fa-database"></i> Вся история игр</h2>
                <button class="close-btn" onclick="closeModal()">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            
            <div class="history-list" id="allHistory">
                <p style="text-align: center; padding: 20px;">Загрузка...</p>
            </div>
        </div>
    `;
    
    document.getElementById('modalsContainer').appendChild(modal);
    
    // Загружаем историю
    if (auth.isOnline && window.supabaseClient) {
        try {
            const { data, error } = await supabaseClient
                .from('game_history')
                .select(`
                    *,
                    user:users(username)
                `)
                .order('created_at', { ascending: false })
                .limit(50);
            
            const historyList = document.getElementById('allHistory');
            if (!error && data) {
                historyList.innerHTML = data.map(game => `
                    <div class="history-item glass-effect">
                        <div class="history-game">
                            ${game.game_type === 'dice' ? '🎲 Кубик' : '🎰 Слоты'}
                            <small>(${game.user?.username || 'Неизвестно'})</small>
                        </div>
                        <div class="history-details">
                            <div>Ставка: ${game.bet_amount}</div>
                            <div>Выигрыш: ${game.win_amount}</div>
                            <div>${new Date(game.created_at).toLocaleString()}</div>
                        </div>
                    </div>
                `).join('');
            } else {
                historyList.innerHTML = '<p style="text-align: center; padding: 20px;">Ошибка загрузки истории</p>';
            }
        } catch (error) {
            console.error('Ошибка загрузки истории:', error);
            const historyList = document.getElementById('allHistory');
            historyList.innerHTML = '<p style="text-align: center; padding: 20px;">Ошибка загрузки истории</p>';
        }
    } else {
        const historyList = document.getElementById('allHistory');
        historyList.innerHTML = '<p style="text-align: center; padding: 20px;">История доступна только в онлайн-режиме</p>';
    }
}

// Добавляем эти функции в глобальную область видимости
window.openGameHistory = openGameHistory;
window.openGameHistoryAdmin = openGameHistoryAdmin;

// Обработка загрузки страницы
document.addEventListener('DOMContentLoaded', () => {
    console.log('📄 Страница загружена');
    
    // Проверяем доступность игр
    setTimeout(() => {
        console.log('Проверка игр:');
        console.log('- diceGame:', typeof diceGame !== 'undefined' ? '✓' : '✗');
        console.log('- slotsGame:', typeof slotsGame !== 'undefined' ? '✓' : '✗');
        console.log('- adminPanel:', typeof adminPanel !== 'undefined' ? '✓' : '✗');
        console.log('- auth:', typeof auth !== 'undefined' ? '✓' : '✗');
    }, 1000);
    
    // Обработчики для кнопок игр (на случай если onclick не работает)
    document.addEventListener('click', (e) => {
        if (e.target.classList.contains('play-btn')) {
            const gameCard = e.target.closest('.game-card');
            if (gameCard) {
                if (gameCard.id === 'diceGame' || gameCard.querySelector('.fa-dice-six')) {
                    openDiceGame();
                } else if (gameCard.id === 'slotsGame' || gameCard.querySelector('.fa-sliders-h')) {
                    openSlotsGame();
                }
            }
        }
    });
    
    // Обработчик для клавиши Enter в форме авторизации
    document.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            const username = document.getElementById('username');
            const password = document.getElementById('password');
            
            if (username && password && 
                (document.activeElement === username || document.activeElement === password)) {
                login();
            }
        }
    });
    
    // Решаем проблему с предупреждением о password field
    const passwordField = document.getElementById('password');
    if (passwordField) {
        passwordField.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                login();
            }
        });
    }
});