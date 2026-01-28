// app.js - Основная логика приложения
console.log('🎮 Загрузка казино...');

// Глобальные переменные
window.currentScreen = 'login';

// Инициализация приложения
async function initApp() {
    console.log('🚀 Инициализация приложения...');
    
    // Проверяем авторизован ли пользователь
    const user = await window.supabaseAuth.getCurrentUser();
    if (user) {
        onUserLoaded(user);
        showScreen('main');
    } else {
        showScreen('login');
    }
}

// Функция вызывается когда пользователь загружен
window.onUserLoaded = function(user) {
    console.log('👤 Пользователь загружен:', user);
    updateUserUI(user);
    
    // Показываем кнопку админа если нужно
    const adminBtn = document.getElementById('adminBtn');
    if (adminBtn && user.role === 'admin') {
        adminBtn.style.display = 'flex';
    }
    
    // Обновляем баланс
    if (window.updateBalance) {
        window.updateBalance();
    }
};

// Переключение между вкладками входа/регистрации
window.switchTab = function(tab) {
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    
    document.querySelectorAll('.form-container').forEach(form => {
        form.style.display = 'none';
    });
    
    event.target.classList.add('active');
    
    if (tab === 'login') {
        document.getElementById('loginForm').style.display = 'block';
    } else {
        document.getElementById('registerForm').style.display = 'block';
    }
};

// Вход в систему
window.login = async function() {
    const username = document.getElementById('loginUsername').value.trim();
    const password = document.getElementById('loginPassword').value.trim();
    
    if (!username || !password) {
        showNotification('Заполните все поля', 'error');
        return;
    }
    
    try {
        const user = await window.supabaseAuth.loginUser(username, password);
        if (user) {
            showNotification(`Добро пожаловать, ${user.name}! 🎮`, 'success');
            onUserLoaded(user);
            showScreen('main');
        }
    } catch (error) {
        showNotification(error.message, 'error');
    }
};

// Регистрация
window.register = async function() {
    const username = document.getElementById('registerUsername').value.trim();
    const password = document.getElementById('registerPassword').value.trim();
    const passwordConfirm = document.getElementById('registerPasswordConfirm').value.trim();
    const name = document.getElementById('registerName').value.trim() || username;
    
    if (!username || !password || !passwordConfirm) {
        showNotification('Заполните все поля', 'error');
        return;
    }
    
    if (password.length < 6) {
        showNotification('Пароль должен быть не менее 6 символов', 'error');
        return;
    }
    
    if (password !== passwordConfirm) {
        showNotification('Пароли не совпадают', 'error');
        return;
    }
    
    try {
        const user = await window.supabaseAuth.register(username, password, name);
        showNotification(`Регистрация успешна! Добро пожаловать, ${user.name}! 🎉`, 'success');
        
        // Автоматически входим
        const loggedInUser = await window.supabaseAuth.login(username, password);
        onUserLoaded(loggedInUser);
        showScreen('main');
        
    } catch (error) {
        showNotification(error.message, 'error');
    }
};

// Выход
window.logout = function() {
    window.supabaseAuth.logout();
    showNotification('Вы вышли из системы', 'info');
    showScreen('login');
    
    // Сбрасываем формы
    document.getElementById('loginUsername').value = '';
    document.getElementById('loginPassword').value = '';
    document.getElementById('registerUsername').value = '';
    document.getElementById('registerPassword').value = '';
    document.getElementById('registerPasswordConfirm').value = '';
    document.getElementById('registerName').value = '';
};

// Обновление UI пользователя
function updateUserUI(user) {
    if (!user) return;
    
    document.getElementById('userName').textContent = user.name || user.username;
    document.getElementById('userId').textContent = `ID: ${user.id?.substring(0, 8)}...`;
    document.getElementById('userAvatar').textContent = (user.name || user.username).charAt(0).toUpperCase();
    document.getElementById('balanceAmount').textContent = user.balance || 0;
}

