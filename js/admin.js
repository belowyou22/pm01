let statusesCache = [];

document.addEventListener('DOMContentLoaded', async () => {
    const session = await checkSession();
    if (!session || session.user.role !== 'admin') {
        window.location.href = 'login.html';
        return;
    }

    document.getElementById('userName').textContent = session.user.name;
    loadOrders();

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
    const tbody = document.getElementById('ordersTableBody');
    tbody.innerHTML = '<tr><td colspan="7" class="empty">Загрузка...</td></tr>';

    try {
        const res = await fetch('api/admin.php');
        const data = await res.json();

        if (!data.success) {
            tbody.innerHTML = '<tr><td colspan="7" class="empty">Ошибка загрузки</td></tr>';
            return;
        }

        statusesCache = data.statuses;

        if (data.orders.length === 0) {
            tbody.innerHTML = '<tr><td colspan="7" class="empty">Заявок нет</td></tr>';
            return;
        }

        tbody.innerHTML = data.orders.map(o => `
            <tr>
                <td>#${o.id}</td>
                <td>${escapeHtml(o.full_name)}<br><small>${escapeHtml(o.login)}</small></td>
                <td><b>${escapeHtml(o.title)}</b><br><small>${escapeHtml(o.description)}</small></td>
                <td>${escapeHtml(o.category)}</td>
                <td>${o.price > 0 ? o.price + ' ₽' : '—'}</td>
                <td>${renderStatusSelect(o.id, o.status_id)}</td>
                <td><small>${formatDate(o.created_at)}</small></td>
            </tr>
        `).join('');

        // Навешиваем обработчики на селекты
        tbody.querySelectorAll('select.status-select').forEach(sel => {
            sel.addEventListener('change', () => updateStatus(sel.dataset.orderId, sel.value));
        });
    } catch (e) {
        tbody.innerHTML = '<tr><td colspan="7" class="empty">Ошибка соединения</td></tr>';
    }
}

function renderStatusSelect(orderId, currentStatusId) {
    const opts = statusesCache.map(s =>
        `<option value="${s.id}" ${s.id == currentStatusId ? 'selected' : ''}>${escapeHtml(s.name)}</option>`
    ).join('');
    return `<select class="status-select" data-order-id="${orderId}">${opts}</select>`;
}

async function updateStatus(orderId, statusId) {
    try {
        const res = await fetch('api/admin.php', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({order_id: orderId, status_id: statusId})
        });
        const data = await res.json();

        if (data.success) {
            showToast('Статус обновлён', 'success');
            loadOrders();
        } else {
            showToast(data.message || 'Ошибка', 'error');
        }
    } catch (e) {
        showToast('Ошибка соединения', 'error');
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