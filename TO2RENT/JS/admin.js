// TO2RENT Control Center (Clean Typography & Zero Emojis)

document.addEventListener('DOMContentLoaded', () => {
    initTabs();
    initAddPropertyModal();
    loadAllAdminData();
});

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

async function loadAllAdminData() {
    await Promise.all([
        loadKpis(),
        loadBookingsTable(),
        loadInquiriesTable(),
        loadCatalogTable(),
        loadReviewsTable()
    ]);
}

// ==========================================================================
// 1. KPI Loading
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
// 2. Bookings Table
// ==========================================================================
async function loadBookingsTable() {
    const tbody = document.getElementById('bookingsTableBody');
    if (!tbody) return;

    try {
        const bookings = await To2RentApi.getBookings();
        if (!bookings || bookings.length === 0) {
            tbody.innerHTML = '<tr><td colspan="9" style="text-align: center; color: #888; padding: 24px;">Бронирований пока нет</td></tr>';
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
        showToast('Статус изменен', `Бронь #${id} обновлена`, 'success');
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
// 3. Inquiries Table
// ==========================================================================
async function loadInquiriesTable() {
    const tbody = document.getElementById('inquiriesTableBody');
    if (!tbody) return;

    try {
        const inquiries = await To2RentApi.getInquiries();
        if (!inquiries || inquiries.length === 0) {
            tbody.innerHTML = '<tr><td colspan="8" style="text-align: center; color: #888; padding: 24px;">Запросов пока нет</td></tr>';
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
// 4. Catalog Table
// ==========================================================================
async function loadCatalogTable() {
    const tbody = document.getElementById('catalogTableBody');
    if (!tbody) return;

    try {
        const properties = await To2RentApi.getProperties();
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
                        <a href="${p.detailLink || '#'}" target="_blank" class="btn-sm-action">Просмотр</a>
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

async function deleteCatalogItem(id, title) {
    if (!confirm(`Удалить объект "${title}"?`)) return;
    try {
        await To2RentApi.deleteProperty(id);
        showToast('Удалено', `Объект "${title}" удален`, 'info');
        await loadCatalogTable();
        await loadKpis();
    } catch (e) {
        showToast('Ошибка', e.message, 'error');
    }
}

function initAddPropertyModal() {
    const modal = document.getElementById('addPropertyModalOverlay');
    const closeBtn = document.getElementById('addPropModalClose');
    if (!modal) return;

    closeBtn?.addEventListener('click', () => modal.classList.remove('active'));
    modal.addEventListener('click', (e) => {
        if (e.target === modal) modal.classList.remove('active');
    });

    const form = document.getElementById('addPropertyForm');
    form?.addEventListener('submit', async (e) => {
        e.preventDefault();

        const title = document.getElementById('newPropTitle').value.trim();
        const type = document.getElementById('newPropType').value;
        const city = document.getElementById('newPropCity').value.trim();
        const price = parseFloat(document.getElementById('newPropPrice').value);
        const rooms = parseInt(document.getElementById('newPropRooms').value || '1', 10);
        const area = parseInt(document.getElementById('newPropArea').value || '50', 10);
        const floors = parseInt(document.getElementById('newPropFloors').value || '1', 10);
        const landArea = parseInt(document.getElementById('newPropLandArea').value || '0', 10);
        const image = document.getElementById('newPropImage').value.trim();
        const desc = document.getElementById('newPropDesc').value.trim();
        const fullDesc = document.getElementById('newPropFullDesc').value.trim();

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
            await To2RentApi.createProperty(payload);
            modal.classList.remove('active');
            form.reset();
            showToast('Успех', `Объект "${title}" добавлен в базу`, 'success');
            await loadCatalogTable();
            await loadKpis();
        } catch (err) {
            showToast('Ошибка', err.message, 'error');
        }
    });
}

function openAddPropertyModal() {
    document.getElementById('addPropertyModalOverlay')?.classList.add('active');
}

// ==========================================================================
// 5. Reviews Table
// ==========================================================================
async function loadReviewsTable() {
    const tbody = document.getElementById('reviewsTableBody');
    if (!tbody) return;

    try {
        const reviews = await To2RentApi.getReviews(false);
        if (!reviews || reviews.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; padding: 24px;">Отзывов нет</td></tr>';
            return;
        }

        tbody.innerHTML = '';
        reviews.forEach(r => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td><strong>#${r.id}</strong></td>
                <td><strong>${escapeHtml(r.author)}</strong></td>
                <td style="font-weight: 700;">${r.rating} / 5</td>
                <td style="max-width: 400px;">${escapeHtml(r.comment)}</td>
                <td>${formatDateShort(r.createdAt)}</td>
                <td>
                    <button class="btn-sm-action btn-sm-action--danger" onclick="deleteReviewItem(${r.id})">Удалить</button>
                </td>
            `;

            tbody.appendChild(tr);
        });
    } catch (e) {
        tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: red;">Ошибка: ${e.message}</td></tr>`;
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

function formatDateShort(iso) {
    if (!iso) return '-';
    try {
        const d = new Date(iso);
        return d.toLocaleDateString('ru-RU');
    } catch (_) {
        return iso;
    }
}

window.loadAllAdminData = loadAllAdminData;
window.changeBookingStatus = changeBookingStatus;
window.deleteBookingItem = deleteBookingItem;
window.toggleInquiryStatus = toggleInquiryStatus;
window.deleteInquiryItem = deleteInquiryItem;
window.deleteCatalogItem = deleteCatalogItem;
window.openAddPropertyModal = openAddPropertyModal;
window.deleteReviewItem = deleteReviewItem;