// Перевод средств
window.makeTransfer = async function() {
    const friendUsername = document.getElementById('friendUsername').value.trim();
    const amount = parseInt(document.getElementById('transferAmount').value || '0');
    
    if (!friendUsername || !amount || amount <= 0) {
        showNotification('Заполните все поля корректно', 'error');
        return;
    }
    
    const currentUser = window.supabaseAuth.currentUser();
    if (!currentUser) {
        showNotification('Вы не авторизованы', 'error');
        return;
    }
    
    try {
        const result = await window.supabaseAuth.transfer(
            currentUser.id,
            friendUsername,
            amount,
            'Перевод другу'
        );
        
        if (result.success) {
            showNotification(`✅ Успешно переведено ${amount} монет пользователю ${result.toUser}`, 'success');
            updateUserUI(currentUser);
            showScreen('main');
        }
    } catch (error) {
        showNotification(error.message, 'error');
    }
};

// Тестовое пополнение (для разработки)
window.addTestCoins = async function() {
    const currentUser = window.supabaseAuth.currentUser();
    if (!currentUser) return;
    
    try {
        await window.supabaseAuth.updateBalance(currentUser.id, 1000);
        showNotification('✅ Добавлено 1000 тестовых монет', 'success');
        updateUserUI(window.supabaseAuth.currentUser());
    } catch (error) {
        showNotification(error.message, 'error');
    }
};

// ==================== АДМИН ФУНКЦИИ ====================

// Загрузка всех пользователей
window.loadAllUsers = async function() {
    try {
        const users = await window.supabaseAuth.getAllUsers();
        const userList = document.getElementById('userList');
        
        if (!users || users.length === 0) {
            userList.innerHTML = '<div class="empty">Пользователи не найдены</div>';
            return;
        }
        
        let html = '<div class="users-header">';
        html += '<div class="user-row header">';
        html += '<div>ID</div><div>Логин</div><div>Имя</div><div>Баланс</div><div>Роль</div><div>Действия</div>';
        html += '</div>';
        
        users.forEach(user => {
            html += `
                <div class="user-row" data-user-id="${user.id}">
                    <div class="user-id-short">${user.id.substring(0, 8)}...</div>
                    <div>${user.username}</div>
                    <div>${user.name || '-'}</div>
                    <div>${user.balance} 🪙</div>
                    <div><span class="role-badge ${user.role}">${user.role === 'admin' ? '👑 Админ' : '👤 Игрок'}</span></div>
                    <div>
                        <button class="btn-small" onclick="editUser('${user.id}')">✏️</button>
                        <button class="btn-small btn-danger" onclick="confirmDeleteUser('${user.id}')">🗑️</button>
                    </div>
                </div>
            `;
        });
        
        html += '</div>';
        userList.innerHTML = html;
        
    } catch (error) {
        showNotification('Ошибка загрузки пользователей: ' + error.message, 'error');
    }
};

// Редактирование пользователя
window.editUser = async function(userId) {
    try {
        const users = await window.supabaseAuth.getAllUsers();
        const user = users.find(u => u.id === userId);
        
        if (!user) {
            showNotification('Пользователь не найден', 'error');
            return;
        }
        
        // Заполняем форму
        document.getElementById('editUserId').value = user.id;
        document.getElementById('editUsername').value = user.username;
        document.getElementById('editName').value = user.name || '';
        document.getElementById('editBalance').value = user.balance;
        document.getElementById('editRole').value = user.role;
        
        // Показываем форму
        document.getElementById('userEditForm').style.display = 'block';
        
    } catch (error) {
        showNotification(error.message, 'error');
    }
};

// Сохранение изменений пользователя
window.saveUserChanges = async function() {
    const userId = document.getElementById('editUserId').value;
    const username = document.getElementById('editUsername').value.trim();
    const name = document.getElementById('editName').value.trim();
    const balance = parseInt(document.getElementById('editBalance').value);
    const role = document.getElementById('editRole').value;
    
    if (!username) {
        showNotification('Логин не может быть пустым', 'error');
        return;
    }
    
    try {
        await window.supabaseAuth.updateUser(userId, {
            username,
            name,
            balance,
            role
        });
        
        showNotification('✅ Изменения сохранены', 'success');
        cancelEdit();
        loadAllUsers();
        
    } catch (error) {
        showNotification(error.message, 'error');
    }
};

