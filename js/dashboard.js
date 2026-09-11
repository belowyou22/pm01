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
    list.innerHTML = `
    <div class="skeleton-card">
        <div class="skeleton skeleton-line medium"></div>
        <div class="skeleton skeleton-line full"></div>
        <div class="skeleton skeleton-line short"></div>
    </div>
    <div class="skeleton-card">
        <div class="skeleton skeleton-line medium"></div>
        <div class="skeleton skeleton-line full"></div>
        <div class="skeleton skeleton-line short"></div>
    </div>
`;

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
                <div class="order-footer">
                    <span class="status-badge" style="background:${o.status_color}">
                        ${escapeHtml(o.status_name)}
                    </span>
                    <button class="btn btn-sm btn-history" data-order-id="${o.id}">
                        📜 История
                    </button>
                </div>
            </div>
        `).join('');
        // Навешиваем обработчики на кнопки "История"
        list.querySelectorAll('.btn-history').forEach(btn => {
            btn.addEventListener('click', () => openHistory(btn.dataset.orderId));
        });
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

    const icons = {
        success: '✅',
        error: '❌',
        info: 'ℹ️'
    };

    toast.innerHTML = `
        <span class="toast-icon">${icons[type] || icons.info}</span>
        <span class="toast-text">${message}</span>
        <span class="toast-progress"></span>
    `;

    document.body.appendChild(toast);

    setTimeout(() => toast.classList.add('show'), 50);
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}
/* ================= МОДАЛКА ИСТОРИИ ================= */

async function openHistory(orderId) {
    const modal = document.getElementById('historyModal');
    const body = document.getElementById('modalBody');
    const orderIdSpan = document.getElementById('modalOrderId');

    orderIdSpan.textContent = `#${orderId}`;
    body.innerHTML = '<div class="empty">Загрузка...</div>';
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';

    try {
        const res = await fetch('api/orders.php', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({action: 'get_history', order_id: orderId})
        });
        const data = await res.json();

        if (!data.success || data.history.length === 0) {
            body.innerHTML = '<div class="empty">История пуста</div>';
            return;
        }

        body.innerHTML = `
            <div class="history-timeline">
                ${data.history.map(h => `
                    <div class="history-item">
                        <div class="history-status" style="background:${h.status_color}">
                            ${escapeHtml(h.status_name)}
                        </div>
                        <div class="history-comment">
                            ${escapeHtml(h.comment || '—')}
                        </div>
                        <div class="history-date">
                            🕒 ${formatDate(h.created_at)}
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
    } catch (e) {
        body.innerHTML = '<div class="empty">Ошибка загрузки истории</div>';
    }
}

function closeHistory() {
    const modal = document.getElementById('historyModal');
    if (!modal) return;
    modal.classList.remove('active');
    document.body.style.overflow = '';
}

// Обработчики закрытия модалки
document.addEventListener('DOMContentLoaded', () => {
    const modal = document.getElementById('historyModal');
    const closeBtn = document.getElementById('modalClose');

    if (closeBtn) {
        closeBtn.addEventListener('click', closeHistory);
    }

    if (modal) {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) closeHistory();
        });
    }

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && modal && modal.classList.contains('active')) {
            closeHistory();
        }
    });
});