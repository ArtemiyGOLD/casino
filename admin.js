class AdminPanel {
    constructor() {
        this.users = [];
    }

    async openPanel() {
        if (!auth.currentUser || !auth.currentUser.isAdmin) {
            showMessage("Требуются права администратора", "error");
            return;
        }

        this.users = await auth.getAllUsers();

        const modal = document.createElement("div");
        modal.className = "modal";
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h2><i class="fas fa-users-cog"></i> Управление пользователями</h2>
                    <button class="close-btn" onclick="closeModal()">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                
                <div class="admin-info">
                    <p>Изменяйте балансы пользователей. Все изменения сохраняются в Supabase.</p>
                    <div class="search-box">
                        <input type="text" id="searchUser" placeholder="Поиск пользователя..." 
                               class="glass-effect" onkeyup="adminPanel.searchUsers()">
                    </div>
                </div>
                
                <div class="users-list" id="usersList">
                    ${await this.generateUsersList()}
                </div>
                
                <div class="admin-stats">
                    <p><i class="fas fa-info-circle"></i> Всего пользователей: ${this.users.length}</p>
                    <p><i class="fas fa-database"></i> Режим: ${auth.isOnline ? "Supabase (онлайн)" : "LocalStorage (оффлайн)"}</p>
                </div>
            </div>
        `;

        document.getElementById("modalsContainer").appendChild(modal);
    }

    async generateUsersList() {
        if (this.users.length === 0) {
            return '<p style="text-align: center; padding: 20px;">Нет зарегистрированных пользователей</p>';
        }

        return this.users
            .map(
                (user) => `
            <div class="user-row glass-effect" data-id="${user.id}" data-username="${user.username}">
                <div class="user-info-admin">
                    <strong>${user.username}</strong>
                    ${user.email ? `<small>${user.email}</small>` : ""}
                    <div class="user-stats">
                        <span>Баланс: ${user.balance}</span>
                        <span>Игр: ${user.total_games || user.stats?.totalGames || 0}</span>
                        <span>Побед: ${user.games_won || user.stats?.gamesWon || 0}</span>
                    </div>
                </div>
                <div class="balance-controls">
                    <input type="number" class="balance-input glass-effect" 
                           value="${user.balance}" 
                           min="0" 
                           max="1000000"
                           id="balance-${user.id}">
                    <button class="save-btn glass-effect" onclick="adminPanel.saveUserBalance('${user.id}')">
                        <i class="fas fa-save"></i> Сохранить
                    </button>
                </div>
            </div>
        `,
            )
            .join("");
    }

    async saveUserBalance(userId) {
        const input = document.getElementById(`balance-${userId}`);
        const newBalance = parseInt(input.value);

        if (isNaN(newBalance) || newBalance < 0 || newBalance > 1000000) {
            showMessage("Введите корректную сумму (0-1,000,000)", "error");
            return;
        }

        const success = await auth.updateUserBalance(userId, newBalance);

        if (success) {
            showMessage("Баланс обновлен", "success");
            // Обновляем отображение
            const userRow = document.querySelector(`[data-id="${userId}"]`);
            if (userRow) {
                const userInfo = userRow.querySelector(
                    ".user-info-admin .user-stats",
                );
                if (userInfo) {
                    const balanceSpan = userInfo.querySelector("span");
                    if (balanceSpan) {
                        balanceSpan.textContent = `Баланс: ${newBalance}`;
                    }
                }
            }
        } else {
            showMessage("Ошибка обновления баланса", "error");
        }
    }

    searchUsers() {
        const searchTerm = document
            .getElementById("searchUser")
            .value.toLowerCase();
        const userRows = document.querySelectorAll(".user-row");

        userRows.forEach((row) => {
            const username = row.dataset.username.toLowerCase();
            if (username.includes(searchTerm)) {
                row.style.display = "flex";
            } else {
                row.style.display = "none";
            }
        });
    }
}

const adminPanel = new AdminPanel();