// Подтверждение удаления пользователя
window.confirmDeleteUser = function(userId) {
    if (confirm('Вы уверены что хотите удалить этого пользователя? Все его данные будут удалены.')) {
        deleteUser(userId);
    }
};

// Удаление пользователя
window.deleteUser = async function() {
    const userId = document.getElementById('editUserId').value;
    
    try {
        await window.supabaseAuth.deleteUser(userId);
        showNotification('✅ Пользователь удален', 'success');
        cancelEdit();
        loadAllUsers();
        
    } catch (error) {
        showNotification(error.message, 'error');
    }
};

// Отмена редактирования
window.cancelEdit = function() {
    document.getElementById('userEditForm').style.display = 'none';
};

// Быстрое пополнение (админ)
window.adminAddCoins = async function() {
    const userId = document.getElementById('quickUserId').value.trim();
    const amount = parseInt(document.getElementById('quickAmount').value);
    
    if (!userId || !amount || amount <= 0) {
        showNotification('Заполните все поля корректно', 'error');
        return;
    }
    
    try {
        const result = await window.supabaseAuth.addCoins(userId, amount);
        showNotification(`✅ Добавлено ${amount} монет пользователю ${result.username}`, 'success');
        document.getElementById('quickUserId').value = '';
        document.getElementById('quickAmount').value = '1000';
        
        // Обновляем список пользователей если он открыт
        if (window.loadAllUsers) {
            loadAllUsers();
        }
        
    } catch (error) {
        showNotification(error.message, 'error');
    }
};

// Загрузка статистики
window.loadAdminData = async function() {
    try {
        const stats = await window.supabaseAuth.getStats();
        
        document.getElementById('totalUsers').textContent = stats.totalUsers;
        document.getElementById('totalBalance').textContent = stats.totalBalance;
        document.getElementById('totalGames').textContent = stats.totalGames;
        document.getElementById('totalAdmins').textContent = stats.totalAdmins;
        
        showNotification('📊 Статистика обновлена', 'success');
        
    } catch (error) {
        showNotification('Ошибка загрузки статистики: ' + error.message, 'error');
    }
};

// ==================== ОБЩИЕ ФУНКЦИИ ====================

// Переключение экранов
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
        
        // Загружаем данные для экрана
        if (screenName === 'admin') {
            loadAllUsers();
            loadAdminData();
        } else if (screenName === 'history') {
            // Загружаем историю игр
            loadGameHistory();
        }
    }
};

// Уведомления
window.showNotification = function(message, type = 'info') {
    // Создаем элемент уведомления
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
    
    // Анимация появления
    setTimeout(() => notification.classList.add('show'), 10);
    
    // Автоудаление через 3 секунды
    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 300);
    }, 3000);
};

// Обновление баланса (для использования в играх)
window.updateBalance = function() {
    const currentUser = window.supabaseAuth.currentUser();
    if (currentUser && currentUser.balance !== undefined) {
        document.getElementById('balanceAmount').textContent = currentUser.balance;
    }
};

// Загрузка истории игр
async function loadGameHistory() {
    try {
        const currentUser = window.supabaseAuth.currentUser();
        if (!currentUser) return;
        
        const games = await window.supabaseAuth.getGameHistory(currentUser.id, 10);
        const historyList = document.getElementById('historyList');
        
        if (!historyList) return;
        
        if (!games || games.length === 0) {
            historyList.innerHTML = '<div class="empty">История игр пуста</div>';
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
                        ${profit >= 0 ? '+' : ''}${profit} 🪙
                    </div>
                </div>
            `;
        });
        
        historyList.innerHTML = html;
        
    } catch (error) {
        console.error('Ошибка загрузки истории:', error);
    }
}

// Инициализация при загрузке
document.addEventListener('DOMContentLoaded', () => {
    console.log('📄 DOM загружен, запускаем приложение...');
    initApp();
});