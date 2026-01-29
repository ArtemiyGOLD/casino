// app-logic.js - Логика игр
class CasinoGames {
    constructor() {
        this.currentBet = 100;
        this.isPlaying = false;
        this.initGames();
    }

    initGames() {
        // Игра в кости
        document.getElementById('rollDice')?.addEventListener('click', () => this.playDice());
        document.getElementById('increaseDiceBet')?.addEventListener('click', () => this.changeBet(50));
        document.getElementById('decreaseDiceBet')?.addEventListener('click', () => this.changeBet(-50));
        
        // Игра в слоты
        document.getElementById('spinSlots')?.addEventListener('click', () => this.playSlots());
        document.getElementById('increaseSlotsBet')?.addEventListener('click', () => this.changeBet(50));
        document.getElementById('decreaseSlotsBet')?.addEventListener('click', () => this.changeBet(-50));
        
        // Кнопки интерфейса
        document.getElementById('addCoinsBtn')?.addEventListener('click', () => this.addTestCoins());
        document.getElementById('transferBtn')?.addEventListener('click', () => telegramCasino.showScreen('transfer'));
        document.getElementById('historyBtn')?.addEventListener('click', () => this.showHistory());
        document.getElementById('gamesBtn')?.addEventListener('click', () => telegramCasino.showScreen('games'));
        document.getElementById('adminBtn')?.addEventListener('click', () => telegramCasino.showScreen('admin'));
        
        this.updateBetDisplay();
    }

    // Игра в кости
    async playDice() {
        if (this.isPlaying || !telegramCasino.user) return;
        
        if (telegramCasino.balance < this.currentBet) {
            telegramCasino.showNotification('Недостаточно средств!', 'error');
            return;
        }
        
        this.isPlaying = true;
        const btn = document.getElementById('rollDice');
        if (btn) btn.disabled = true;
        
        // Анимация броска
        const dice = document.getElementById('dice');
        if (dice) {
            dice.style.animation = 'rollDice 2s ease-in-out';
        }
        
        // Результат
        setTimeout(async () => {
            const dice1 = Math.floor(Math.random() * 6) + 1;
            const dice2 = Math.floor(Math.random() * 6) + 1;
            const sum = dice1 + dice2;
            
            // Определяем выигрыш
            let multiplier = 0;
            if (sum === 7) multiplier = 2;
            else if (sum === 11) multiplier = 1.5;
            else if (sum === 2 || sum === 12) multiplier = 3;
            
            const winAmount = Math.floor(this.currentBet * multiplier);
            
            // Показываем результат
            const resultEl = document.getElementById('diceResult');
            if (resultEl) {
                resultEl.innerHTML = `
                    <div style="font-size: 18px; margin-top: 10px;">
                        🎲 ${dice1} + ${dice2} = <strong>${sum}</strong>
                        ${winAmount > 0 ? `<br>🎉 Выигрыш: ${winAmount} монет!` : ''}
                    </div>
                `;
            }
            
            // Сохраняем игру
            const saved = await telegramCasino.saveGame({
                type: 'dice',
                bet: this.currentBet,
                win: winAmount,
                result: { dice1, dice2, sum, multiplier }
            });
            
            if (saved) {
                if (winAmount > 0) {
                    telegramCasino.showNotification(`🎲 Выиграно ${winAmount} монет!`, 'success');
                } else {
                    telegramCasino.showNotification(`🎲 Проигрыш ${this.currentBet} монет`, 'info');
                }
            }
            
            // Сбрасываем анимацию
            if (dice) {
                dice.style.animation = '';
            }
            
            this.isPlaying = false;
            if (btn) btn.disabled = false;
            
        }, 2000);
    }

    // Игра в слоты (упрощенная версия)
    async playSlots() {
        if (this.isPlaying || !telegramCasino.user) return;
        
        if (telegramCasino.balance < this.currentBet) {
            telegramCasino.showNotification('Недостаточно средств!', 'error');
            return;
        }
        
        this.isPlaying = true;
        const btn = document.getElementById('spinSlots');
        if (btn) btn.disabled = true;
        
        // Анимация слотов
        const reels = ['reel1', 'reel2', 'reel3'].map(id => document.getElementById(id));
        
        reels.forEach((reel, i) => {
            if (reel) {
                const items = reel.querySelector('.slot-items');
                if (items) {
                    items.style.transition = 'transform 2s cubic-bezier(0.1, 0.7, 0.1, 1)';
                    items.style.transform = `translateY(${-(Math.random() * 500)}px)`;
                }
            }
        });
        
        // Результат
        setTimeout(async () => {
            const symbols = ['🍒', '🍋', '🍊', '🍇', '🔔', '⭐', '7️⃣', '💎'];
            const results = Array.from({length: 3}, () => symbols[Math.floor(Math.random() * symbols.length)]);
            
            // Определяем выигрыш
            let multiplier = 0;
            if (results[0] === results[1] && results[1] === results[2]) {
                if (results[0] === '💎') multiplier = 10;
                else if (results[0] === '7️⃣') multiplier = 5;
                else multiplier = 2;
            }
            
            const winAmount = Math.floor(this.currentBet * multiplier);
            
            // Показываем результат
            const resultEl = document.getElementById('slotsResult');
            if (resultEl) {
                resultEl.innerHTML = `
                    <div style="font-size: 24px; margin: 10px 0;">
                        ${results.join(' ')}
                    </div>
                    ${winAmount > 0 ? 
                        `<div style="color: #34c759; font-weight: bold;">
                            🎰 Выигрыш: ${winAmount} монет!
                        </div>` : 
                        '<div style="color: #8e8e93;">Попробуйте еще раз!</div>'
                    }
                `;
            }
            
            // Сохраняем игру
            const saved = await telegramCasino.saveGame({
                type: 'slots',
                bet: this.currentBet,
                win: winAmount,
                result: { symbols: results, multiplier }
            });
            
            if (saved && winAmount > 0) {
                telegramCasino.showNotification(`🎰 Выиграно ${winAmount} монет!`, 'success');
            }
            
            this.isPlaying = false;
            if (btn) btn.disabled = false;
            
        }, 2000);
    }

    changeBet(amount) {
        const newBet = this.currentBet + amount;
        if (newBet >= 50 && newBet <= 5000) {
            this.currentBet = newBet;
            this.updateBetDisplay();
        }
    }

    updateBetDisplay() {
        document.getElementById('diceBet')?.textContent = this.currentBet;
        document.getElementById('slotsBet')?.textContent = this.currentBet;
    }

    async addTestCoins() {
        const added = await telegramCasino.updateBalance(1000);
        if (added !== null) {
            telegramCasino.showNotification('+1000 тестовых монет 🪙', 'success');
        }
    }

    async showHistory() {
        telegramCasino.showScreen('history');
        const games = await telegramCasino.getGameHistory();
        const list = document.getElementById('historyList');
        
        if (!list) return;
        
        if (!games.length) {
            list.innerHTML = '<div class="empty">История игр пуста</div>';
            return;
        }
        
        let html = '';
        games.forEach(game => {
            const profit = game.win_amount - game.bet_amount;
            const date = new Date(game.created_at).toLocaleDateString('ru-RU');
            
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
        
        list.innerHTML = html;
    }
}

// Инициализация игр
document.addEventListener('DOMContentLoaded', () => {
    window.casinoGames = new CasinoGames();
});