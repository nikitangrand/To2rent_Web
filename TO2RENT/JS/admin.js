// TO2RENT Control Center (Zero Emojis, Complete CRUD, Real Handlers, Role Guard)

let currentBookingStatus = '';
let currentBookingSearch = '';
let currentInquiryStatus = '';
let currentInquirySearch = '';
let currentCatalogSearch = '';

document.addEventListener('DOMContentLoaded', () => {
    initAdminAccess();
    initTabs();
    initPropertyModal();
    initFilterBars();

    window.addEventListener('to2rent:auth_changed', () => {
        initAdminAccess();
    });
});

// ==========================================================================
// 1. Role Access Guard
// ==========================================================================
function initAdminAccess() {
    const guard = document.getElementById('adminAuthGuard');
    const dashboard = document.getElementById('adminDashboard');
    const guardForm = document.getElementById('guardLoginForm');

    if (To2RentApi.isAdmin()) {
        if (guard) guard.style.display = 'none';
        if (dashboard) dashboard.style.display = 'block';
        loadAllAdminData();
    } else {
        if (dashboard) dashboard.style.display = 'none';
        if (guard) guard.style.display = 'block';

        guardForm?.addEventListener('submit', async (e) => {
            e.preventDefault();
            const submitBtn = document.getElementById('guardSubmitBtn');
            submitBtn.disabled = true;
            submitBtn.textContent = 'Проверка доступа...';

            const u = document.getElementById('guardUsername').value.trim();
            const p = document.getElementById('guardPassword').value;

            try {
                const res = await To2RentApi.login(u, p);
                if (res.user.role === 'Admin' || res.user.role === 'admin') {
                    showToast('Доступ предоставлен', `Добро пожаловать в панель управления, ${res.user.fullName || res.user.username}!`, 'success');
                    if (guard) guard.style.display = 'none';
                    if (dashboard) dashboard.style.display = 'block';
                    loadAllAdminData();
                } else {
                    showToast('Ограничение прав', 'Ваша учетная запись не имеет прав Администратора. Обратитесь к системному администратору.', 'error');
                }
            } catch (err) {
                showToast('Ошибка входа', err.message || 'Неверные учетные данные администратора', 'error');
            } finally {
                submitBtn.disabled = false;
                submitBtn.textContent = 'Войти как администратор';
            }
        });
    }
}

// ==========================================================================
// 2. Tabs & Filters
// ==========================================================================
function initTabs() {
    const tabs = document.querySelectorAll('.admin-tab-btn');
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            tabs.forEach(t => t.classList.remove('active'));
            document.querySelectorAll('.admin-tab-content').forEach(c => c.classList.remove('active'));

            tab.classList.add('active');
            const target = tab.getAttribute('data-tab');
            document.getElementById(target)?.classList.add('active');
        });
    });
}

function initFilterBars() {
    // Booking filters
    document.querySelectorAll('#bookingFilterTags .btn-tag-filter').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('#bookingFilterTags .btn-tag-filter').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentBookingStatus = btn.getAttribute('data-status') || '';
            loadBookingsTable();
        });
    });

    const bookSearch = document.getElementById('bookingSearchInput');
    bookSearch?.addEventListener('input', debounce((e) => {
        currentBookingSearch = e.target.value.trim().toLowerCase();
        loadBookingsTable();
    }, 250));

    // Inquiry filters
    document.querySelectorAll('#inquiryFilterTags .btn-tag-filter').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('#inquiryFilterTags .btn-tag-filter').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentInquiryStatus = btn.getAttribute('data-status') || '';
            loadInquiriesTable();
        });
    });

    const inqSearch = document.getElementById('inquirySearchInput');
    inqSearch?.addEventListener('input', debounce((e) => {
        currentInquirySearch = e.target.value.trim().toLowerCase();
        loadInquiriesTable();
    }, 250));

    // Catalog search
    const catSearch = document.getElementById('catalogSearchInput');
    catSearch?.addEventListener('input', debounce((e) => {
        currentCatalogSearch = e.target.value.trim().toLowerCase();
        loadCatalogTable();
    }, 250));
}

