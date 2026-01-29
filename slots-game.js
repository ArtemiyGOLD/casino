class SlotsGame {
    constructor() {
        this.betAmount = 50;
        this.isSpinning = false;
        this.symbols = ['🍒', '🍋', '🍊', '🍉', '⭐', '7️⃣'];
        this.reels = [[], [], []];
        this.initReels();
    }

    initReels() {
        for (let i = 0; i < 3; i++) {
            this.reels[i] = [];
            for (let j = 0; j < 20; j++) {
                this.reels[i].push(this.symbols[Math.floor(Math.random() * this.symbols.length)]);
            }
        }
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
                    <h2><i class="fas fa-sliders-h"></i> Слот-машина</h2>
                    <button class="close-btn" onclick="closeModal()">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                
                <div class="game-info">
                    <p>Сделайте ставку и крутите барабаны. 3 одинаковых символа = победа!</p>
                </div>
                
                <div class="bet-controls">
                    <button class="bet-btn glass-effect" onclick="slotsGame.changeBet(-50)">-50</button>
                    <button class="bet-btn glass-effect" onclick="slotsGame.changeBet(-10)">-10</button>
                    <input type="number" id="slotsBetAmount" value="50" min="10" max="500" readonly>
                    <button class="bet-btn glass-effect" onclick="slotsGame.changeBet(10)">+10</button>
                    <button class="bet-btn glass-effect" onclick="slotsGame.changeBet(50)">+50</button>
                </div>
                
                <div class="slots-container">
                    <div class="slot glass-effect" id="slot1">
                        <div class="slot-reel" id="reel1">🍒</div>
                    </div>
                    <div class="slot glass-effect" id="slot2">
                        <div class="slot-reel" id="reel2">🍒</div>
                    </div>
                    <div class="slot glass-effect" id="slot3">
                        <div class="slot-reel" id="reel3">🍒</div>
                    </div>
                </div>
                
                <div class="result" id="slotsResult"></div>
                
                <button class="game-btn spin-btn" onclick="slotsGame.spin()" id="spinBtn">
                    <i class="fas fa-redo"></i> КРУТИТЬ
                </button>
            </div>
        `;

        document.getElementById('modalsContainer').appendChild(modal);
        this.updateBetDisplay();
        this.updateReelsDisplay();
    }

    changeBet(amount) {
        const newBet = this.betAmount + amount;
        
        if (newBet < 10) {
            showMessage('Минимальная ставка: 10', 'error');
            return;
        }
        
        if (newBet > 500) {
            showMessage('Максимальная ставка: 500', 'error');
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
        const betInput = document.getElementById('slotsBetAmount');
        if (betInput) {
            betInput.value = this.betAmount;
        }
    }

    updateReelsDisplay(symbols = ['🍒', '🍒', '🍒']) {
        for (let i = 0; i < 3; i++) {
            const reel = document.getElementById(`reel${i + 1}`);
            if (reel) {
                reel.innerHTML = '';
                const item = document.createElement('div');
                item.className = 'slot-item';
                item.textContent = symbols[i];
                reel.appendChild(item);
            }
        }
    }

    async spin() {
        if (this.isSpinning) return;
        
        if (this.betAmount > auth.currentUser.balance) {
            showMessage('Недостаточно средств', 'error');
            return;
        }

        const spinBtn = document.getElementById('spinBtn');
        const resultEl = document.getElementById('slotsResult');
        const reels = [
            document.getElementById('reel1'),
            document.getElementById('reel2'),
            document.getElementById('reel3')
        ];

        spinBtn.disabled = true;
        this.isSpinning = true;
        
        // Вычитаем ставку
        auth.updateUserBalance(auth.currentUser.id, auth.currentUser.balance - this.betAmount);
        
        // Анимация вращения
        resultEl.textContent = 'Вращение...';
        resultEl.style.color = '#f1c40f';
        
        for (let i = 0; i < 3; i++) {
            reels[i].classList.add('spinning');
        }
        
        // Вращаем барабаны
        const spinDuration = 2000;
        const startTime = Date.now();
        
        const spinReel = (reelIndex) => {
            const reel = reels[reelIndex];
            let position = 0;
            const interval = setInterval(() => {
                position -= 120;
                reel.style.transform = `translateY(${position}px)`;
            }, 100);
            
            setTimeout(() => {
                clearInterval(interval);
            }, spinDuration + reelIndex * 300);
        };
        
        for (let i = 0; i < 3; i++) {
            setTimeout(() => spinReel(i), i * 300);
        }
        
        // Ждем завершения вращения
        await new Promise(resolve => setTimeout(resolve, spinDuration + 900));
        
        // Останавливаем вращение
        for (let i = 0; i < 3; i++) {
            reels[i].classList.remove('spinning');
            reels[i].style.transform = 'translateY(0)';
        }
        
        // Генерируем результаты
        const results = [];
        for (let i = 0; i < 3; i++) {
            results.push(this.symbols[Math.floor(Math.random() * this.symbols.length)]);
        }
        
        this.updateReelsDisplay(results);
        
        // Проверяем выигрыш
        const allSame = results[0] === results[1] && results[1] === results[2];
        const jackpot = allSame && results[0] === '7️⃣';
        
        let winAmount = 0;
        let winMessage = '';
        
        if (jackpot) {
            winAmount = this.betAmount * 10;
            winMessage = `🎰 ДЖЕКПОТ! Выигрыш ${winAmount}!`;
            resultEl.style.color = '#f1c40f';
        } else if (allSame) {
            winAmount = this.betAmount * 3;
            winMessage = `🎉 Три ${results[0]}! Выигрыш ${winAmount}!`;
            resultEl.style.color = '#2ecc71';
        } else if (results[0] === results[1] || results[1] === results[2] || results[0] === results[2]) {
            winAmount = this.betAmount;
            winMessage = `👍 Две одинаковые! Возврат ${winAmount}`;
            resultEl.style.color = '#3498db';
        } else {
            winMessage = `😢 Вы проиграли ${this.betAmount}`;
            resultEl.style.color = '#e74c3c';
        }
        
        resultEl.textContent = winMessage;
        
        if (winAmount > 0) {
            auth.updateUserBalance(auth.currentUser.id, auth.currentUser.balance + winAmount);
            auth.updateUserStats(auth.currentUser.id, true);
        } else {
            auth.updateUserStats(auth.currentUser.id, false);
        }
        
        this.isSpinning = false;
        spinBtn.disabled = false;
        
        // Обновляем статистику
        auth.updateStats();
    }
}

const slotsGame = new SlotsGame();

function openSlotsGame() {
    slotsGame.openGame();
}