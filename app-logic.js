// app-logic.js - Логика игр (исправленная версия)
class CasinoGames {
    constructor() {
        console.log('🎮 Инициализация игр...');
        this.currentBet = 100;
        this.isPlaying = false;
        this.initGames();
    }

    initGames() {
        console.log('🔄 Настройка кнопок...');
        
        // Игра в кости
        this.setupDiceGame();
        
        // Игра в слоты
        this.setupSlotsGame();
        
        // Основные кнопки
        this.setupMainButtons();
        
        this.updateBetDisplay();
        console.log('✅ Все кнопки настроены');
    }

    setupDiceGame() {
        const rollDiceBtn = document.getElementById('rollDice');
        const increaseDiceBtn = document.getElementById('increaseDiceBet');
        const decreaseDiceBtn = document.getElementById('decreaseDiceBet');
        
        if (rollDiceBtn) {
            rollDiceBtn.addEventListener('click', () => this.playDice());
            console.log('✅ Кнопка "Бросить кости" настроена');
        }
        
        if (increaseDiceBtn) {
            increaseDiceBtn.addEventListener('click', () => this.changeBet(50));
            console.log('✅ Кнопка "+" для костей настроена');
        }
        
        if (decreaseDiceBtn) {
            decreaseDiceBtn.addEventListener('click', () => this.changeBet(-50));
            console.log('✅ Кнопка "-" для костей настроена');
        }
    }

    setupSlotsGame() {
        const spinSlotsBtn = document.getElementById('spinSlots');
        const increaseSlotsBtn = document.getElementById('increaseSlotsBet');
        const decreaseSlotsBtn = document.getElementById('decreaseSlotsBet');
        
        if (spinSlotsBtn) {
            spinSlotsBtn.addEventListener('click', () => this.playSlots());
            console.log('✅ Кнопка "Крутить" для слотов настроена');
        }
        
        if (increaseSlotsBtn) {
            increaseSlotsBtn.addEventListener('click', () => this.changeBet(50));
            console.log('✅ Кнопка "+" для слотов настроена');
        }
        
        if (decreaseSlotsBtn) {
            decreaseSlotsBtn.addEventListener('click', () => this.changeBet(-50));
            console.log('✅ Кнопка "-" для слотов настроена');
        }
    }

    setupMainButtons() {
        const buttons = {
            'addCoinsBtn': () => this.addTestCoins(),
            'transferBtn': () => telegramCasino.showScreen('transfer'),
            'historyBtn': () => this.showHistory(),
            'gamesBtn': () => telegramCasino.showScreen('games'),
            'adminBtn': () => telegramCasino.showScreen('admin')
        };
        
        Object.entries(buttons).forEach(([id, handler]) => {
            const btn = document.getElementById(id);
            if (btn) {
                btn.addEventListener('click', handler);
                console.log(`✅ Кнопка ${id} настроена`);
            } else {
                console.warn(`⚠️ Кнопка ${id} не найдена`);
            }
        });
    }

    // Игра в кости
    async playDice() {
        console.log('🎲 Запуск игры в кости');
        
        if (this.isPlaying) {
            console.log('⚠️ Игра уже идет');
            return;
        }
        
        if (!telegramCasino.user) {
            telegramCasino.showNotification('Сначала авторизуйтесь!', 'error');
            return;
        }
        
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

    // Игра в слоты
    async playSlots() {
        console.log('🎰 Запуск игры в слоты');
        
        if (this.isPlaying) {
            console.log('⚠️ Игра уже идет');
            return;
        }
        
        if (!telegramCasino.user) {
            telegramCasino.showNotification('Сначала авторизуйтесь!', 'error');
            return;
        }
        
        if (telegramCasino.balance < this.currentBet) {
            telegramCasino.showNotification('Недостаточно средств!', 'error');
            return;
        }
        
        this.isPlaying = true;
        const btn = document.getElementById('spinSlots');
        if (btn) btn.disabled = true;
        
        // Анимация слотов
        const reelIds = ['reel1', 'reel2', 'reel3'];
        reelIds.forEach((id, index) => {
            const reel = document.getElementById(id);
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
            console.log(`💰 Ставка изменена: ${this.currentBet}`);
        }
    }

    updateBetDisplay() {
        const diceBet = document.getElementById('diceBet');
        const slotsBet = document.getElementById('slotsBet');
        
        if (diceBet) diceBet.textContent = this.currentBet;
        if (slotsBet) slotsBet.textContent = this.currentBet;
    }

    async addTestCoins() {
        console.log('🪙 Добавление тестовых монет');
        const added = await telegramCasino.updateBalance(1000);
        if (added !== null) {
            telegramCasino.showNotification('+1000 тестовых монет 🪙', 'success');
        }
    }

    async showHistory() {
        console.log('📊 Показ истории игр');
        telegramCasino.showScreen('history');
        const games = await telegramCasino.getGameHistory();
        const list = document.getElementById('historyList');
        
        if (!list) {
            console.error('❌ Элемент historyList не найден');
            return;
        }
        
        if (!games || !games.length) {
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
        console.log(`✅ Показано ${games.length} игр в истории`);
    }
}

// Инициализация игр
document.addEventListener('DOMContentLoaded', () => {
    console.log('📄 DOM загружен, инициализация игр...');
    window.casinoGames = new CasinoGames();
    console.log('✅ CasinoGames создан и готов');
});