async function loadAllAdminData() {
    await Promise.all([
        loadSystemStatus(),
        loadKpis(),
        loadBookingsTable(),
        loadInquiriesTable(),
        loadCatalogTable(),
        loadReviewsTable(),
        loadUsersTable(),
        loadKafkaAuditTable()
    ]);
}

// ==========================================================================
// 3. KPI Loading
// ==========================================================================
async function loadKpis() {
    try {
        const stats = await To2RentApi.getStats();
        document.getElementById('kpiProperties').textContent = stats.totalProperties || 0;
        document.getElementById('kpiPropsBreakdown').textContent = `${stats.totalApartments || 0} квартир, ${stats.totalHouses || 0} домов`;

        document.getElementById('kpiBookings').textContent = stats.totalBookings || 0;
        document.getElementById('kpiBookingsPending').textContent = `${stats.pendingBookings || 0} ожидают подтверждения`;

        document.getElementById('kpiRevenue').textContent = `${formatNumber(stats.totalRevenue || 0)} $`;
        document.getElementById('kpiInquiries').textContent = stats.totalInquiries || 0;

        document.getElementById('kpiRating').textContent = `${stats.averageRating || 5.0} / 5.0`;
        document.getElementById('kpiReviewsCount').textContent = `${stats.totalReviews || 0} отзывов`;

        document.getElementById('tabCountBookings').textContent = stats.totalBookings || 0;
        document.getElementById('tabCountInquiries').textContent = stats.totalInquiries || 0;
        document.getElementById('tabCountProperties').textContent = stats.totalProperties || 0;
        document.getElementById('tabCountReviews').textContent = stats.totalReviews || 0;
    } catch (e) {
        console.error('Ошибка загрузки статистики:', e);
    }
}

// ==========================================================================
// 4. Bookings Management
// ==========================================================================
async function loadBookingsTable() {
    const tbody = document.getElementById('bookingsTableBody');
    if (!tbody) return;

    try {
        let bookings = await To2RentApi.getBookings(currentBookingStatus);
        if (currentBookingSearch) {
            bookings = bookings.filter(b => 
                (b.clientName && b.clientName.toLowerCase().includes(currentBookingSearch)) ||
                (b.propertyTitle && b.propertyTitle.toLowerCase().includes(currentBookingSearch)) ||
                (b.clientPhone && b.clientPhone.toLowerCase().includes(currentBookingSearch))
            );
        }

        if (!bookings || bookings.length === 0) {
            tbody.innerHTML = '<tr><td colspan="9" style="text-align: center; color: #888; padding: 24px;">Бронирований не найдено</td></tr>';
            return;
        }

        tbody.innerHTML = '';
        bookings.forEach(b => {
            const tr = document.createElement('tr');

            const badgeClass = {
                'Pending': 'badge--pending',
                'Confirmed': 'badge--confirmed',
                'Cancelled': 'badge--cancelled',
                'Completed': 'badge--completed'
            }[b.status] || 'badge--pending';

            const statusText = {
                'Pending': 'Ожидает',
                'Confirmed': 'Подтверждено',
                'Cancelled': 'Отменено',
                'Completed': 'Завершено'
            }[b.status] || b.status;

            const inDate = formatDateShort(b.checkInDate);
            const outDate = formatDateShort(b.checkOutDate);

            tr.innerHTML = `
                <td><strong>#${b.id}</strong></td>
                <td>
                    <div style="font-weight: 700;">${escapeHtml(b.clientName)}</div>
                    ${b.notes ? `<small style="color: #666;">${escapeHtml(b.notes)}</small>` : ''}
                </td>
                <td>
                    <div>${escapeHtml(b.clientPhone)}</div>
                    ${b.clientEmail ? `<small style="color: #666;">${escapeHtml(b.clientEmail)}</small>` : ''}
                </td>
                <td><strong>${escapeHtml(b.propertyTitle)}</strong></td>
                <td>${inDate} — ${outDate}</td>
                <td>${b.guestsCount} чел.</td>
                <td><strong>${formatNumber(b.totalPrice)} $</strong></td>
                <td><span class="badge ${badgeClass}">${statusText}</span></td>
                <td>
                    <div class="btn-action-group">
                        ${b.status !== 'Confirmed' ? `<button class="btn-sm-action btn-sm-action--success" onclick="changeBookingStatus(${b.id}, 'Confirmed')">Подтвердить</button>` : ''}
                        ${b.status !== 'Completed' && b.status === 'Confirmed' ? `<button class="btn-sm-action" onclick="changeBookingStatus(${b.id}, 'Completed')">Завершить</button>` : ''}
                        ${b.status !== 'Cancelled' ? `<button class="btn-sm-action btn-sm-action--danger" onclick="changeBookingStatus(${b.id}, 'Cancelled')">Отменить</button>` : ''}
                        <button class="btn-sm-action" onclick="deleteBookingItem(${b.id})">Удалить</button>
                    </div>
                </td>
            `;

            tbody.appendChild(tr);
        });
    } catch (e) {
        tbody.innerHTML = `<tr><td colspan="9" style="text-align: center; color: red;">Ошибка загрузки: ${e.message}</td></tr>`;
    }
}

