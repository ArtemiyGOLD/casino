// Конфигурация игр
const GAMES_CONFIG = {
    dice: {
        minBet: 10,
        maxBet: 1000,
        betStep: 10,
        winMultipliers: {
            7: 2.0, // Сумма 7
            11: 1.5, // Сумма 11
            2: 3.0, // Змеиные глаза
            12: 3.0, // Двойная шестерка
        },
    },
    slots: {
        minBet: 20,
        maxBet: 500,
        betStep: 20,
        symbols: ["🍒", "🍋", "🍊", "🍇", "🔔", "⭐", "7️⃣", "💎"],
        paytable: {
            "💎💎💎": 10,
            "7️⃣7️⃣7️⃣": 5,
            "⭐⭐⭐": 3,
            "🔔🔔🔔": 2,
            "🍇🍇🍇": 1.5,
            "🍊🍊🍊": 1.2,
            "🍋🍋🍋": 1.1,
            "🍒🍒🍒": 1,
        },
    },
};

// Текущее состояние игры
let currentGame = {
    type: null,
    bet: 100,
    isPlaying: false,
};

// Игра в кубики
class DiceGame {
    constructor() {
        this.diceElement = document.getElementById("dice");
        this.diceResult = document.getElementById("diceResult");
        this.rollButton = document.getElementById("rollDice");
        this.betDisplay = document.getElementById("diceBet");
        this.betIncrease = document.getElementById("increaseDiceBet");
        this.betDecrease = document.getElementById("decreaseDiceBet");

        this.init();
    }

    init() {
        // Проверяем существование элементов
        if (!this.betIncrease || !this.betDecrease || !this.rollButton) {
            console.warn("Элементы игры в кости не найдены");
            return;
        }

        this.betIncrease.addEventListener("click", () => this.changeBet(1));
        this.betDecrease.addEventListener("click", () => this.changeBet(-1));
        this.rollButton.addEventListener("click", () => this.roll());

        this.updateBetDisplay();
    }

    changeBet(direction) {
        const config = GAMES_CONFIG.dice;
        let newBet = currentGame.bet + direction * config.betStep;

        newBet = Math.max(config.minBet, Math.min(config.maxBet, newBet));

        // Проверяем баланс
        const user = window.supabaseClient.getCurrentUser();
        if (user && newBet > user.balance) {
            showNotification("Недостаточно средств!", "error");
            return;
        }

        currentGame.bet = newBet;
        this.updateBetDisplay();
    }

    updateBetDisplay() {
        this.betDisplay.textContent = currentGame.bet;
    }

    async roll() {
        if (currentGame.isPlaying) return;

        const user = window.supabaseClient.getCurrentUser();
        if (!user || user.balance < currentGame.bet) {
            showNotification("Недостаточно средств!", "error");
            return;
        }

        currentGame.isPlaying = true;
        this.rollButton.disabled = true;

        // Анимация броска
        this.diceElement.style.animation = "rollDice 2s ease-in-out";

        // Генерируем случайные числа для двух кубиков
        const dice1 = Math.floor(Math.random() * 6) + 1;
        const dice2 = Math.floor(Math.random() * 6) + 1;
        const sum = dice1 + dice2;

        // Определяем выигрыш
        let multiplier = 0;
        if (sum === 7) multiplier = GAMES_CONFIG.dice.winMultipliers[7];
        else if (sum === 11) multiplier = GAMES_CONFIG.dice.winMultipliers[11];
        else if (sum === 2) multiplier = GAMES_CONFIG.dice.winMultipliers[2];
        else if (sum === 12) multiplier = GAMES_CONFIG.dice.winMultipliers[12];

        const winAmount = Math.floor(currentGame.bet * multiplier);

        // Ждем окончания анимации
        setTimeout(async () => {
            this.diceElement.style.animation = "";

            // Показываем результат
            this.showDiceResult(dice1, dice2, sum);

            // Сохраняем результат в базу
            try {
                await window.supabaseClient.saveGameResult({
                    type: "dice",
                    bet: currentGame.bet,
                    win: winAmount,
                    result: { dice1, dice2, sum, multiplier },
                });

                // Обновляем баланс на экране
                if (window.updateBalance) {
                    window.updateBalance();
                }

                // Показываем результат
                if (winAmount > 0) {
                    showNotification(
                        `🎉 Вы выиграли ${winAmount} монет!`,
                        "success",
                    );
                } else {
                    showNotification(
                        `😔 Вы проиграли ${currentGame.bet} монет`,
                        "info",
                    );
                }
            } catch (error) {
                console.error("Ошибка сохранения игры:", error);
                showNotification("Ошибка сохранения результата", "error");
            }

            currentGame.isPlaying = false;
            this.rollButton.disabled = false;
        }, 2000);
    }

