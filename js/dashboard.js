document.addEventListener('DOMContentLoaded', async () => {
    // Проверка сессии
    const session = await checkSession();
    if (!session || session.user.role !== 'user') {
        window.location.href = 'login.html';
        return;
    }

    document.getElementById('userName').textContent = session.user.name;

    // Загрузка заявок
    loadOrders();

    // Создание заявки
    document.getElementById('createOrderForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const form = e.target;
        const data = Object.fromEntries(new FormData(form).entries());

        try {
            const res = await fetch('api/orders.php', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify(data)
            });
            const result = await res.json();

            if (result.success) {
                showToast('Заявка создана', 'success');
                form.reset();
                loadOrders();
            } else {
                (result.errors || [result.message]).forEach(m => showToast(m, 'error'));
            }
        } catch (e) {
            showToast('Ошибка сервера', 'error');
        }
    });

    // Выход
    document.getElementById('logoutBtn').addEventListener('click', async () => {
        await fetch('api/logout.php');
        window.location.href = 'login.html';
    });
});

async function checkSession() {
    try {
        const res = await fetch('api/check-session.php');
        const data = await res.json();
        return data.success ? data : null;
    } catch { return null; }
}

async function loadOrders() {
    const list = document.getElementById('ordersList');
    list.innerHTML = '<div class="empty">Загрузка...</div>';

    try {
        const res = await fetch('api/orders.php');
        const data = await res.json();

        if (!data.success) {
            list.innerHTML = '<div class="empty">Ошибка загрузки</div>';
            return;
        }

        if (data.orders.length === 0) {
            list.innerHTML = '<div class="empty">У вас пока нет заявок</div>';
            return;
        }

        list.innerHTML = data.orders.map(o => `
            <div class="order-card">
                <h3>#${o.id} — ${escapeHtml(o.title)}</h3>
                <div class="order-meta">
                    ${escapeHtml(o.category)} · ${formatDate(o.created_at)}
                    ${o.price > 0 ? ' · ' + o.price + ' ₽' : ''}
                </div>
                <div class="order-desc">${escapeHtml(o.description)}</div>
                <span class="status-badge" style="background:${o.status_color}">
                    ${escapeHtml(o.status_name)}
                </span>
            </div>
        `).join('');
    } catch (e) {
        list.innerHTML = '<div class="empty">Ошибка соединения</div>';
    }
}

function escapeHtml(s) {
    const div = document.createElement('div');
    div.textContent = s;
    return div.innerHTML;
}

function formatDate(str) {
    const d = new Date(str.replace(' ', 'T'));
    return d.toLocaleString('ru-RU', {day:'2-digit', month:'2-digit', year:'numeric', hour:'2-digit', minute:'2-digit'});
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