async function changeBookingStatus(id, newStatus) {
    try {
        await To2RentApi.updateBookingStatus(id, newStatus);
        showToast('Статус обновлен', `Бронь #${id} переведена в статус "${newStatus}"`, 'success');
        await loadBookingsTable();
        await loadKpis();
    } catch (e) {
        showToast('Ошибка', e.message || 'Не удалось обновить статус', 'error');
    }
}

async function deleteBookingItem(id) {
    if (!confirm(`Удалить бронь #${id}?`)) return;
    try {
        await To2RentApi.deleteBooking(id);
        showToast('Удалено', `Бронь #${id} удалена`, 'info');
        await loadBookingsTable();
        await loadKpis();
    } catch (e) {
        showToast('Ошибка', e.message || 'Не удалось удалить', 'error');
    }
}

// ==========================================================================
// 5. Inquiries Management
// ==========================================================================
async function loadInquiriesTable() {
    const tbody = document.getElementById('inquiriesTableBody');
    if (!tbody) return;

    try {
        let inquiries = await To2RentApi.getInquiries(currentInquiryStatus);
        if (currentInquirySearch) {
            inquiries = inquiries.filter(i => 
                (i.name && i.name.toLowerCase().includes(currentInquirySearch)) ||
                (i.contactInfo && i.contactInfo.toLowerCase().includes(currentInquirySearch)) ||
                (i.message && i.message.toLowerCase().includes(currentInquirySearch))
            );
        }

        if (!inquiries || inquiries.length === 0) {
            tbody.innerHTML = '<tr><td colspan="8" style="text-align: center; color: #888; padding: 24px;">Запросов не найдено</td></tr>';
            return;
        }

        tbody.innerHTML = '';
        inquiries.forEach(item => {
            const tr = document.createElement('tr');
            const isNew = item.status === 'New';

            tr.innerHTML = `
                <td><strong>#${item.id}</strong></td>
                <td><strong>${escapeHtml(item.name)}</strong></td>
                <td>${escapeHtml(item.contactInfo)}</td>
                <td style="max-width: 320px;">${escapeHtml(item.message)}</td>
                <td>${escapeHtml(item.targetManager || 'Общий отдел')}</td>
                <td>${formatDateShort(item.createdAt)}</td>
                <td><span class="badge ${isNew ? 'badge--new' : 'badge--processed'}">${isNew ? 'Новый' : 'Обработан'}</span></td>
                <td>
                    <div class="btn-action-group">
                        <button class="btn-sm-action ${isNew ? 'btn-sm-action--success' : ''}" onclick="toggleInquiryStatus(${item.id}, '${isNew ? 'Processed' : 'New'}')">
                            ${isNew ? 'Обработать' : 'Вернуть'}
                        </button>
                        <button class="btn-sm-action" onclick="deleteInquiryItem(${item.id})">Удалить</button>
                    </div>
                </td>
            `;

            tbody.appendChild(tr);
        });
    } catch (e) {
        tbody.innerHTML = `<tr><td colspan="8" style="text-align: center; color: red;">Ошибка: ${e.message}</td></tr>`;
    }
}

async function toggleInquiryStatus(id, newStatus) {
    try {
        await To2RentApi.updateInquiryStatus(id, newStatus);
        showToast('Обновлено', `Статус запроса #${id} изменен`, 'success');
        await loadInquiriesTable();
        await loadKpis();
    } catch (e) {
        showToast('Ошибка', e.message, 'error');
    }
}

