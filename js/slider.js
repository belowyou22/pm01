class Slider {
    constructor(selector, options = {}) {
        this.slider = document.querySelector(selector);
        if (!this.slider) return;

        this.slidesContainer = this.slider.querySelector('.slides');
        this.slides = this.slider.querySelectorAll('.slide');
        this.prevBtn = this.slider.querySelector('.prev');
        this.nextBtn = this.slider.querySelector('.next');
        this.dotsContainer = this.slider.querySelector('.slider-dots');

        this.currentIndex = 0;
        this.count = this.slides.length;
        this.autoPlayDelay = options.autoPlayDelay || 3000; // 3 секунды по ТЗ
        this.autoPlayTimer = null;

        this.init();
    }

    init() {
        if (this.count === 0) return;

        this.createDots();
        this.bindEvents();
        this.goTo(0);
        this.startAutoPlay();
    }

    createDots() {
        for (let i = 0; i < this.count; i++) {
            const dot = document.createElement('button');
            dot.className = 'dot';
            dot.setAttribute('aria-label', `Слайд ${i + 1}`);
            dot.setAttribute('role', 'tab');
            if (i === 0) dot.classList.add('active');
            dot.addEventListener('click', () => {
                this.goTo(i);
                this.restartAutoPlay();
            });
            this.dotsContainer.appendChild(dot);
        }
        this.dots = this.dotsContainer.querySelectorAll('.dot');
    }

    bindEvents() {
        this.prevBtn.addEventListener('click', () => {
            this.prev();
            this.restartAutoPlay();
        });

        this.nextBtn.addEventListener('click', () => {
            this.next();
            this.restartAutoPlay();
        });

        // Пауза при наведении (UX)
        this.slider.addEventListener('mouseenter', () => this.stopAutoPlay());
        this.slider.addEventListener('mouseleave', () => this.startAutoPlay());

        // Пауза при фокусе на кнопках (доступность)
        this.slider.addEventListener('focusin', () => this.stopAutoPlay());
        this.slider.addEventListener('focusout', () => this.startAutoPlay());

        // Свайпы на мобильном
        this.bindSwipe();
    }

    bindSwipe() {
        let startX = 0;
        let endX = 0;
        const threshold = 50;

        this.slider.addEventListener('touchstart', (e) => {
            startX = e.touches[0].clientX;
        }, { passive: true });

        this.slider.addEventListener('touchend', (e) => {
            endX = e.changedTouches[0].clientX;
            const diff = startX - endX;

            if (Math.abs(diff) > threshold) {
                if (diff > 0) this.next();
                else this.prev();
                this.restartAutoPlay();
            }
        }, { passive: true });
    }

    goTo(index) {
        this.currentIndex = (index + this.count) % this.count;

        this.slidesContainer.style.transform =
            `translateX(-${this.currentIndex * 100}%)`;

        this.updateDots();
    }

    next() { this.goTo(this.currentIndex + 1); }
    prev() { this.goTo(this.currentIndex - 1); }

    updateDots() {
        this.dots.forEach((dot, i) => {
            dot.classList.toggle('active', i === this.currentIndex);
        });
    }

    startAutoPlay() {
        this.stopAutoPlay();
        this.autoPlayTimer = setInterval(() => this.next(), this.autoPlayDelay);
    }

    stopAutoPlay() {
        if (this.autoPlayTimer) {
            clearInterval(this.autoPlayTimer);
            this.autoPlayTimer = null;
        }
    }

    restartAutoPlay() {
        this.stopAutoPlay();
        this.startAutoPlay();
    }
}

// Инициализация
document.addEventListener('DOMContentLoaded', () => {
    new Slider('#mainSlider', { autoPlayDelay: 3000 });
});