    showDiceResult(dice1, dice2, sum) {
        const diceFaces = this.diceElement.querySelectorAll(".dice-face");

        // Устанавливаем значения на гранях кубика
        diceFaces[0].textContent = dice1; // Передняя грань
        diceFaces[1].textContent = dice2; // Задняя грань

        // Поворачиваем кубик чтобы показать результат
        const rotations = {
            1: { x: 0, y: 0 },
            2: { x: 180, y: 0 },
            3: { x: -90, y: 0 },
            4: { x: 90, y: 0 },
            5: { x: 0, y: -90 },
            6: { x: 0, y: 90 },
        };

        this.diceElement.style.transform = `rotateX(${rotations[dice1].x}deg) rotateY(${rotations[dice1].y}deg)`;

        this.diceResult.innerHTML = `
            <div style="font-size: 18px; margin-top: 10px;">
                🎲 ${dice1} + ${dice2} = <strong>${sum}</strong>
            </div>
        `;
    }
}

// Игра в слоты
class SlotsGame {
    constructor() {
        this.reels = [
            document.getElementById("reel1"),
            document.getElementById("reel2"),
            document.getElementById("reel3"),
        ];
        this.spinButton = document.getElementById("spinSlots");
        this.slotsResult = document.getElementById("slotsResult");
        this.betDisplay = document.getElementById("slotsBet");
        this.betIncrease = document.getElementById("increaseSlotsBet");
        this.betDecrease = document.getElementById("decreaseSlotsBet");

        this.symbols = GAMES_CONFIG.slots.symbols;
        this.init();
    }

    init() {
        this.betIncrease.addEventListener("click", () => this.changeBet(1));
        this.betDecrease.addEventListener("click", () => this.changeBet(-1));
        this.spinButton.addEventListener("click", () => this.spin());

        this.initializeReels();
        this.updateBetDisplay();
    }

    initializeReels() {
        this.reels.forEach((reel, index) => {
            reel.innerHTML = "";
            const items = document.createElement("div");
            items.className = "slot-items";
            items.id = `slotItems${index + 1}`;

            // Создаем 20 символов для бесконечной прокрутки
            for (let i = 0; i < 20; i++) {
                const symbol =
                    this.symbols[
                        Math.floor(Math.random() * this.symbols.length)
                    ];
                const item = document.createElement("div");
                item.className = "slot-item";
                item.textContent = symbol;
                items.appendChild(item);
            }

            reel.appendChild(items);
        });
    }

    changeBet(direction) {
        const config = GAMES_CONFIG.slots;
        let newBet = currentGame.bet + direction * config.betStep;

        newBet = Math.max(config.minBet, Math.min(config.maxBet, newBet));

        const user = window.supabaseClient.getCurrentUser();
        if (user && newBet > user.balance) {
            showNotification("Недостаточно средств!", "error");
            return;
        }

        currentGame.bet = newBet;
        this.updateBetDisplay();
    }

    updateBetDisplay() {
        this.betDisplay.textContent = currentGame.bet;
    }