async function deleteInquiryItem(id) {
    if (!confirm(`Удалить запрос #${id}?`)) return;
    try {
        await To2RentApi.deleteInquiry(id);
        showToast('Удалено', `Запрос #${id} удален`, 'info');
        await loadInquiriesTable();
        await loadKpis();
    } catch (e) {
        showToast('Ошибка', e.message, 'error');
    }
}

// ==========================================================================
// 6. Catalog Management (CRUD: Add, Edit, Delete)
// ==========================================================================
let currentCatalogData = [];

async function loadCatalogTable() {
    const tbody = document.getElementById('catalogTableBody');
    if (!tbody) return;

    try {
        let properties = await To2RentApi.getProperties();
        currentCatalogData = properties || [];

        if (currentCatalogSearch) {
            properties = properties.filter(p => 
                (p.title && p.title.toLowerCase().includes(currentCatalogSearch)) ||
                (p.city && p.city.toLowerCase().includes(currentCatalogSearch)) ||
                (p.description && p.description.toLowerCase().includes(currentCatalogSearch))
            );
        }

        if (!properties || properties.length === 0) {
            tbody.innerHTML = '<tr><td colspan="9" style="text-align: center; padding: 24px;">Объекты не найдены</td></tr>';
            return;
        }

        tbody.innerHTML = '';
        properties.forEach(p => {
            let imgPath = p.image || '';
            if (!imgPath.startsWith('../') && !imgPath.startsWith('http')) {
                imgPath = '../' + imgPath.replace(/^\/+/, '');
            }

            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td><strong>#${p.id}</strong></td>
                <td><img src="${imgPath}" alt="" style="width: 50px; height: 38px; border-radius: 3px; object-fit: cover;"></td>
                <td><strong>${escapeHtml(p.title)}</strong></td>
                <td>${p.type === 'apartment' ? 'Квартира' : 'Дом / Коттедж'}</td>
                <td>${escapeHtml(p.city)}</td>
                <td><strong>${formatNumber(p.price)} $</strong></td>
                <td>${p.rooms ? `${p.rooms} комн., ` : ''}${p.area} м²</td>
                <td>
                    ${p.isPopular ? '<span class="badge badge--pending">ТОП</span> ' : ''}
                    ${p.isFeatured ? '<span class="badge badge--confirmed">ХИТ</span>' : ''}
                </td>
                <td>
                    <div class="btn-action-group">
                        <a href="${p.detailLink ? (p.detailLink.startsWith('../') ? p.detailLink : '../' + p.detailLink) : '#'}" target="_blank" class="btn-sm-action">Просмотр</a>
                        <button class="btn-sm-action" onclick="openPropertyModalForEdit(${p.id})">Редактировать</button>
                        <button class="btn-sm-action btn-sm-action--danger" onclick="deleteCatalogItem(${p.id}, '${escapeHtml(p.title)}')">Удалить</button>
                    </div>
                </td>
            `;

            tbody.appendChild(tr);
        });
    } catch (e) {
        tbody.innerHTML = `<tr><td colspan="9" style="text-align: center; color: red;">Ошибка: ${e.message}</td></tr>`;
    }
}

function initPropertyModal() {
    const modal = document.getElementById('propertyModalOverlay');
    const closeBtn = document.getElementById('propModalClose');
    if (!modal) return;

    closeBtn?.addEventListener('click', () => modal.classList.remove('active'));
    modal.addEventListener('click', (e) => {
        if (e.target === modal) modal.classList.remove('active');
    });

    const form = document.getElementById('propertyForm');
    form?.addEventListener('submit', async (e) => {
        e.preventDefault();

        const editId = document.getElementById('editPropId').value;
        const title = document.getElementById('propTitle').value.trim();
        const type = document.getElementById('propType').value;
        const city = document.getElementById('propCity').value.trim();
        const price = parseFloat(document.getElementById('propPrice').value);
        const rooms = parseInt(document.getElementById('propRooms').value || '1', 10);
        const area = parseInt(document.getElementById('propArea').value || '50', 10);
        const floors = parseInt(document.getElementById('propFloors').value || '1', 10);
        const landArea = parseInt(document.getElementById('propLandArea').value || '0', 10);
        const image = document.getElementById('propImage').value.trim();
        const desc = document.getElementById('propDesc').value.trim();
        const fullDesc = document.getElementById('propFullDesc').value.trim();

        const payload = {
            title,
            type,
            city,
            price,
            currency: '$',
            rooms,
            area,
            floors: type === 'house' ? floors : null,
            landArea: type === 'house' ? landArea : null,
            image: image || 'Images/Modern_house.jpg',
            description: desc,
            fullDescription: fullDesc,
            detailLink: type === 'apartment' ? 'about_home_mos.html' : 'about_house_los.html'
        };

        try {
            if (editId) {
                await To2RentApi.updateProperty(parseInt(editId, 10), payload);
                showToast('Обновлено', `Объект "${title}" успешно изменен в базе`, 'success');
            } else {
                await To2RentApi.createProperty(payload);
                showToast('Добавлено', `Новый объект "${title}" добавлен в каталог`, 'success');
            }

            modal.classList.remove('active');
            form.reset();
            document.getElementById('editPropId').value = '';
            await loadCatalogTable();
            await loadKpis();
        } catch (err) {
            showToast('Ошибка', err.message, 'error');
        }
    });
}

function openPropertyModal() {
    const modal = document.getElementById('propertyModalOverlay');
    const title = document.getElementById('propertyModalTitle');
    const subtitle = document.getElementById('propertyModalSubtitle');
    const form = document.getElementById('propertyForm');

    form?.reset();
    document.getElementById('editPropId').value = '';
    title.textContent = 'Добавить объект недвижимости';
    subtitle.textContent = 'Объект будет сохранен в базу данных и сразу появится на сайте';
    modal?.classList.add('active');
}

function openPropertyModalForEdit(id) {
    const item = currentCatalogData.find(x => x.id === id);
    if (!item) return;

    const modal = document.getElementById('propertyModalOverlay');
    const title = document.getElementById('propertyModalTitle');
    const subtitle = document.getElementById('propertyModalSubtitle');

    document.getElementById('editPropId').value = item.id;
    document.getElementById('propTitle').value = item.title || '';
    document.getElementById('propType').value = item.type || 'apartment';
    document.getElementById('propCity').value = item.city || '';
    document.getElementById('propPrice').value = item.price || 0;
    document.getElementById('propRooms').value = item.rooms || 1;
    document.getElementById('propArea').value = item.area || 50;
    document.getElementById('propFloors').value = item.floors || '';
    document.getElementById('propLandArea').value = item.landArea || '';
    document.getElementById('propImage').value = item.image || '';
    document.getElementById('propDesc').value = item.description || '';
    document.getElementById('propFullDesc').value = item.fullDescription || '';

    title.textContent = `Редактировать объект #${item.id}`;
    subtitle.textContent = `Изменение параметров для "${item.title}"`;
    modal?.classList.add('active');
}

async function deleteCatalogItem(id, title) {
    if (!confirm(`Вы действительно хотите удалить объект "${title}"?`)) return;
    try {
        await To2RentApi.deleteProperty(id);
        showToast('Удалено', `Объект "${title}" удален из базы`, 'info');
        await loadCatalogTable();
        await loadKpis();
    } catch (e) {
        showToast('Ошибка', e.message, 'error');
    }
}

// ==========================================================================
// 7. Reviews Management (Approve/Hide & Delete)
// ==========================================================================
async function loadReviewsTable() {
    const tbody = document.getElementById('reviewsTableBody');
    if (!tbody) return;

    try {
        const reviews = await To2RentApi.getReviews(false);
        if (!reviews || reviews.length === 0) {
            tbody.innerHTML = '<tr><td colspan="7" style="text-align: center; padding: 24px;">Отзывов нет</td></tr>';
            return;
        }

        tbody.innerHTML = '';
        reviews.forEach(r => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td><strong>#${r.id}</strong></td>
                <td>
                    <strong>${escapeHtml(r.author)}</strong>
                    ${r.propertyTitle ? `<br><small style="color: #666; font-size: 11px;">Объект: ${escapeHtml(r.propertyTitle)}</small>` : '<br><small style="color: #888; font-size: 11px;">Агентство</small>'}
                </td>
                <td style="font-weight: 700;">${r.rating} / 5</td>
                <td style="max-width: 360px;">${escapeHtml(r.comment)}</td>
                <td>
                    <span class="badge ${r.isApproved ? 'badge--approved' : 'badge--hidden'}">
                        ${r.isApproved ? 'Опубликован' : 'Скрыт'}
                    </span>
                </td>
                <td>${formatDateShort(r.createdAt)}</td>
                <td>
                    <div class="btn-action-group">
                        <button class="btn-sm-action ${r.isApproved ? '' : 'btn-sm-action--success'}" onclick="toggleReviewApproval(${r.id}, ${!r.isApproved})">
                            ${r.isApproved ? 'Скрыть' : 'Одобрить'}
                        </button>
                        <button class="btn-sm-action btn-sm-action--danger" onclick="deleteReviewItem(${r.id})">Удалить</button>
                    </div>
                </td>
            `;

            tbody.appendChild(tr);
        });
    } catch (e) {
        tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; color: red;">Ошибка: ${e.message}</td></tr>`;
    }
}

async function toggleReviewApproval(id, isApproved) {
    try {
        await To2RentApi.updateReviewStatus(id, isApproved);
        showToast('Отзыв обновлен', isApproved ? 'Отзыв одобрен и опубликован на сайте' : 'Отзыв скрыт от пользователей', 'success');
        await loadReviewsTable();
        await loadKpis();
    } catch (e) {
        showToast('Ошибка', e.message, 'error');
    }
}

async function deleteReviewItem(id) {
    if (!confirm(`Удалить отзыв #${id}?`)) return;
    try {
        await To2RentApi.deleteReview(id);
        showToast('Удалено', `Отзыв #${id} удален`, 'info');
        await loadReviewsTable();
        await loadKpis();
    } catch (e) {
        showToast('Ошибка', e.message, 'error');
    }
}

// ==========================================================================
// 8. Users Management (Role Assignment)
// ==========================================================================
async function loadUsersTable() {
    const tbody = document.getElementById('usersTableBody');
    const countEl = document.getElementById('tabCountUsers');
    if (!tbody) return;

    try {
        const users = await To2RentApi.getAllUsers();
        if (countEl) countEl.textContent = users?.length || 0;

        if (!users || users.length === 0) {
            tbody.innerHTML = '<tr><td colspan="8" style="text-align: center; padding: 24px;">Пользователей нет</td></tr>';
            return;
        }

        tbody.innerHTML = '';
        const currentUserId = To2RentApi.getCurrentUser()?.id;

        users.forEach(u => {
            const tr = document.createElement('tr');
            const isAdmin = u.role === 'Admin' || u.role === 'admin';
            const isSelf = u.id === currentUserId;

            let actionHtml = '';
            if (isSelf) {
                actionHtml = '<span style="color: #888; font-size: 12px;">Текущий аккаунт</span>';
            } else if (isAdmin) {
                actionHtml = `<button class="btn-sm-action btn-sm-action--danger" onclick="toggleUserRole(${u.id}, 'Client')">Снять админа</button>`;
            } else {
                actionHtml = `<button class="btn-sm-action btn-sm-action--success" onclick="toggleUserRole(${u.id}, 'Admin')">Сделать админом</button>`;
            }

            tr.innerHTML = `
                <td><strong>#${u.id}</strong></td>
                <td><strong>${escapeHtml(u.username)}</strong></td>
                <td>${escapeHtml(u.email)}</td>
                <td>${escapeHtml(u.fullName || '-')}</td>
                <td>${escapeHtml(u.phone || '-')}</td>
                <td>
                    <span class="role-badge ${isAdmin ? 'role-badge--admin' : 'role-badge--client'}">
                        ${isAdmin ? 'Администратор' : 'Клиент'}
                    </span>
                </td>
                <td>${formatDateShort(u.createdAt)}</td>
                <td>${actionHtml}</td>
            `;

            tbody.appendChild(tr);
        });
    } catch (e) {
        tbody.innerHTML = `<tr><td colspan="8" style="text-align: center; color: red;">Ошибка: ${e.message}</td></tr>`;
    }
}

async function toggleUserRole(userId, newRole) {
    const roleTitle = newRole === 'Admin' ? 'Администратор' : 'Клиент';
    if (!confirm(`Изменить права пользователя #${userId} на "${roleTitle}"?`)) return;

    try {
        await To2RentApi.updateUserRole(userId, newRole);
        showToast('Роль обновлена', `Пользователю #${userId} присвоена роль: ${roleTitle}`, 'success');
        await loadUsersTable();
    } catch (e) {
        showToast('Ошибка изменения роли', e.message, 'error');
    }
}

// ==========================================================================
// 9. System Telemetry & Kafka Audit Log
// ==========================================================================
async function loadSystemStatus() {
    try {
        const s = await To2RentApi.getSystemStatus();
        const dbEl = document.getElementById('statusDb');
        const cacheEl = document.getElementById('statusCache');
        const kafkaEl = document.getElementById('statusKafka');
        const memEl = document.getElementById('statusMem');

        if (dbEl) {
            const isPg = s.database && s.database.includes('PostgreSQL');
            dbEl.className = 'status-pill ' + (isPg ? 'status-pill--ok' : 'status-pill--warn');
            dbEl.textContent = `БД: ${s.database || 'OK'}`;
        }
        if (cacheEl) {
            const isRedis = s.caching && s.caching.includes('Redis');
            cacheEl.className = 'status-pill ' + (isRedis ? 'status-pill--ok' : 'status-pill--warn');
            cacheEl.textContent = `Кэш: ${s.caching || 'OK'}`;
        }
        if (kafkaEl) {
            const isBroker = s.messaging && s.messaging.includes('Broker Connected');
            kafkaEl.className = 'status-pill ' + (isBroker ? 'status-pill--ok' : 'status-pill--warn');
            kafkaEl.textContent = `Кафка: ${s.messaging || 'OK'}`;
        }
        if (memEl) {
            memEl.className = 'status-pill status-pill--neutral';
            memEl.textContent = `ОЗУ: ${s.memoryUsageMb || 0} МБ`;
        }
    } catch (e) {
        console.warn('Телеметрия недоступна:', e);
    }
}

async function loadKafkaAuditTable() {
    const tbody = document.getElementById('kafkaAuditTableBody');
    const countEl = document.getElementById('tabCountKafka');
    if (!tbody) return;

    try {
        const events = await To2RentApi.getAuditEvents(50);
        if (countEl) countEl.textContent = events?.length || 0;

        if (!events || events.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; padding: 24px;">Событий в журнале пока нет</td></tr>';
            return;
        }

        tbody.innerHTML = '';
        events.forEach(evt => {
            const tr = document.createElement('tr');
            let channelClass = 'channel-badge';
            const ch = (evt.channel || '').toLowerCase();
            if (ch.includes('telegram')) channelClass += ' channel-badge--telegram';
            else if (ch.includes('email')) channelClass += ' channel-badge--email';
            else if (ch.includes('kafka')) channelClass += ' channel-badge--kafka';

            tr.innerHTML = `
                <td style="white-space: nowrap;">${formatDateTimeShort(evt.timestamp)}</td>
                <td><strong>${escapeHtml(evt.eventType)}</strong></td>
                <td><code style="background: #f0f0f0; padding: 2px 6px; font-size: 11px;">${escapeHtml(evt.kafkaTopic || '-')}</code></td>
                <td><span class="${channelClass}">${escapeHtml(evt.channel)}</span></td>
                <td><strong>${escapeHtml(evt.recipient || '-')}</strong></td>
                <td style="font-size: 12px; color: #444; max-width: 320px;">${escapeHtml(evt.content || '-')}</td>
            `;
            tbody.appendChild(tr);
        });
    } catch (e) {
        tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: red;">Ошибка: ${e.message}</td></tr>`;
    }
}

// ==========================================================================
// 10. CSV Export (UTF-8 BOM for MS Excel Compatibility)
// ==========================================================================
function downloadCsvFile(content, filename) {
    const bom = '\uFEFF';
    const blob = new Blob([bom + content], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}

function escapeCsvField(val) {
    if (val === null || val === undefined) return '""';
    const str = String(val).replace(/"/g, '""');
    return `"${str}"`;
}

async function exportBookingsCsv() {
    try {
        showToast('Экспорт', 'Подготовка данных бронирований для Excel...', 'info');
        const bookings = await To2RentApi.getBookings();
        if (!bookings || bookings.length === 0) {
            showToast('Экспорт', 'Нет бронирований для выгрузки', 'info');
            return;
        }

        const headers = ['ID', 'Клиент', 'Email', 'Телефон', 'Объект', 'Город', 'Дата заезда', 'Дата выезда', 'Гостей', 'Сумма ($)', 'Статус', 'Дата создания'];
        const rows = bookings.map(b => [
            b.id,
            b.clientName,
            b.clientEmail,
            b.clientPhone,
            b.propertyTitle,
            b.propertyCity,
            b.checkInDate ? b.checkInDate.split('T')[0] : '',
            b.checkOutDate ? b.checkOutDate.split('T')[0] : '',
            b.guestsCount,
            b.totalPrice,
            b.status,
            b.createdAt ? b.createdAt.split('T')[0] : ''
        ].map(escapeCsvField).join(';'));

        const csvContent = [headers.map(escapeCsvField).join(';'), ...rows].join('\r\n');
        const filename = `to2rent_bookings_${new Date().toISOString().slice(0, 10)}.csv`;
        downloadCsvFile(csvContent, filename);
        showToast('Экспорт завершен', `Файл "${filename}" сформирован`, 'success');
    } catch (e) {
        showToast('Ошибка экспорта', e.message, 'error');
    }
}

async function exportCatalogCsv() {
    try {
        showToast('Экспорт', 'Подготовка каталога недвижимости для Excel...', 'info');
        const properties = await To2RentApi.getProperties();
        if (!properties || properties.length === 0) {
            showToast('Экспорт', 'Нет объектов для выгрузки', 'info');
            return;
        }

        const headers = ['ID', 'Название', 'Тип', 'Город', 'Цена ($)', 'Комнат', 'Площадь (м²)', 'Этажей', 'Участок (м²)', 'Описание'];
        const rows = properties.map(p => [
            p.id,
            p.title,
            p.type,
            p.city,
            p.price,
            p.rooms || '',
            p.area || '',
            p.floors || '',
            p.landArea || '',
            p.description || ''
        ].map(escapeCsvField).join(';'));

        const csvContent = [headers.map(escapeCsvField).join(';'), ...rows].join('\r\n');
        const filename = `to2rent_catalog_${new Date().toISOString().slice(0, 10)}.csv`;
        downloadCsvFile(csvContent, filename);
        showToast('Экспорт завершен', `Файл "${filename}" сформирован`, 'success');
    } catch (e) {
        showToast('Ошибка экспорта', e.message, 'error');
    }
}

// ==========================================================================
// Helpers
// ==========================================================================
function formatDateShort(iso) {
    if (!iso) return '-';
    try {
        const d = new Date(iso);
        return d.toLocaleDateString('ru-RU');
    } catch (_) {
        return iso;
    }
}

function formatDateTimeShort(iso) {
    if (!iso) return '-';
    try {
        const d = new Date(iso);
        return d.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) + ' ' + d.toLocaleDateString('ru-RU');
    } catch (_) {
        return iso;
    }
}

function debounce(func, delay) {
    let timeout;
    return (...args) => {
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(this, args), delay);
    };
}

window.loadAllAdminData = loadAllAdminData;
window.changeBookingStatus = changeBookingStatus;
window.deleteBookingItem = deleteBookingItem;
window.toggleInquiryStatus = toggleInquiryStatus;
window.deleteInquiryItem = deleteInquiryItem;
window.deleteCatalogItem = deleteCatalogItem;
window.openPropertyModal = openPropertyModal;
window.openPropertyModalForEdit = openPropertyModalForEdit;
window.toggleReviewApproval = toggleReviewApproval;
window.deleteReviewItem = deleteReviewItem;
window.toggleUserRole = toggleUserRole;
window.loadKafkaAuditTable = loadKafkaAuditTable;
window.exportBookingsCsv = exportBookingsCsv;
window.exportCatalogCsv = exportCatalogCsv;

