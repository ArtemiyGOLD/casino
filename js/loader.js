// Casino Soprano Loader
document.addEventListener('DOMContentLoaded', function() {
    const loadingCircle = document.querySelector('.loading-circle');
    const loadingText = document.querySelector('.loading-text');
    const body = document.body;
    
    // Создаем прогресс бар
    const progressContainer = document.createElement('div');
    progressContainer.className = 'progress-container';
    
    const progressBar = document.createElement('div');
    progressBar.className = 'progress-bar';
    
    const progressFill = document.createElement('div');
    progressFill.className = 'progress-fill';
    
    progressBar.appendChild(progressFill);
    progressContainer.appendChild(progressBar);
    
    // Вставляем после круга
    loadingCircle.parentNode.insertBefore(progressContainer, loadingText);
    
    // Обновляем текст
    loadingText.textContent = 'PREPARING VIP LOUNGE...';
    
    // Настройки загрузки
    const totalTime = 4500; // 4.5 секунды
    const steps = [
        { time: 500, text: 'VERIFYING CREDENTIALS...', progress: 15 },
        { time: 1200, text: 'CONNECTING TO SERVERS...', progress: 35 },
        { time: 2000, text: 'LOADING GAME ASSETS...', progress: 60 },
        { time: 3000, text: 'INITIALIZING BONUSES...', progress: 85 },
        { time: 4000, text: 'WELCOME TO SOPRANO...', progress: 100 }
    ];
    
    let currentStep = 0;
    const startTime = Date.now();
    
    function updateLoading() {
        const elapsed = Date.now() - startTime;
        
        // Обновляем прогресс
        if (currentStep < steps.length && elapsed >= steps[currentStep].time) {
            loadingText.textContent = steps[currentStep].text;
            progressFill.style.width = steps[currentStep].progress + '%';
            currentStep++;
            
            // Изменяем цвет круга на последнем шаге
            if (currentStep === steps.length) {
                loadingCircle.style.borderTopColor = '#00FF00';
                loadingCircle.style.boxShadow = '0 0 20px rgba(0, 255, 0, 0.5)';
            }
        }
        
        // Плавное заполнение прогресса между шагами
        if (currentStep > 0 && currentStep < steps.length) {
            const prevProgress = steps[currentStep - 1].progress;
            const nextProgress = steps[currentStep].progress;
            const stepTime = steps[currentStep].time - steps[currentStep - 1].time;
            const stepElapsed = elapsed - steps[currentStep - 1].time;
            const ratio = Math.min(stepElapsed / stepTime, 1);
            const currentProgress = prevProgress + (nextProgress - prevProgress) * ratio;
            progressFill.style.width = currentProgress + '%';
        }
        
        // Завершение
        if (elapsed >= totalTime) {
            completeLoading();
        } else {
            requestAnimationFrame(updateLoading);
        }
    }
    
    function completeLoading() {
        // Финальная анимация
        body.classList.add('fade-out');
        
        // Звуковой эффект (опционально)
        try {
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);
            
            oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
            oscillator.frequency.exponentialRampToValueAtTime(1200, audioContext.currentTime + 0.3);
            
            gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
            
            oscillator.start();
            oscillator.stop(audioContext.currentTime + 0.3);
        } catch (e) {
            // Браузер не поддерживает Web Audio API
        }
        
        // Переход через 0.8 секунды (после завершения анимации fade-out)
        setTimeout(() => {
            window.location.href = 'main.html'; // ИЗМЕНИ НА СВОЙ URL
        }, 800);
    }
    
    
    // Старт загрузки с небольшой задержкой
    setTimeout(updateLoading, 300);
});