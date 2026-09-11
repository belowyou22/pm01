let statusesCache = [];
let categoriesCache = [];
let currentPage = 1;
let filters = { status_id: '', category: '', search: '' };

document.addEventListener('DOMContentLoaded', async () => {
    const session = await checkSession();
    if (!session || session.user.role !== 'admin') {
        window.location.href = 'login.html';
        return;
    }

    document.getElementById('userName').textContent = session.user.name;

    // Первая загрузка
    await loadOrders();

    // Выход
    document.getElementById('logoutBtn').addEventListener('click', async () => {
        await fetch('api/logout.php');
        window.location.href = 'login.html';
    });

    // Поиск с задержкой (debounce)
    let searchTimer;
    document.getElementById('filterSearch').addEventListener('input', (e) => {
        clearTimeout(searchTimer);
        searchTimer = setTimeout(() => {
            filters.search = e.target.value.trim();
            currentPage = 1;
            loadOrders();
        }, 400);
    });

    // Фильтр по статусу
    document.getElementById('filterStatus').addEventListener('change', (e) => {
        filters.status_id = e.target.value;
        currentPage = 1;
        loadOrders();
    });

    // Фильтр по категории
    document.getElementById('filterCategory').addEventListener('change', (e) => {
        filters.category = e.target.value;
        currentPage = 1;
        loadOrders();
    });

    // Сброс фильтров
    document.getElementById('resetFilters').addEventListener('click', () => {
        filters = { status_id: '', category: '', search: '' };
        currentPage = 1;
        document.getElementById('filterSearch').value = '';
        document.getElementById('filterStatus').value = '';
        document.getElementById('filterCategory').value = '';
        loadOrders();
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

    const params = new URLSearchParams();
    if (filters.status_id) params.append('status_id', filters.status_id);
    if (filters.category) params.append('category', filters.category);
    if (filters.search) params.append('search', filters.search);
    params.append('page', currentPage);

    try {
        const res = await fetch('api/admin.php?' + params.toString());
        const data = await res.json();

        if (!data.success) {
            tbody.innerHTML = '<tr><td colspan="7" class="empty">Ошибка загрузки</td></tr>';
            return;
        }

        // Обновляем кеш статусов/категорий и выпадающие списки
        statusesCache = data.statuses;
        categoriesCache = data.categories;
        fillFilters();

        // Пустой результат
        if (data.orders.length === 0) {
            tbody.innerHTML = '<tr><td colspan="7" class="empty">Заявок не найдено</td></tr>';
            renderPagination(data.pagination);
            return;
        }

        // Рендер заявок
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

        // Навешиваем обработчики
        tbody.querySelectorAll('select.status-select').forEach(sel => {
            sel.addEventListener('change', () => updateStatus(sel.dataset.orderId, sel.value));
        });

        // Пагинация
        renderPagination(data.pagination);
    } catch (e) {
        tbody.innerHTML = '<tr><td colspan="7" class="empty">Ошибка соединения</td></tr>';
    }
}

function fillFilters() {
    const statusSelect = document.getElementById('filterStatus');
    const categorySelect = document.getElementById('filterCategory');

    // Заполняем статусы (только если ещё не заполнено)
    if (statusSelect.options.length === 1) {
        statusesCache.forEach(s => {
            const opt = document.createElement('option');
            opt.value = s.id;
            opt.textContent = s.name;
            statusSelect.appendChild(opt);
        });
    }

    // Заполняем категории
    if (categorySelect.options.length === 1) {
        categoriesCache.forEach(c => {
            const opt = document.createElement('option');
            opt.value = c;
            opt.textContent = c;
            categorySelect.appendChild(opt);
        });
    }
}

function renderStatusSelect(orderId, currentStatusId) {
    const opts = statusesCache.map(s =>
        `<option value="${s.id}" ${s.id == currentStatusId ? 'selected' : ''}>${escapeHtml(s.name)}</option>`
    ).join('');
    return `<select class="status-select" data-order-id="${orderId}">${opts}</select>`;
}

function renderPagination(p) {
    const info = document.getElementById('paginationInfo');
    const pag = document.getElementById('pagination');

    info.textContent = p.total > 0
        ? `Показано ${p.from}–${p.to} из ${p.total}`
        : 'Нет заявок';

    pag.innerHTML = '';

    if (p.total_pages <= 1) return;

    // Кнопка "Назад"
    const prevBtn = document.createElement('button');
    prevBtn.className = 'page-btn';
    prevBtn.textContent = '‹';
    prevBtn.disabled = p.page === 1;
    prevBtn.addEventListener('click', () => {
        if (p.page > 1) {
            currentPage = p.page - 1;
            loadOrders();
        }
    });
    pag.appendChild(prevBtn);

    // Номера страниц (с многоточием, если много страниц)
    const pages = getVisiblePages(p.page, p.total_pages);
    pages.forEach(num => {
        if (num === '...') {
            const span = document.createElement('span');
            span.className = 'page-dots';
            span.textContent = '…';
            pag.appendChild(span);
        } else {
            const btn = document.createElement('button');
            btn.className = 'page-btn' + (num === p.page ? ' active' : '');
            btn.textContent = num;
            btn.addEventListener('click', () => {
                currentPage = num;
                loadOrders();
            });
            pag.appendChild(btn);
        }
    });

    // Кнопка "Вперёд"
    const nextBtn = document.createElement('button');
    nextBtn.className = 'page-btn';
    nextBtn.textContent = '›';
    nextBtn.disabled = p.page === p.total_pages;
    nextBtn.addEventListener('click', () => {
        if (p.page < p.total_pages) {
            currentPage = p.page + 1;
            loadOrders();
        }
    });
    pag.appendChild(nextBtn);
}

function getVisiblePages(current, total) {
    if (total <= 7) {
        return Array.from({ length: total }, (_, i) => i + 1);
    }
    const pages = [1];
    if (current > 3) pages.push('...');
    for (let i = Math.max(2, current - 1); i <= Math.min(total - 1, current + 1); i++) {
        pages.push(i);
    }
    if (current < total - 2) pages.push('...');
    pages.push(total);
    return pages;
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