    async spin() {
        if (currentGame.isPlaying) return;

        const user = window.supabaseClient.getCurrentUser();
        if (!user || user.balance < currentGame.bet) {
            showNotification("Недостаточно средств!", "error");
            return;
        }

        currentGame.isPlaying = true;
        this.spinButton.disabled = true;
        this.slotsResult.innerHTML = "";

        // Анимация прокрутки слотов
        const spinDuration = 2000;
        const results = [];

        this.reels.forEach((reel, index) => {
            const items = reel.querySelector(".slot-items");

            // Случайная позиция для остановки
            const randomPosition = Math.floor(
                Math.random() * this.symbols.length,
            );
            const targetPosition = -(randomPosition * 100); // 100px высота символа

            // Анимация прокрутки
            items.style.transition = `transform ${spinDuration}ms cubic-bezier(0.1, 0.7, 0.1, 1)`;
            items.style.transform = `translateY(${targetPosition}px)`;

            // Сохраняем результат
            setTimeout(
                () => {
                    const resultSymbol = this.symbols[randomPosition];
                    results.push(resultSymbol);

                    // После остановки всех барабанов
                    if (results.length === 3) {
                        this.showResult(results);
                    }
                },
                spinDuration + index * 300,
            );
        });

        // Ждем окончания анимации и обрабатываем результат
        setTimeout(async () => {
            const winAmount = this.calculateWin(results);

            // Сохраняем результат в базу
            try {
                if (window.supabaseAuth && window.supabaseAuth.saveGameResult) {
                    await window.supabaseAuth.saveGameResult({
                        type: "dice",
                        bet: currentGame.bet,
                        win: winAmount,
                        result: { dice1, dice2, sum, multiplier },
                    });
                } else {
                    console.warn(
                        "Supabase auth не доступен, результат не сохранен",
                    );
                }

                // И обновление баланса:
                if (window.updateBalance) {
                    window.updateBalance();
                }

                // Обновляем баланс
                if (window.updateBalance) {
                    window.updateBalance();
                }

                // Показываем уведомление
                if (winAmount > 0) {
                    showNotification(
                        `🎰 Выигрыш: ${winAmount} монет!`,
                        "success",
                    );
                } else {
                    showNotification(`🎰 Ничего не выиграно`, "info");
                }
            } catch (error) {
                console.error("Ошибка сохранения игры:", error);
                showNotification("Ошибка сохранения результата", "error");
            }

            currentGame.isPlaying = false;
            this.spinButton.disabled = false;
        }, spinDuration + 1000);
    }

    calculateWin(results) {
        const combination = results.join("");
        const paytable = GAMES_CONFIG.slots.paytable;

        // Проверяем выигрышные комбинации
        for (const [pattern, multiplier] of Object.entries(paytable)) {
            if (combination === pattern) {
                return Math.floor(currentGame.bet * multiplier);
            }
        }

        return 0;
    }

    showResult(results) {
        const combination = results.join(" ");
        const winAmount = this.calculateWin(results);

        let resultHTML = `
            <div style="font-size: 24px; margin: 10px 0;">
                ${combination}
            </div>
        `;

        if (winAmount > 0) {
            resultHTML += `
                <div style="font-size: 18px; color: #34c759; font-weight: bold;">
                    🎉 Выигрыш: ${winAmount} монет!
                </div>
            `;
        } else {
            resultHTML += `
                <div style="font-size: 16px; color: #8e8e93;">
                    Попробуйте еще раз!
                </div>
            `;
        }

        this.slotsResult.innerHTML = resultHTML;
    }
}

// Утилиты
function showNotification(message, type = "info") {
    const notification = document.createElement("div");
    notification.className = `notification ${type}`;
    notification.textContent = message;

    document.body.appendChild(notification);

    // Показываем уведомление
    setTimeout(() => notification.classList.add("show"), 10);

    // Убираем через 3 секунды
    setTimeout(() => {
        notification.classList.remove("show");
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

// Инициализация игр при загрузке
document.addEventListener("DOMContentLoaded", () => {
    // Создаем экземпляры игр
    window.diceGame = new DiceGame();
    window.slotsGame = new SlotsGame();
});
