

class DiceGame {
    constructor() {
        this.betAmount = 100;
        this.isRolling = false;
    }
    

    openGame() {
        if (!auth.currentUser) {
            showMessage('Сначала войдите в аккаунт', 'error');
            return;
        }

        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h2><i class="fas fa-dice"></i> Бросок кубика</h2>
                    <button class="close-btn" onclick="closeModal()">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                
                <div class="game-info">
                    <p>Баланс: <strong>${auth.currentUser.balance}</strong></p>
                    <p>Сделайте ставку и бросьте кубик. Выигрыш 2x при выпадении 4, 5 или 6.</p>
                </div>
                
                <div class="bet-controls">
                    <button class="bet-btn glass-effect" onclick="diceGame.changeBet(-100)">-100</button>
                    <button class="bet-btn glass-effect" onclick="diceGame.changeBet(-10)">-10</button>
                    <input type="number" id="betAmount" value="100" min="10" max="1000" readonly>
                    <button class="bet-btn glass-effect" onclick="diceGame.changeBet(10)">+10</button>
                    <button class="bet-btn glass-effect" onclick="diceGame.changeBet(100)">+100</button>
                </div>
                
                <div class="dice-container">
                    <div class="dice glass-effect" id="dice">
                        ?
                    </div>
                </div>
                
                <div class="result" id="diceResult"></div>
                
                <button class="game-btn roll-btn" onclick="diceGame.roll()" id="rollBtn">
                    <i class="fas fa-dice"></i> БРОСИТЬ КУБИК
                </button>
            </div>
        `;

        document.getElementById('modalsContainer').appendChild(modal);
        this.updateBetDisplay();
    }

    changeBet(amount) {
        const newBet = this.betAmount + amount;
        
        if (newBet < 10) {
            showMessage('Минимальная ставка: 10', 'error');
            return;
        }
        
        if (newBet > 1000) {
            showMessage('Максимальная ставка: 1000', 'error');
            return;
        }
        
        if (newBet > auth.currentUser.balance) {
            showMessage('Недостаточно средств', 'error');
            return;
        }
        
        this.betAmount = newBet;
        this.updateBetDisplay();
    }

    updateBetDisplay() {
        const betInput = document.getElementById('betAmount');
        if (betInput) {
            betInput.value = this.betAmount;
        }
    }

    async roll() {
        if (this.isRolling) return;
        
        if (this.betAmount > auth.currentUser.balance) {
            showMessage('Недостаточно средств', 'error');
            return;
        }

        const rollBtn = document.getElementById('rollBtn');
        const dice = document.getElementById('dice');
        const resultEl = document.getElementById('diceResult');
        
        rollBtn.disabled = true;
        this.isRolling = true;
        
        // Анимация броска
        dice.textContent = '';
        dice.classList.add('rolling');
        resultEl.textContent = 'Бросок...';
        resultEl.style.color = '#f1c40f';
        
        // Вычитаем ставку
        await auth.updateUserBalance(auth.currentUser.id, auth.currentUser.balance - this.betAmount);
        
        // Имитация задержки
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        // Генерация результата
        const diceValue = Math.floor(Math.random() * 6) + 1;
        
        // Останавливаем анимацию
        dice.classList.remove('rolling');
        dice.textContent = diceValue;
        
        // Определяем результат
        const win = diceValue >= 4;
        const winAmount = win ? this.betAmount * 2 : 0;
        
        if (win) {
            resultEl.textContent = `🎉 Вы выиграли ${winAmount}! (Выпало: ${diceValue})`;
            resultEl.style.color = '#2ecc71';
            
            // Добавляем выигрыш
            await auth.updateUserBalance(auth.currentUser.id, auth.currentUser.balance + winAmount);
            await auth.updateUserStats(auth.currentUser.id, true);
            
            // Сохраняем в историю
            await auth.saveGameHistory(
                auth.currentUser.id,
                'dice',
                this.betAmount,
                winAmount,
                `Выигрыш ${winAmount} (кубик: ${diceValue})`
            );
        } else {
            resultEl.textContent = `😢 Вы проиграли ${this.betAmount} (Выпало: ${diceValue})`;
            resultEl.style.color = '#e74c3c';
            await auth.updateUserStats(auth.currentUser.id, false);
            
            await auth.saveGameHistory(
                auth.currentUser.id,
                'dice',
                this.betAmount,
                0,
                `Проигрыш ${this.betAmount} (кубик: ${diceValue})`
            );
        }
        
        this.isRolling = false;
        rollBtn.disabled = false;
        
        // Обновляем статистику
        auth.updateStats();
    }
}

const diceGame = new DiceGame();