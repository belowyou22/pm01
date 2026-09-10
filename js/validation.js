document.addEventListener('DOMContentLoaded', () => {
    const registerForm = document.getElementById('registerForm');
    const loginForm = document.getElementById('loginForm');

    if (registerForm) initRegister(registerForm);
    if (loginForm) initLogin(loginForm);
});

/* ============ РЕГИСТРАЦИЯ ============ */
function initRegister(form) {
    const validators = {
        login: (v) => {
            if (!v) return 'Введите логин';
            if (v.length < 3) return 'Минимум 3 символа';
            if (!/^[a-zA-Z0-9_]+$/.test(v)) return 'Только латиница, цифры и _';
            return null;
        },
        password: (v) => {
            if (!v) return 'Введите пароль';
            if (v.length < 6) return 'Минимум 6 символов';
            if (!/[A-Za-z]/.test(v) || !/\d/.test(v)) return 'Буквы и цифры обязательны';
            return null;
        },
        full_name: (v) => {
            if (!v) return 'Введите ФИО';
            if (!/^[а-яА-ЯёЁ\s\-]+$/.test(v)) return 'Только кириллица, пробелы и дефис';
            return null;
        },
        phone: (v) => {
            if (!v) return 'Введите телефон';
            if (!/^\+?[0-9\s\-\(\)]{10,18}$/.test(v)) return 'Неверный формат телефона';
            return null;
        },
        email: (v) => {
            if (!v) return 'Введите email';
            if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) return 'Неверный email';
            return null;
        }
    };

    // Live-валидация
    form.querySelectorAll('[data-validate]').forEach(input => {
        input.addEventListener('blur', () => validateField(input, validators));
        input.addEventListener('input', () => clearFieldError(input));
    });

    // Проверка уникальности логина
    const loginInput = form.querySelector('[name="login"]');
    loginInput.addEventListener('blur', async () => {
        if (validators.login(loginInput.value)) return;
        try {
            const res = await fetch('api/check-login.php', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({login: loginInput.value})
            });
            const data = await res.json();
            if (!data.available) showFieldError(loginInput, 'Такой логин уже занят');
        } catch (e) { /* пропускаем сетевые ошибки */ }
    });

    // Сабмит
    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        let valid = true;
        form.querySelectorAll('[data-validate]').forEach(input => {
            if (!validateField(input, validators)) valid = false;
        });
        if (!valid) return;

        const data = Object.fromEntries(new FormData(form).entries());

        try {
            const res = await fetch('api/register.php', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify(data)
            });
            const result = await res.json();

            if (result.success) {
                showToast('Регистрация успешна! Перенаправление...', 'success');
                setTimeout(() => window.location.href = 'login.html', 1200);
            } else {
                const errs = result.errors || [result.message] || ['Ошибка'];
                errs.forEach(msg => showToast(msg, 'error'));
            }
        } catch (e) {
            showToast('Ошибка соединения с сервером', 'error');
        }
    });
}

/* ============ ВХОД ============ */
function initLogin(form) {
    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const login = form.querySelector('[name="login"]');
        const password = form.querySelector('[name="password"]');

        clearFieldError(login);
        clearFieldError(password);

        if (!login.value.trim()) { showFieldError(login, 'Введите логин'); return; }
        if (!password.value.trim()) { showFieldError(password, 'Введите пароль'); return; }

        const data = Object.fromEntries(new FormData(form).entries());

        try {
            const res = await fetch('api/login.php', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify(data)
            });
            const result = await res.json();

            if (result.success) {
                showToast('Вход выполнен', 'success');
                setTimeout(() => window.location.href = result.redirect, 800);
            } else {
                const errs = result.errors || [result.message] || ['Ошибка входа'];
                errs.forEach(msg => showToast(msg, 'error'));
            }
        } catch (e) {
            showToast('Ошибка соединения с сервером', 'error');
        }
    });
}

/* ============ ОБЩИЕ ХЕЛПЕРЫ ============ */
function validateField(input, validators) {
    const rule = validators[input.dataset.validate];
    if (!rule) return true;

    const error = rule(input.value.trim());
    if (error) { showFieldError(input, error); return false; }

    clearFieldError(input);
    return true;
}

function showFieldError(input, message) {
    input.classList.add('error');
    const errEl = input.parentElement.querySelector('.error-message');
    if (errEl) {
        errEl.textContent = message;
        errEl.classList.add('show');
    }
}

function clearFieldError(input) {
    input.classList.remove('error');
    const errEl = input.parentElement.querySelector('.error-message');
    if (errEl) errEl.classList.remove('show');
}

function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    document.body.appendChild(toast);

    setTimeout(() => toast.classList.add('show'), 50);
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}