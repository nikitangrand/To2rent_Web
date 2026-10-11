// TO2RENT Global Interactive Features (Auth, Modals, Toasts, Forms, Bookings) - Clean & No Emojis

document.addEventListener('DOMContentLoaded', () => {
    initToastContainer();
    initBookingModal();
    initManagerModal();
    initAuthModal();
    renderAuthNavbar();
    bindGlobalButtons();
    bindSearchForm();
    bindFooterForms();
    highlightCurrentNavLink();
    initDetailPageReviews();
    syncFavoritesWithServer();

    window.addEventListener('to2rent:auth_changed', () => {
        renderAuthNavbar();
        syncFavoritesWithServer();
    });
});

// ==========================================================================
// 1. Toast Notifications (Zero Emojis)
// ==========================================================================
let toastContainer = null;

function initToastContainer() {
    if (!document.querySelector('.toast-container')) {
        toastContainer = document.createElement('div');
        toastContainer.className = 'toast-container';
        document.body.appendChild(toastContainer);
    } else {
        toastContainer = document.querySelector('.toast-container');
    }
}

function showToast(title, message, type = 'info', duration = 4000) {
    if (!toastContainer) initToastContainer();

    const toast = document.createElement('div');
    toast.className = `toast toast--${type}`;

    toast.innerHTML = `
        <div class="toast-body">
            <div class="toast-title">${escapeHtml(title)}</div>
            <div class="toast-message">${escapeHtml(message)}</div>
        </div>
        <button class="toast-close" aria-label="Закрыть">&times;</button>
    `;

    const closeBtn = toast.querySelector('.toast-close');
    const dismiss = () => {
        toast.classList.add('toast-hiding');
        setTimeout(() => toast.remove(), 250);
    };

    closeBtn.addEventListener('click', dismiss);
    setTimeout(dismiss, duration);

    toastContainer.appendChild(toast);
}

// ==========================================================================
// 2. Navigation Auth Bar & State Synchronization
// ==========================================================================
function renderAuthNavbar() {
    const nav = document.querySelector('.main-nav');
    if (!nav) return;

    let authBox = nav.querySelector('.nav-auth-box');
    if (!authBox) {
        authBox = document.createElement('div');
        authBox.className = 'nav-auth-box';
        nav.appendChild(authBox);
    }

    const user = To2RentApi.getCurrentUser();
    if (user) {
        const isAdmin = user.role === 'Admin' || user.role === 'admin';
        authBox.innerHTML = `
            <div class="user-greeting">
                <span>${escapeHtml(user.fullName || user.username)}</span>
                <span class="role-badge ${isAdmin ? 'role-badge--admin' : 'role-badge--client'}">
                    ${isAdmin ? 'Администратор' : 'Клиент'}
                </span>
            </div>
            <button type="button" class="btn-nav-auth" id="navCabinetBtn">Личный кабинет</button>
            <button type="button" class="btn-nav-logout" id="navLogoutBtn">Выйти</button>
        `;

        document.getElementById('navCabinetBtn')?.addEventListener('click', () => {
            openClientDashboardModal();
        });

        document.getElementById('navLogoutBtn')?.addEventListener('click', () => {
            To2RentApi.logout();
            showToast('Выход выполнен', 'Сеанс завершен.', 'info');
        });
    } else {
        authBox.innerHTML = `
            <button type="button" class="btn-nav-auth" id="navLoginBtn">Войти</button>
            <button type="button" class="btn-nav-logout" id="navRegBtn">Регистрация</button>
        `;

        document.getElementById('navLoginBtn')?.addEventListener('click', () => openAuthModal('login'));
        document.getElementById('navRegBtn')?.addEventListener('click', () => openAuthModal('register'));
    }
}

// ==========================================================================
// 3. Authentication & Registration Modal
// ==========================================================================
let authModal = null;

function initAuthModal() {
    if (document.getElementById('authModalOverlay')) return;

    const modalMarkup = `
    <div class="modal-overlay" id="authModalOverlay">
        <div class="modal-dialog">
            <button class="modal-close-btn" id="authModalClose" aria-label="Закрыть">&times;</button>
            
            <div class="auth-tabs">
                <button type="button" class="auth-tab-btn active" id="authTabLoginBtn">Вход</button>
                <button type="button" class="auth-tab-btn" id="authTabRegisterBtn">Регистрация</button>
            </div>

            <!-- LOGIN TAB FORM -->
            <form id="authLoginForm">
                <div class="form-grid">
                    <div class="form-group-full">
                        <label class="input-label" for="loginUsername">Логин или Email *</label>
                        <input type="text" id="loginUsername" class="input-field" placeholder="Логин или email" required autocomplete="username">
                    </div>

                    <div class="form-group-full">
                        <label class="input-label" for="loginPassword">Пароль *</label>
                        <input type="password" id="loginPassword" class="input-field" placeholder="Введите пароль" required autocomplete="current-password">
                    </div>
                </div>

                <button type="submit" class="modal-submit-btn" id="loginSubmitBtn" style="margin-top: 18px;">Войти в аккаунт</button>
            </form>

            <!-- REGISTER TAB FORM -->
            <form id="authRegisterForm" style="display: none;">
                <div class="form-grid">
                    <div>
                        <label class="input-label" for="regUsername">Логин *</label>
                        <input type="text" id="regUsername" class="input-field" placeholder="Придумайте логин" required autocomplete="username">
                    </div>

                    <div>
                        <label class="input-label" for="regEmail">Электронная почта *</label>
                        <input type="email" id="regEmail" class="input-field" placeholder="example@mail.ru" required autocomplete="email">
                    </div>

                    <div>
                        <label class="input-label" for="regPassword">Пароль (мин. 6 симв.) *</label>
                        <input type="password" id="regPassword" class="input-field" placeholder="Минимум 6 символов" minlength="6" required autocomplete="new-password">
                    </div>

                    <div>
                        <label class="input-label" for="regRole">Роль в системе *</label>
                        <select id="regRole" class="input-field">
                            <option value="Client" selected>Клиент (Арендатор)</option>
                            <option value="Admin">Администратор</option>
                        </select>
                    </div>

                    <div class="form-group-full">
                        <label class="input-label" for="regFullName">ФИО *</label>
                        <input type="text" id="regFullName" class="input-field" placeholder="Иван Иванов" required>
                    </div>

                    <div class="form-group-full">
                        <label class="input-label" for="regPhone">Контактный телефон</label>
                        <input type="tel" id="regPhone" class="input-field" placeholder="+7 (999) 000-00-00">
                    </div>
                </div>

                <button type="submit" class="modal-submit-btn" id="regSubmitBtn" style="margin-top: 18px;">Зарегистрироваться</button>
            </form>
        </div>
    </div>`;

    document.body.insertAdjacentHTML('beforeend', modalMarkup);
    authModal = document.getElementById('authModalOverlay');

    const closeBtn = document.getElementById('authModalClose');
    closeBtn?.addEventListener('click', closeAuthModal);

    authModal?.addEventListener('click', (e) => {
        if (e.target === authModal) closeAuthModal();
    });

    const loginTabBtn = document.getElementById('authTabLoginBtn');
    const regTabBtn = document.getElementById('authTabRegisterBtn');

    loginTabBtn?.addEventListener('click', () => switchAuthTab('login'));
    regTabBtn?.addEventListener('click', () => switchAuthTab('register'));

    document.getElementById('authLoginForm')?.addEventListener('submit', handleAuthLoginSubmit);
    document.getElementById('authRegisterForm')?.addEventListener('submit', handleAuthRegisterSubmit);
}

function switchAuthTab(tab) {
    const loginTabBtn = document.getElementById('authTabLoginBtn');
    const regTabBtn = document.getElementById('authTabRegisterBtn');
    const loginForm = document.getElementById('authLoginForm');
    const regForm = document.getElementById('authRegisterForm');

    if (tab === 'login') {
        loginTabBtn?.classList.add('active');
        regTabBtn?.classList.remove('active');
        if (loginForm) loginForm.style.display = 'block';
        if (regForm) regForm.style.display = 'none';
    } else {
        loginTabBtn?.classList.remove('active');
        regTabBtn?.classList.add('active');
        if (loginForm) loginForm.style.display = 'none';
        if (regForm) regForm.style.display = 'block';
    }
}

function openAuthModal(defaultTab = 'login') {
    initAuthModal();
    switchAuthTab(defaultTab);
    authModal?.classList.add('active');
}

function closeAuthModal() {
    authModal?.classList.remove('active');
}

async function handleAuthLoginSubmit(e) {
    e.preventDefault();
    const submitBtn = document.getElementById('loginSubmitBtn');
    submitBtn.disabled = true;
    submitBtn.textContent = 'Вход...';

    const usernameOrEmail = document.getElementById('loginUsername').value.trim();
    const password = document.getElementById('loginPassword').value;

    try {
        const res = await To2RentApi.login(usernameOrEmail, password);
        closeAuthModal();
        showToast(
            'Авторизация успешна',
            `Добро пожаловать, ${res.user.fullName || res.user.username}! Роль: ${res.user.role === 'Admin' ? 'Администратор' : 'Клиент'}.`,
            'success'
        );
        document.getElementById('authLoginForm').reset();
    } catch (err) {
        showToast('Ошибка входа', err.message || 'Неверный логин или пароль', 'error');
    } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Войти в аккаунт';
    }
}

async function handleAuthRegisterSubmit(e) {
    e.preventDefault();
    const submitBtn = document.getElementById('regSubmitBtn');
    submitBtn.disabled = true;
    submitBtn.textContent = 'Регистрация...';

    const username = document.getElementById('regUsername').value.trim();
    const email = document.getElementById('regEmail').value.trim();
    const password = document.getElementById('regPassword').value;
    const fullName = document.getElementById('regFullName').value.trim();
    const phone = document.getElementById('regPhone').value.trim();
    const role = document.getElementById('regRole').value;

    try {
        const res = await To2RentApi.register({
            username,
            email,
            password,
            fullName,
            phone,
            role
        });
        closeAuthModal();
        showToast(
            'Регистрация завершена',
            `Аккаунт ${res.user.username} успешно создан. Вы авторизованы как ${res.user.role === 'Admin' ? 'Администратор' : 'Клиент'}.`,
            'success'
        );
        document.getElementById('authRegisterForm').reset();
    } catch (err) {
        showToast('Ошибка регистрации', err.message || 'Не удалось зарегистрироваться', 'error');
    } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Зарегистрироваться';
    }
}

// ==========================================================================
// 4. Booking Modal System
// ==========================================================================
let bookingModal = null;
let currentBookingProperty = null;
let currentPropertyBookedDates = [];

function initBookingModal() {
    if (document.getElementById('bookingModalOverlay')) return;

    const modalMarkup = `
    <div class="modal-overlay" id="bookingModalOverlay">
        <div class="modal-dialog">
            <button class="modal-close-btn" id="bookingModalClose" aria-label="Закрыть">&times;</button>
            <h2 class="modal-title">Онлайн-бронирование</h2>
            <p class="modal-subtitle">Заполните данные для оформления заявки на аренду</p>
            
            <div class="property-preview-card" id="bookingPropertyPreview" style="display: none;">
                <img src="" id="bookingPropImg" alt="Недвижимость">
                <div class="property-preview-info">
                    <h4 id="bookingPropTitle">Название объекта</h4>
                    <div class="preview-price" id="bookingPropPrice">0 $</div>
                    <div class="preview-rating" id="bookingPropRating" style="font-size: 13px; color: #555; margin-top: 3px; font-weight: 600;"></div>
                </div>
            </div>

            <div class="booking-availability-panel" id="bookingAvailabilityPanel" style="display: none;">
                <div class="booking-availability-header">
                    <span>Календарь занятости</span>
                    <span id="bookingAvailabilityStatusBadge"></span>
                </div>
                <div id="bookingAvailabilityContent">Загрузка информации...</div>
            </div>

            <form id="bookingForm">
                <div class="form-grid">
                    <div class="form-group-full">
                        <label class="input-label" for="bookClientName">Ваше имя и фамилия *</label>
                        <input type="text" id="bookClientName" class="input-field" placeholder="Иван Иванов" required>
                    </div>

                    <div>
                        <label class="input-label" for="bookClientPhone">Номер телефона *</label>
                        <input type="tel" id="bookClientPhone" class="input-field" placeholder="+7 (999) 000-00-00" required>
                    </div>

                    <div>
                        <label class="input-label" for="bookClientEmail">Электронная почта</label>
                        <input type="email" id="bookClientEmail" class="input-field" placeholder="example@mail.ru">
                    </div>

                    <div>
                        <label class="input-label" for="bookCheckIn">Дата заезда *</label>
                        <input type="date" id="bookCheckIn" class="input-field" required>
                    </div>

                    <div>
                        <label class="input-label" for="bookCheckOut">Дата выезда *</label>
                        <input type="date" id="bookCheckOut" class="input-field" required>
                    </div>

                    <div class="form-group-full" id="bookingConflictNoticeWrapper" style="display: none;">
                        <div class="booking-conflict-alert" id="bookingConflictAlert">
                            Выбранный период пересекается с существующим бронированием. Пожалуйста, укажите другие даты.
                        </div>
                    </div>

                    <div class="form-group-full">
                        <label class="input-label" for="bookGuests">Количество гостей</label>
                        <select id="bookGuests" class="input-field">
                            <option value="1">1 гость</option>
                            <option value="2" selected>2 гостя</option>
                            <option value="3">3 гостя</option>
                            <option value="4">4 гостя</option>
                            <option value="5">5+ гостей</option>
                        </select>
                    </div>

                    <div class="form-group-full">
                        <label class="input-label" for="bookNotes">Пожелания или комментарии</label>
                        <textarea id="bookNotes" class="input-field" placeholder="Особые пожелания к бронированию..."></textarea>
                    </div>
                </div>

                <div class="price-summary-box">
                    <div>
                        <div class="price-summary-label">Расчетная стоимость:</div>
                        <small id="bookingDaysCount" style="color: #666;">За 7 ночей</small>
                    </div>
                    <div class="price-summary-value" id="bookingTotalPrice">0 $</div>
                </div>

                <button type="submit" class="modal-submit-btn" id="bookingSubmitBtn">Подтвердить бронирование</button>
            </form>
        </div>
    </div>`;

    document.body.insertAdjacentHTML('beforeend', modalMarkup);
    bookingModal = document.getElementById('bookingModalOverlay');

    const closeBtn = document.getElementById('bookingModalClose');
    closeBtn?.addEventListener('click', closeBookingModal);

    bookingModal?.addEventListener('click', (e) => {
        if (e.target === bookingModal) closeBookingModal();
    });

    const inInput = document.getElementById('bookCheckIn');
    const outInput = document.getElementById('bookCheckOut');
    inInput?.addEventListener('change', updateBookingPriceCalculation);
    outInput?.addEventListener('change', updateBookingPriceCalculation);

    const form = document.getElementById('bookingForm');
    form?.addEventListener('submit', handleBookingSubmit);
}

async function openBookingModal(property = {}) {
    initBookingModal();
    currentBookingProperty = property;
    currentPropertyBookedDates = [];

    const preview = document.getElementById('bookingPropertyPreview');
    const titleEl = document.getElementById('bookingPropTitle');
    const priceEl = document.getElementById('bookingPropPrice');
    const imgEl = document.getElementById('bookingPropImg');
    const conflictWrapper = document.getElementById('bookingConflictNoticeWrapper');
    const submitBtn = document.getElementById('bookingSubmitBtn');

    if (conflictWrapper) conflictWrapper.style.display = 'none';
    if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.style.opacity = '1';
        submitBtn.textContent = 'Подтвердить бронирование';
    }

    const ratingEl = document.getElementById('bookingPropRating');
    if (ratingEl) ratingEl.textContent = '';

    if (property && property.title) {
        preview.style.display = 'flex';
        titleEl.textContent = property.title;
        priceEl.textContent = `${formatNumber(property.price || 0)} ${property.currency || '$'} / сутки`;
        imgEl.src = property.image || '../Images/Terr1.jpg';

        if (property.id) {
            To2RentApi.getPropertyRatingSummary(property.id).then(summary => {
                if (summary && summary.reviewsCount > 0 && ratingEl) {
                    ratingEl.textContent = `Рейтинг: ${summary.averageRating} / 5 (${summary.reviewsCount} ${getReviewsPlural(summary.reviewsCount)})`;
                } else if (ratingEl) {
                    ratingEl.textContent = 'Новый объект';
                }
            }).catch(() => {});
        }
    } else {
        preview.style.display = 'none';
    }

    // Auto-fill user profile if logged in
    const user = To2RentApi.getCurrentUser();
    if (user) {
        const nameInput = document.getElementById('bookClientName');
        const phoneInput = document.getElementById('bookClientPhone');
        const emailInput = document.getElementById('bookClientEmail');
        if (nameInput && !nameInput.value) nameInput.value = user.fullName || user.username;
        if (phoneInput && !phoneInput.value) phoneInput.value = user.phone || '';
        if (emailInput && !emailInput.value) emailInput.value = user.email || '';
    }

    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);

    const checkOut = new Date(tomorrow);
    checkOut.setDate(tomorrow.getDate() + 7);

    const checkInInput = document.getElementById('bookCheckIn');
    const checkOutInput = document.getElementById('bookCheckOut');
    checkInInput.value = formatDateIso(tomorrow);
    checkOutInput.value = formatDateIso(checkOut);
    checkInInput.min = formatDateIso(tomorrow);
    checkOutInput.min = formatDateIso(tomorrow);
    checkInInput.classList.remove('input-conflict');
    checkOutInput.classList.remove('input-conflict');

    updateBookingPriceCalculation();
    bookingModal?.classList.add('active');

    if (property && property.id) {
        await loadPropertyBookedDates(property.id);
    } else {
        const panel = document.getElementById('bookingAvailabilityPanel');
        if (panel) panel.style.display = 'none';
    }
}

function closeBookingModal() {
    bookingModal?.classList.remove('active');
}

async function loadPropertyBookedDates(propertyId) {
    const panel = document.getElementById('bookingAvailabilityPanel');
    const content = document.getElementById('bookingAvailabilityContent');
    const badge = document.getElementById('bookingAvailabilityStatusBadge');
    if (!panel || !content) return;

    panel.style.display = 'block';
    content.innerHTML = '<span style="color: #888;">Проверка занятых дат...</span>';
    if (badge) badge.innerHTML = '';

    try {
        const dates = await To2RentApi.getBookedDates(propertyId);
        currentPropertyBookedDates = Array.isArray(dates) ? dates : [];

        if (currentPropertyBookedDates.length === 0) {
            if (badge) badge.innerHTML = '<span class="booking-available-pill">Свободен</span>';
            content.innerHTML = '<span style="color: #555;">Объект свободен на любые ближайшие даты.</span>';
        } else {
            if (badge) badge.innerHTML = `<span style="color: #555; font-weight: 600;">Занято периодов: ${currentPropertyBookedDates.length}</span>`;
            const badgesHtml = currentPropertyBookedDates.map(r => {
                const s = formatDateRussian(r.startDate || r.CheckInDate);
                const e = formatDateRussian(r.endDate || r.CheckOutDate);
                return `<span class="booked-date-badge status-confirmed">с ${s} по ${e}</span>`;
            }).join('');
            content.innerHTML = `
                <div style="font-size: 12px; color: #666; margin-bottom: 4px;">Зарезервированные периоды:</div>
                <div class="booking-availability-list">${badgesHtml}</div>
            `;
        }
    } catch (_) {
        content.innerHTML = '<span style="color: #888;">Информация о доступности дат недоступна.</span>';
    }

    validateSelectedDates();
}

function validateSelectedDates() {
    const inInput = document.getElementById('bookCheckIn');
    const outInput = document.getElementById('bookCheckOut');
    const conflictWrapper = document.getElementById('bookingConflictNoticeWrapper');
    const conflictAlert = document.getElementById('bookingConflictAlert');
    const submitBtn = document.getElementById('bookingSubmitBtn');

    if (!inInput || !outInput) return true;

    inInput.classList.remove('input-conflict');
    outInput.classList.remove('input-conflict');
    if (conflictWrapper) conflictWrapper.style.display = 'none';
    if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.style.opacity = '1';
    }

    const inVal = inInput.value;
    const outVal = outInput.value;
    if (!inVal || !outVal) return true;

    const inDate = new Date(inVal);
    const outDate = new Date(outVal);

    if (outDate <= inDate) {
        if (conflictWrapper && conflictAlert) {
            conflictWrapper.style.display = 'block';
            conflictAlert.textContent = 'Дата выезда должна быть позже даты заезда минимум на 1 день.';
        }
        inInput.classList.add('input-conflict');
        outInput.classList.add('input-conflict');
        if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.style.opacity = '0.5';
        }
        return false;
    }

    if (currentPropertyBookedDates && currentPropertyBookedDates.length > 0) {
        for (const range of currentPropertyBookedDates) {
            const rangeStart = new Date(range.startDate || range.CheckInDate);
            const rangeEnd = new Date(range.endDate || range.CheckOutDate);

            // Interval overlap check: inDate < rangeEnd && outDate > rangeStart
            if (inDate < rangeEnd && outDate > rangeStart) {
                const sStr = formatDateRussian(rangeStart);
                const eStr = formatDateRussian(rangeEnd);
                if (conflictWrapper && conflictAlert) {
                    conflictWrapper.style.display = 'block';
                    conflictAlert.textContent = `Выбранный период пересекается с существующей бронью (с ${sStr} по ${eStr}). Пожалуйста, выберите другие даты.`;
                }
                inInput.classList.add('input-conflict');
                outInput.classList.add('input-conflict');
                if (submitBtn) {
                    submitBtn.disabled = true;
                    submitBtn.style.opacity = '0.5';
                }
                return false;
            }
        }
    }

    return true;
}

function updateBookingPriceCalculation() {
    const inVal = document.getElementById('bookCheckIn')?.value;
    const outVal = document.getElementById('bookCheckOut')?.value;
    const totalEl = document.getElementById('bookingTotalPrice');
    const daysEl = document.getElementById('bookingDaysCount');

    if (!inVal || !outVal || !totalEl || !daysEl) return;

    validateSelectedDates();

    const inDate = new Date(inVal);
    const outDate = new Date(outVal);

    let days = Math.round((outDate - inDate) / (1000 * 60 * 60 * 24));
    if (days <= 0) days = 1;

    daysEl.textContent = `За ${days} ${getDaysPlural(days)}`;

    let dailyRate = 150;
    if (currentBookingProperty && currentBookingProperty.price) {
        if (currentBookingProperty.price > 5000) {
            dailyRate = Math.round(currentBookingProperty.price / 30);
        } else {
            dailyRate = currentBookingProperty.price;
        }
    }

    const total = dailyRate * days;
    totalEl.textContent = `${formatNumber(total)} $`;
}

async function handleBookingSubmit(e) {
    e.preventDefault();

    if (!validateSelectedDates()) {
        showToast('Некорректные даты', 'Выбранные даты пересекаются с другой бронью.', 'warning');
        return;
    }

    const submitBtn = document.getElementById('bookingSubmitBtn');
    submitBtn.disabled = true;
    submitBtn.textContent = 'Оформление...';

    const clientName = document.getElementById('bookClientName').value.trim();
    const clientPhone = document.getElementById('bookClientPhone').value.trim();
    const clientEmail = document.getElementById('bookClientEmail').value.trim();
    const checkIn = document.getElementById('bookCheckIn').value;
    const checkOut = document.getElementById('bookCheckOut').value;
    const guests = parseInt(document.getElementById('bookGuests').value, 10);
    const notes = document.getElementById('bookNotes').value.trim();

    const priceText = document.getElementById('bookingTotalPrice').textContent.replace(/[^\d]/g, '');
    const totalPrice = parseFloat(priceText) || 0;

    const user = To2RentApi.getCurrentUser();
    const payload = {
        userId: user?.id || null,
        propertyId: currentBookingProperty?.id || null,
        propertyTitle: currentBookingProperty?.title || 'Недвижимость TO2RENT',
        clientName,
        clientPhone,
        clientEmail: clientEmail || null,
        checkInDate: new Date(checkIn).toISOString(),
        checkOutDate: new Date(checkOut).toISOString(),
        guestsCount: guests,
        totalPrice,
        notes: notes || null
    };

    try {
        const result = await To2RentApi.createBooking(payload);
        closeBookingModal();
        showToast(
            'Бронирование принято',
            `Заявка #${result.id} зарегистрирована. Менеджер свяжется с вами по номеру ${clientPhone}.`,
            'success',
            5000
        );
        document.getElementById('bookingForm').reset();
    } catch (err) {
        showToast('Ошибка оформления', err.message || 'Не удалось отправить заявку.', 'error');
        if (currentBookingProperty && currentBookingProperty.id) {
            loadPropertyBookedDates(currentBookingProperty.id);
        }
    } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Подтвердить бронирование';
    }
}

// ==========================================================================
// 5. Manager Contact Modal System
// ==========================================================================
let managerModal = null;
let currentManagerName = '';

function initManagerModal() {
    if (document.getElementById('managerModalOverlay')) return;

    const modalMarkup = `
    <div class="modal-overlay" id="managerModalOverlay">
        <div class="modal-dialog">
            <button class="modal-close-btn" id="managerModalClose" aria-label="Закрыть">&times;</button>
            <h2 class="modal-title" id="managerModalTitle">Связаться с менеджером</h2>
            <p class="modal-subtitle">Оставьте ваши контакты, и специалист перезвонит вам</p>

            <form id="managerForm">
                <div class="form-grid">
                    <div class="form-group-full">
                        <label class="input-label" for="managerClientName">Ваше имя *</label>
                        <input type="text" id="managerClientName" class="input-field" placeholder="Иван Иванов" required>
                    </div>

                    <div class="form-group-full">
                        <label class="input-label" for="managerContactInfo">Телефон или Email *</label>
                        <input type="text" id="managerContactInfo" class="input-field" placeholder="+7 (999) 000-00-00 или email" required>
                    </div>

                    <div class="form-group-full">
                        <label class="input-label" for="managerClientMessage">Вопрос или пожелание *</label>
                        <textarea id="managerClientMessage" class="input-field" placeholder="Опишите ваш запрос или вопрос..." required></textarea>
                    </div>
                </div>

                <button type="submit" class="modal-submit-btn" id="managerSubmitBtn">Отправить запрос</button>
            </form>
        </div>
    </div>`;

    document.body.insertAdjacentHTML('beforeend', modalMarkup);
    managerModal = document.getElementById('managerModalOverlay');

    const closeBtn = document.getElementById('managerModalClose');
    closeBtn?.addEventListener('click', closeManagerModal);

    managerModal?.addEventListener('click', (e) => {
        if (e.target === managerModal) closeManagerModal();
    });

    const form = document.getElementById('managerForm');
    form?.addEventListener('submit', handleManagerSubmit);
}

function openManagerModal(managerName = 'Менеджер TO2RENT') {
    initManagerModal();
    currentManagerName = managerName;
    document.getElementById('managerModalTitle').textContent = `Связаться: ${managerName}`;

    const user = To2RentApi.getCurrentUser();
    if (user) {
        const nameInput = document.getElementById('managerClientName');
        const contactInput = document.getElementById('managerContactInfo');
        if (nameInput && !nameInput.value) nameInput.value = user.fullName || user.username;
        if (contactInput && !contactInput.value) contactInput.value = user.phone || user.email || '';
    }

    managerModal?.classList.add('active');
}

function closeManagerModal() {
    managerModal?.classList.remove('active');
}

async function handleManagerSubmit(e) {
    e.preventDefault();
    const submitBtn = document.getElementById('managerSubmitBtn');
    submitBtn.disabled = true;
    submitBtn.textContent = 'Отправка...';

    const name = document.getElementById('managerClientName').value.trim();
    const contactInfo = document.getElementById('managerContactInfo').value.trim();
    const message = document.getElementById('managerClientMessage').value.trim();

    try {
        await To2RentApi.createInquiry({
            name,
            contactInfo,
            message,
            targetManager: currentManagerName
        });
        closeManagerModal();
        showToast('Запрос отправлен', `Менеджер ${currentManagerName} свяжется с вами в ближайшее время.`, 'success');
        document.getElementById('managerForm').reset();
    } catch (err) {
        showToast('Ошибка', err.message || 'Не удалось отправить запрос', 'error');
    } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Отправить запрос';
    }
}

// ==========================================================================
// 6. Global Button Bindings
// ==========================================================================
function bindGlobalButtons() {
    const highlightBookBtn = document.querySelector('.btn--highlight');
    if (highlightBookBtn) {
        highlightBookBtn.addEventListener('click', (e) => {
            e.preventDefault();
            const title = document.querySelector('.highlight-title')?.textContent || 'Коттедж Modern Лос Анджелес';
            const img = document.querySelector('.highlight-image')?.src || 'Images/Modern_house.jpg';
            openBookingModal({
                title,
                price: 820000,
                currency: '$',
                image: img
            });
        });
    }

    document.querySelectorAll('.manager').forEach(managerEl => {
        const btn = managerEl.querySelector('.btn--small');
        const info = managerEl.querySelector('.manager-info')?.textContent || 'Менеджер';
        const name = info.split(' ')[0] || 'Менеджер';
        if (btn) {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                openManagerModal(name);
            });
        }
    });

    document.body.addEventListener('click', (e) => {
        const target = e.target.closest('.btn--appart');
        if (!target) return;

        const card = target.closest('.appart--card');
        if (card) {
            e.preventDefault();
            const title = card.querySelector('h2')?.textContent || 'Недвижимость TO2RENT';
            const priceText = card.querySelector('.price')?.textContent || '0';
            const price = parseFloat(priceText.replace(/[^\d]/g, '')) || 500000;
            const img = card.querySelector('.card-image')?.src || '';

            openBookingModal({
                title,
                price,
                currency: '$',
                image: img
            });
        }
    });
}

function bindSearchForm() {
    const searchForm = document.querySelector('.search-form');
    if (!searchForm) return;

    const input = searchForm.querySelector('.search-input');
    const btn = searchForm.querySelector('.search-btn');

    const handleSearch = () => {
        const query = (input?.value || '').trim();
        if (!query) {
            showToast('Поиск', 'Введите название города или объекта для поиска', 'info');
            return;
        }

        const isInHtmlPages = window.location.pathname.includes('/Html-Pages/');
        const targetPage = isInHtmlPages ? 'apartments.html' : 'Html-Pages/apartments.html';
        window.location.href = `${targetPage}?search=${encodeURIComponent(query)}`;
    };

    if (btn) btn.addEventListener('click', handleSearch);
    if (input) {
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                handleSearch();
            }
        });
    }
}

function bindFooterForms() {
    document.querySelectorAll('.contact-form').forEach(formEl => {
        const input = formEl.querySelector('.form-input');
        const btn = formEl.querySelector('.btn--contact');

        const submitQuestion = async () => {
            const message = (input?.value || '').trim();
            if (!message) {
                showToast('Внимание', 'Введите ваш вопрос или сообщение', 'info');
                return;
            }

            btn.disabled = true;
            btn.textContent = '...';

            const user = To2RentApi.getCurrentUser();
            const name = user ? (user.fullName || user.username) : 'Клиент сайта';
            const contactInfo = user ? (user.phone || user.email || 'Авторизован') : 'Форма обратной связи';

            try {
                await To2RentApi.createInquiry({
                    name,
                    contactInfo,
                    message,
                    targetManager: 'Общий отдел'
                });

                input.value = '';
                showToast('Сообщение отправлено', 'Вопрос передан сотрудникам. Мы свяжемся с вами в ближайшее время.', 'success');
            } catch (err) {
                showToast('Ошибка', err.message || 'Не удалось отправить вопрос', 'error');
            } finally {
                btn.disabled = false;
                btn.textContent = 'Отправить';
            }
        };

        if (btn) btn.addEventListener('click', (e) => { e.preventDefault(); submitQuestion(); });
        if (input) {
            input.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    submitQuestion();
                }
            });
        }
    });
}

function highlightCurrentNavLink() {
    const current = window.location.pathname.split('/').pop() || 'index.html';
    document.querySelectorAll('.nav-link').forEach(link => {
        const href = link.getAttribute('href')?.split('/').pop();
        if (href === current) {
            link.classList.add('active');
        }
    });
}

function formatNumber(num) {
    return Number(num || 0).toLocaleString('ru-RU');
}

function formatDateIso(date) {
    return date.toISOString().split('T')[0];
}

function getDaysPlural(n) {
    if (n % 10 === 1 && n % 100 !== 11) return 'ночь';
    if ([2, 3, 4].includes(n % 10) && ![12, 13, 14].includes(n % 100)) return 'ночи';
    return 'ночей';
}

function getReviewsPlural(n) {
    if (n % 10 === 1 && n % 100 !== 11) return 'отзыв';
    if ([2, 3, 4].includes(n % 10) && ![12, 13, 14].includes(n % 100)) return 'отзыва';
    return 'отзывов';
}

function escapeHtml(str) {
    if (!str) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

function formatDateRussian(isoString) {
    if (!isoString) return '';
    try {
        const d = new Date(isoString);
        return d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' });
    } catch (_) {
        return String(isoString).split('T')[0];
    }
}

// ==========================================================================
// 6. Client Dashboard System (Личный кабинет: Мои бронирования и Профиль)
// ==========================================================================
let clientDashboardModal = null;
let currentClientBookings = [];
let currentBookingFilter = '';

function initClientDashboardModal() {
    if (document.getElementById('clientDashboardOverlay')) return;

    const modalMarkup = `
    <div class="modal-overlay" id="clientDashboardOverlay">
        <div class="modal-dialog client-dashboard-dialog">
            <button class="modal-close-btn" id="clientDashboardClose" aria-label="Закрыть">&times;</button>
            <h2 class="modal-title">Личный кабинет</h2>
            <p class="modal-subtitle" id="clientDashboardSubtitle">Управление вашими бронированиями и профилем</p>

            <div class="client-tabs">
                <button type="button" class="client-tab-btn active" id="tabBtnMyBookings">Мои бронирования (<span id="userBookingsCount">0</span>)</button>
                <button type="button" class="client-tab-btn" id="tabBtnMyFavorites">Избранное (<span id="userFavoritesCount">0</span>)</button>
                <button type="button" class="client-tab-btn" id="tabBtnMyProfile">Мой профиль</button>
            </div>

            <!-- TAB 1: BOOKINGS -->
            <div class="client-tab-pane active" id="paneMyBookings">
                <div class="client-bookings-filters" id="clientBookingsFilters">
                    <button type="button" class="client-filter-chip active" data-filter="">Все</button>
                    <button type="button" class="client-filter-chip" data-filter="Pending">Ожидают</button>
                    <button type="button" class="client-filter-chip" data-filter="Confirmed">Подтверждены</button>
                    <button type="button" class="client-filter-chip" data-filter="Cancelled">Отменены</button>
                </div>
                <div class="client-bookings-container" id="userBookingsList">
                    <div class="client-loading-spinner">Загрузка бронирований...</div>
                </div>
            </div>

            <!-- TAB 2: FAVORITES -->
            <div class="client-tab-pane" id="paneMyFavorites" style="display: none;">
                <div class="client-favorites-container" id="userFavoritesList">
                    <div class="client-loading-spinner">Загрузка избранного...</div>
                </div>
            </div>

            <!-- TAB 3: PROFILE -->
            <div class="client-tab-pane" id="paneMyProfile" style="display: none;">
                <form id="clientProfileForm">
                    <div class="form-grid">
                        <div>
                            <label class="input-label" for="profUsername">Логин</label>
                            <input type="text" id="profUsername" class="input-field" disabled readonly style="background: #f7f7f7; color: #555;">
                        </div>
                        <div>
                            <label class="input-label" for="profRole">Роль в системе</label>
                            <input type="text" id="profRole" class="input-field" disabled readonly style="background: #f7f7f7; color: #555;">
                        </div>
                        <div class="form-group-full">
                            <label class="input-label" for="profFullName">ФИО *</label>
                            <input type="text" id="profFullName" class="input-field" placeholder="Иван Иванов" required>
                        </div>
                        <div>
                            <label class="input-label" for="profPhone">Контактный телефон *</label>
                            <input type="tel" id="profPhone" class="input-field" placeholder="+7 (999) 000-00-00" required>
                        </div>
                        <div>
                            <label class="input-label" for="profEmail">Электронная почта *</label>
                            <input type="email" id="profEmail" class="input-field" placeholder="example@mail.ru" required>
                        </div>
                    </div>

                    <div class="profile-section-divider">
                        <h4>Смена пароля (необязательно)</h4>
                    </div>

                    <div class="form-grid">
                        <div>
                            <label class="input-label" for="profCurrentPassword">Текущий пароль</label>
                            <input type="password" id="profCurrentPassword" class="input-field" placeholder="Введите текущий пароль" autocomplete="current-password">
                        </div>
                        <div>
                            <label class="input-label" for="profNewPassword">Новый пароль</label>
                            <input type="password" id="profNewPassword" class="input-field" placeholder="Минимум 6 символов" minlength="6" autocomplete="new-password">
                        </div>
                    </div>

                    <button type="submit" class="modal-submit-btn" id="profSubmitBtn" style="margin-top: 20px;">Сохранить изменения</button>
                </form>
            </div>
        </div>
    </div>`;

    document.body.insertAdjacentHTML('beforeend', modalMarkup);
    clientDashboardModal = document.getElementById('clientDashboardOverlay');

    const closeBtn = document.getElementById('clientDashboardClose');
    closeBtn?.addEventListener('click', closeClientDashboardModal);

    clientDashboardModal?.addEventListener('click', (e) => {
        if (e.target === clientDashboardModal) closeClientDashboardModal();
    });

    // Tab buttons
    document.getElementById('tabBtnMyBookings')?.addEventListener('click', () => switchClientTab('bookings'));
    document.getElementById('tabBtnMyFavorites')?.addEventListener('click', () => switchClientTab('favorites'));
    document.getElementById('tabBtnMyProfile')?.addEventListener('click', () => switchClientTab('profile'));

    // Filter chips
    document.querySelectorAll('#clientBookingsFilters .client-filter-chip').forEach(chip => {
        chip.addEventListener('click', () => {
            document.querySelectorAll('#clientBookingsFilters .client-filter-chip').forEach(c => c.classList.remove('active'));
            chip.classList.add('active');
            currentBookingFilter = chip.getAttribute('data-filter') || '';
            applyClientBookingsFilter();
        });
    });

    // Profile form
    document.getElementById('clientProfileForm')?.addEventListener('submit', handleClientProfileSubmit);
}

function openClientDashboardModal(initialTab = 'bookings') {
    const user = To2RentApi.getCurrentUser();
    if (!user) {
        showToast('Вход в систему', 'Для доступа к личному кабинету войдите в аккаунт.', 'info');
        openAuthModal('login');
        return;
    }

    initClientDashboardModal();
    switchClientTab(initialTab);
    loadClientDashboardData();
    clientDashboardModal?.classList.add('active');
}

function closeClientDashboardModal() {
    clientDashboardModal?.classList.remove('active');
}

function switchClientTab(tabName) {
    const tabBookingsBtn = document.getElementById('tabBtnMyBookings');
    const tabFavoritesBtn = document.getElementById('tabBtnMyFavorites');
    const tabProfileBtn = document.getElementById('tabBtnMyProfile');
    const paneBookings = document.getElementById('paneMyBookings');
    const paneFavorites = document.getElementById('paneMyFavorites');
    const paneProfile = document.getElementById('paneMyProfile');

    tabBookingsBtn?.classList.remove('active');
    tabFavoritesBtn?.classList.remove('active');
    tabProfileBtn?.classList.remove('active');

    if (paneBookings) paneBookings.style.display = 'none';
    if (paneFavorites) paneFavorites.style.display = 'none';
    if (paneProfile) paneProfile.style.display = 'none';

    if (tabName === 'profile') {
        tabProfileBtn?.classList.add('active');
        if (paneProfile) paneProfile.style.display = 'block';
    } else if (tabName === 'favorites') {
        tabFavoritesBtn?.classList.add('active');
        if (paneFavorites) paneFavorites.style.display = 'block';
        renderUserFavorites();
    } else {
        tabBookingsBtn?.classList.add('active');
        if (paneBookings) paneBookings.style.display = 'block';
    }
}

async function loadClientDashboardData() {
    const user = To2RentApi.getCurrentUser();
    if (!user) return;

    // Fill profile fields
    const usernameEl = document.getElementById('profUsername');
    const roleEl = document.getElementById('profRole');
    const fullNameEl = document.getElementById('profFullName');
    const phoneEl = document.getElementById('profPhone');
    const emailEl = document.getElementById('profEmail');

    if (usernameEl) usernameEl.value = user.username || '';
    if (roleEl) roleEl.value = user.role === 'Admin' ? 'Администратор' : 'Клиент';
    if (fullNameEl) fullNameEl.value = user.fullName || user.username || '';
    if (phoneEl) phoneEl.value = user.phone || '';
    if (emailEl) emailEl.value = user.email || '';

    // Load bookings
    const listContainer = document.getElementById('userBookingsList');
    if (listContainer) {
        listContainer.innerHTML = '<div class="client-loading-spinner">Загрузка бронирований...</div>';
    }

    try {
        const bookings = await To2RentApi.getUserBookings(user.id, user.email, user.phone);
        currentClientBookings = bookings || [];
        const countEl = document.getElementById('userBookingsCount');
        if (countEl) countEl.textContent = currentClientBookings.length;
        applyClientBookingsFilter();
    } catch (err) {
        if (listContainer) {
            listContainer.innerHTML = `<div class="client-empty-bookings"><p>Не удалось загрузить бронирования: ${escapeHtml(err.message)}</p></div>`;
        }
    }
}

function applyClientBookingsFilter() {
    const listContainer = document.getElementById('userBookingsList');
    if (!listContainer) return;

    let filtered = currentClientBookings;
    if (currentBookingFilter) {
        filtered = filtered.filter(b => b.status && b.status.toLowerCase() === currentBookingFilter.toLowerCase());
    }

    renderUserBookings(filtered, listContainer);
}

function renderUserBookings(bookings, container) {
    if (!bookings || bookings.length === 0) {
        container.innerHTML = `
            <div class="client-empty-bookings">
                <h4>У вас пока нет оформленных бронирований</h4>
                <p>Выберите понравившиеся апартаменты или дом в каталоге и оформите аренду онлайн.</p>
                <div style="display: flex; gap: 10px; justify-content: center; flex-wrap: wrap;">
                    <a href="/Html-Pages/apartments.html" class="modal-submit-btn" style="width: auto; padding: 8px 20px; text-decoration: none;">Квартиры</a>
                    <a href="/Html-Pages/houses.html" class="modal-submit-btn" style="width: auto; padding: 8px 20px; text-decoration: none; background: #333;">Дома</a>
                </div>
            </div>
        `;
        return;
    }

    container.innerHTML = '';
    bookings.forEach(b => {
        const item = document.createElement('div');
        item.className = 'client-booking-item';

        const statusMap = {
            'pending': { label: 'Ожидает подтверждения', cls: 'status--pending' },
            'confirmed': { label: 'Подтверждено', cls: 'status--confirmed' },
            'cancelled': { label: 'Отменено', cls: 'status--cancelled' },
            'completed': { label: 'Завершено', cls: 'status--completed' }
        };
        const statusInfo = statusMap[b.status?.toLowerCase()] || { label: b.status, cls: 'status--pending' };
        const canCancel = b.status?.toLowerCase() === 'pending' || b.status?.toLowerCase() === 'confirmed';

        const inDate = new Date(b.checkInDate);
        const outDate = new Date(b.checkOutDate);
        const days = Math.max(1, Math.round((outDate - inDate) / (1000 * 60 * 60 * 24)));

        item.innerHTML = `
            <div class="booking-item-header">
                <div>
                    <h4 class="booking-item-title">${escapeHtml(b.propertyTitle)}</h4>
                    <div class="booking-item-meta">Заявка #${b.id} &bull; ${formatDateRussian(b.createdAt)}</div>
                </div>
                <span class="client-status-badge ${statusInfo.cls}">${statusInfo.label}</span>
            </div>
            <div class="booking-item-body">
                <div class="booking-item-param">
                    <span class="param-label">Даты проживания:</span>
                    <span class="param-value">${formatDateRussian(b.checkInDate)} — ${formatDateRussian(b.checkOutDate)} (${days} ${getDaysPlural(days)})</span>
                </div>
                <div class="booking-item-param">
                    <span class="param-label">Количество гостей:</span>
                    <span class="param-value">${b.guestsCount}</span>
                </div>
                <div class="booking-item-param">
                    <span class="param-label">Итоговая сумма:</span>
                    <span class="param-value booking-item-price">${formatNumber(b.totalPrice)} $</span>
                </div>
                ${b.notes ? `
                <div class="booking-item-param" style="grid-column: 1 / -1;">
                    <span class="param-label">Пожелания:</span>
                    <span class="param-value">${escapeHtml(b.notes)}</span>
                </div>` : ''}
            </div>
            <div class="booking-item-footer">
                ${canCancel ? `
                    <button type="button" class="btn-client-cancel" onclick="handleClientCancelBooking(${b.id})">Отменить бронь</button>
                ` : `
                    <span class="booking-status-notice">${b.status?.toLowerCase() === 'cancelled' ? 'Заявка отменена' : 'Проживание завершено'}</span>
                `}
            </div>
        `;

        container.appendChild(item);
    });
}

async function handleClientCancelBooking(bookingId) {
    if (!confirm(`Вы действительно хотите отменить заявку на бронирование #${bookingId}?`)) {
        return;
    }

    const user = To2RentApi.getCurrentUser();
    try {
        await To2RentApi.cancelBooking(bookingId, user?.id || null);
        showToast('Бронирование отменено', `Заявка #${bookingId} успешно переведена в статус «Отменено».`, 'info');
        loadClientDashboardData();
    } catch (err) {
        showToast('Ошибка отмены', err.message || 'Не удалось отменить бронирование.', 'error');
    }
}

async function handleClientProfileSubmit(e) {
    e.preventDefault();
    const submitBtn = document.getElementById('profSubmitBtn');
    submitBtn.disabled = true;
    submitBtn.textContent = 'Сохранение...';

    const user = To2RentApi.getCurrentUser();
    if (!user) return;

    const fullName = document.getElementById('profFullName').value.trim();
    const phone = document.getElementById('profPhone').value.trim();
    const email = document.getElementById('profEmail').value.trim();
    const currentPassword = document.getElementById('profCurrentPassword').value;
    const newPassword = document.getElementById('profNewPassword').value;

    const payload = {
        fullName,
        phone,
        email,
        currentPassword: currentPassword || null,
        newPassword: newPassword || null
    };

    try {
        const updatedUser = await To2RentApi.updateProfile(payload, user.id);
        const stored = To2RentApi.getCurrentUser();
        const merged = { ...stored, ...updatedUser };
        localStorage.setItem('to2rent_user', JSON.stringify(merged));
        renderAuthNavbar();

        document.getElementById('profCurrentPassword').value = '';
        document.getElementById('profNewPassword').value = '';

        showToast('Профиль обновлен', 'Ваши персональные данные успешно сохранены.', 'success');
    } catch (err) {
        showToast('Ошибка сохранения', err.message || 'Не удалось обновить профиль.', 'error');
    } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Сохранить изменения';
    }
}

async function initDetailPageReviews() {
    const card = document.querySelector('.appart--card');
    if (!card) return;

    const titleEl = card.querySelector('h2');
    if (!titleEl) return;
    const title = titleEl.textContent.trim();

    try {
        const properties = await To2RentApi.getProperties();
        let prop = Array.isArray(properties) ? properties.find(p => p.title.trim().toLowerCase() === title.toLowerCase()) : null;
        if (!prop && Array.isArray(properties) && properties.length > 0) {
            prop = properties.find(p => title.toLowerCase().includes(p.city.toLowerCase()) || p.title.toLowerCase().includes(title.toLowerCase()));
        }
        if (!prop) return;

        // Display rating pill under price
        const priceEl = card.querySelector('.price');
        const summary = await To2RentApi.getPropertyRatingSummary(prop.id);

        const pill = document.createElement('div');
        pill.className = 'prop-rating-pill';
        pill.id = 'detailPropRatingPill';
        if (summary && summary.reviewsCount > 0) {
            pill.innerHTML = `
                <span class="rating-score">Рейтинг: ${summary.averageRating} / 5</span>
                <span class="rating-count">(${summary.reviewsCount} ${getReviewsPlural(summary.reviewsCount)})</span>
            `;
        } else {
            pill.innerHTML = `<span class="rating-score">Новый объект</span> <span class="rating-count">(пока нет отзывов)</span>`;
        }
        if (priceEl && priceEl.parentNode) {
            priceEl.parentNode.insertBefore(pill, priceEl.nextSibling);
        }

        // Add Favorite button next to "Забронировать"
        const appartBtn = card.querySelector('.btn--appart');
        if (appartBtn && !card.querySelector('.btn--favorite')) {
            const favBtn = document.createElement('button');
            favBtn.className = 'btn btn--favorite';
            favBtn.type = 'button';
            favBtn.id = 'detailFavoriteBtn';
            favBtn.setAttribute('data-prop-id', prop.id);
            favBtn.setAttribute('data-prop-title', prop.title);
            const isFav = isPropertyFavorite(prop.id);
            favBtn.textContent = isFav ? 'В избранном' : 'В избранное';
            if (isFav) favBtn.classList.add('is-active');
            appartBtn.parentNode.insertBefore(favBtn, appartBtn.nextSibling);
        }

        // Add Reviews Section below card
        const reviewsSection = document.createElement('section');
        reviewsSection.className = 'property-reviews-block';
        reviewsSection.id = 'propertyReviewsSection';
        reviewsSection.innerHTML = `
            <div class="property-reviews-header">
                <div>
                    <h3>Отзывы об объекте</h3>
                    <small style="color: #666;">Впечатления и оценки гостей</small>
                </div>
                <button type="button" class="btn-add-review" id="btnTogglePropReviewForm">Оставить отзыв</button>
            </div>

            <div class="property-reviews-list" id="propReviewsList">
                <div style="text-align: center; color: #888; padding: 20px;">Загрузка отзывов...</div>
            </div>

            <div class="inline-review-form" id="inlinePropReviewForm" style="display: none;">
                <h4>Оставить отзыв об объекте «${escapeHtml(prop.title)}»</h4>
                <form id="propDetailReviewForm">
                    <div class="form-grid">
                        <div>
                            <label class="input-label" for="detailRevAuthor">Ваше имя *</label>
                            <input type="text" id="detailRevAuthor" class="input-field" placeholder="Иван Иванов" required>
                        </div>
                        <div>
                            <label class="input-label" for="detailRevRating">Оценка *</label>
                            <select id="detailRevRating" class="input-field" required>
                                <option value="5" selected>5 из 5 (Отлично)</option>
                                <option value="4">4 из 5 (Хорошо)</option>
                                <option value="3">3 из 5 (Удовлетворительно)</option>
                                <option value="2">2 из 5 (Плохо)</option>
                                <option value="1">1 из 5 (Ужасно)</option>
                            </select>
                        </div>
                        <div class="form-group-full">
                            <label class="input-label" for="detailRevComment">Текст отзыва *</label>
                            <textarea id="detailRevComment" class="input-field" rows="3" placeholder="Расскажите о проживании в этом объекте..." required></textarea>
                        </div>
                    </div>
                    <button type="submit" class="modal-submit-btn" style="margin-top: 14px; max-width: 250px;">Опубликовать отзыв</button>
                </form>
            </div>
        `;

        card.parentNode.insertBefore(reviewsSection, card.nextSibling);

        const user = To2RentApi.getCurrentUser();
        const authorInput = document.getElementById('detailRevAuthor');
        if (user && authorInput) authorInput.value = user.fullName || user.username;

        const toggleBtn = document.getElementById('btnTogglePropReviewForm');
        const formContainer = document.getElementById('inlinePropReviewForm');
        toggleBtn?.addEventListener('click', () => {
            const isHidden = formContainer.style.display === 'none';
            formContainer.style.display = isHidden ? 'block' : 'none';
            toggleBtn.textContent = isHidden ? 'Скрыть форму' : 'Оставить отзыв';
        });

        const loadPropReviews = async () => {
            const listEl = document.getElementById('propReviewsList');
            if (!listEl) return;
            try {
                const reviews = await To2RentApi.getPropertyReviews(prop.id);
                if (!reviews || reviews.length === 0) {
                    listEl.innerHTML = `
                        <div class="property-empty-reviews">
                            Пока нет опубликованных отзывов для этого объекта. Будьте первым, кто поделится отзывом!
                        </div>`;
                    return;
                }
                listEl.innerHTML = reviews.map(r => `
                    <div class="prop-review-card">
                        <div class="prop-review-card-header">
                            <span class="prop-review-author">${escapeHtml(r.author)}</span>
                            <span class="prop-review-date">${formatDateRussian(r.createdAt)}</span>
                        </div>
                        <div class="prop-review-rating">Оценка: ${r.rating} из 5</div>
                        <p class="prop-review-text">${escapeHtml(r.comment)}</p>
                    </div>
                `).join('');
            } catch (_) {
                listEl.innerHTML = '<div class="property-empty-reviews">Не удалось загрузить отзывы.</div>';
            }
        };

        await loadPropReviews();

        const reviewForm = document.getElementById('propDetailReviewForm');
        reviewForm?.addEventListener('submit', async (e) => {
            e.preventDefault();
            const submitBtn = reviewForm.querySelector('button[type="submit"]');
            submitBtn.disabled = true;
            submitBtn.textContent = 'Публикация...';

            const author = document.getElementById('detailRevAuthor').value.trim();
            const rating = parseInt(document.getElementById('detailRevRating').value, 10);
            const comment = document.getElementById('detailRevComment').value.trim();
            const curUser = To2RentApi.getCurrentUser();

            try {
                await To2RentApi.createReview({
                    propertyId: prop.id,
                    propertyTitle: prop.title,
                    userId: curUser?.id || null,
                    author,
                    rating,
                    comment
                });
                showToast('Спасибо за отзыв', 'Ваш отзыв успешно опубликован.', 'success');
                reviewForm.reset();
                if (curUser) {
                    document.getElementById('detailRevAuthor').value = curUser.fullName || curUser.username;
                }
                formContainer.style.display = 'none';
                toggleBtn.textContent = 'Оставить отзыв';

                await loadPropReviews();
                const newSummary = await To2RentApi.getPropertyRatingSummary(prop.id);
                const pillEl = document.getElementById('detailPropRatingPill');
                if (pillEl) {
                    pillEl.innerHTML = `
                        <span class="rating-score">Рейтинг: ${newSummary.averageRating} / 5</span>
                        <span class="rating-count">(${newSummary.reviewsCount} ${getReviewsPlural(newSummary.reviewsCount)})</span>
                    `;
                }
            } catch (err) {
                showToast('Ошибка публикации', err.message || 'Не удалось опубликовать отзыв.', 'error');
            } finally {
                submitBtn.disabled = false;
                submitBtn.textContent = 'Опубликовать отзыв';
            }
        });
    } catch (err) {
        console.warn('Не удалось инициализировать отзывы на странице объекта:', err);
    }
}

// ==========================================================================
// 8. Favorites System (Wishlist, LocalStorage + Backend Sync, Zero Emojis)
// ==========================================================================

function getFavoritesStorageKey() {
    const user = To2RentApi.getCurrentUser();
    return user ? `to2rent_favs_user_${user.id}` : 'to2rent_favs_guest';
}

function getLocalFavoriteIds() {
    try {
        const raw = localStorage.getItem(getFavoritesStorageKey());
        if (!raw) return [];
        const arr = JSON.parse(raw);
        return Array.isArray(arr) ? arr.map(Number).filter(n => !isNaN(n) && n > 0) : [];
    } catch (_) {
        return [];
    }
}

function setLocalFavoriteIds(ids) {
    try {
        const unique = Array.from(new Set(ids.map(Number).filter(n => !isNaN(n) && n > 0)));
        localStorage.setItem(getFavoritesStorageKey(), JSON.stringify(unique));
        updateAllFavoriteButtons();
        updateFavoritesTabCount();
    } catch (_) {}
}

function isPropertyFavorite(propId) {
    const id = Number(propId);
    return getLocalFavoriteIds().includes(id);
}

function updateFavoritesTabCount() {
    const countEl = document.getElementById('userFavoritesCount');
    if (countEl) {
        countEl.textContent = getLocalFavoriteIds().length;
    }
}

async function syncFavoritesWithServer() {
    const user = To2RentApi.getCurrentUser();
    if (!user) {
        updateAllFavoriteButtons();
        updateFavoritesTabCount();
        return;
    }

    try {
        // Migrate any anonymous guest favorites
        const guestRaw = localStorage.getItem('to2rent_favs_guest');
        if (guestRaw) {
            try {
                const guestIds = JSON.parse(guestRaw) || [];
                if (Array.isArray(guestIds) && guestIds.length > 0) {
                    for (const gid of guestIds) {
                        try {
                            await To2RentApi.addFavorite(user.id, gid);
                        } catch (_) {}
                    }
                    localStorage.removeItem('to2rent_favs_guest');
                }
            } catch (_) {}
        }

        // Fetch favorites from backend
        const serverIds = await To2RentApi.getUserFavoriteIds(user.id);
        const combined = Array.from(new Set([...getLocalFavoriteIds(), ...(serverIds || [])]));
        setLocalFavoriteIds(combined);
    } catch (err) {
        console.warn('Синхронизация избранного с сервером:', err);
    } finally {
        updateAllFavoriteButtons();
        updateFavoritesTabCount();
    }
}

async function togglePropertyFavorite(propId, propTitle = '') {
    const id = parseInt(propId, 10);
    if (!id) return;

    const currentIds = getLocalFavoriteIds();
    const isFav = currentIds.includes(id);
    const user = To2RentApi.getCurrentUser();

    if (isFav) {
        const nextIds = currentIds.filter(x => x !== id);
        setLocalFavoriteIds(nextIds);
        showToast('Избранное', propTitle ? `«${propTitle}» удален из избранного.` : 'Объект удален из избранного.', 'info');

        if (user) {
            try {
                await To2RentApi.removeFavorite(user.id, id);
            } catch (err) {
                console.warn('Ошибка удаления из избранного на сервере:', err);
            }
        }
    } else {
        const nextIds = [...currentIds, id];
        setLocalFavoriteIds(nextIds);
        showToast('Избранное', propTitle ? `«${propTitle}» добавлен в избранное.` : 'Объект добавлен в избранное.', 'success');

        if (user) {
            try {
                await To2RentApi.addFavorite(user.id, id);
            } catch (err) {
                console.warn('Ошибка добавления в избранное на сервере:', err);
            }
        }
    }

    updateAllFavoriteButtons();
    updateFavoritesTabCount();

    // If client dashboard favorites pane is open, refresh it
    const favPane = document.getElementById('paneMyFavorites');
    if (favPane && favPane.style.display !== 'none') {
        renderUserFavorites();
    }
}

function updateAllFavoriteButtons() {
    const favIds = getLocalFavoriteIds();
    document.querySelectorAll('.btn-fav-toggle, .btn--favorite').forEach(btn => {
        const id = parseInt(btn.getAttribute('data-prop-id'), 10);
        if (id && favIds.includes(id)) {
            btn.classList.add('is-active');
            btn.textContent = 'В избранном';
        } else {
            btn.classList.remove('is-active');
            btn.textContent = 'В избранное';
        }
    });
}

async function renderUserFavorites() {
    const listContainer = document.getElementById('userFavoritesList');
    if (!listContainer) return;

    const favIds = getLocalFavoriteIds();
    updateFavoritesTabCount();

    if (!favIds || favIds.length === 0) {
        listContainer.innerHTML = `
            <div class="client-empty-favorites">
                <h4>В вашем списке пока нет избранных объектов</h4>
                <p>Добавляйте понравившиеся квартиры и дома в каталог, чтобы быстро вернуться к ним позже.</p>
                <div style="display: flex; gap: 10px; justify-content: center; flex-wrap: wrap;">
                    <a href="/Html-Pages/apartments.html" class="modal-submit-btn" style="width: auto; padding: 8px 20px; text-decoration: none;">Каталог квартир</a>
                    <a href="/Html-Pages/houses.html" class="modal-submit-btn" style="width: auto; padding: 8px 20px; text-decoration: none; background: #333;">Каталог домов</a>
                </div>
            </div>
        `;
        return;
    }

    listContainer.innerHTML = '<div class="client-loading-spinner">Загрузка избранных объектов...</div>';

    try {
        let allProps = [];
        try {
            allProps = await To2RentApi.getProperties();
        } catch (_) {}

        if (!allProps || allProps.length === 0) {
            const apts = await loadApartmentsFromXmlFallback('', '', '', '', '', '');
            const hss = await loadHousesFromXmlFallback('', '', '', '', '', '');
            allProps = [...(apts || []), ...(hss || [])];
        }

        const favProps = allProps.filter(p => favIds.includes(p.id));

        if (favProps.length === 0) {
            listContainer.innerHTML = `
                <div class="client-empty-favorites">
                    <h4>Объекты из избранного не найдены</h4>
                    <p>Возможно, выбранные объекты были сняты с публикации или изменены.</p>
                </div>
            `;
            return;
        }

        let gridHtml = '<div class="client-favorites-grid">';
        favProps.forEach(item => {
            let img = item.image || '';
            if (img && !img.startsWith('../') && !img.startsWith('http') && !img.startsWith('/')) {
                img = '../' + img;
            }
            gridHtml += `
                <div class="client-fav-card">
                    <img src="${img}" alt="${escapeHtml(item.title)}" class="client-fav-card-img" onerror="this.src='../Images/Modern_house.jpg'">
                    <div class="client-fav-card-body">
                        <h4 class="client-fav-card-title">${escapeHtml(item.title)}</h4>
                        <div class="client-fav-card-city">${escapeHtml(item.city || '')}</div>
                        <div class="client-fav-card-price">${formatNumber(item.price)} ${item.currency || '$'} / сутки</div>
                        <div class="client-fav-card-actions">
                            <button type="button" class="modal-submit-btn" onclick="openBookingFromFavorite(${item.id})">Забронировать</button>
                            <button type="button" class="btn-client-cancel" onclick="removeFavoriteFromDashboard(${item.id})">Удалить</button>
                        </div>
                    </div>
                </div>
            `;
        });
        gridHtml += '</div>';

        listContainer.innerHTML = gridHtml;
    } catch (err) {
        listContainer.innerHTML = `<div class="client-empty-favorites"><p>Ошибка загрузки избранного: ${escapeHtml(err.message)}</p></div>`;
    }
}

async function openBookingFromFavorite(propertyId) {
    try {
        const id = parseInt(propertyId, 10);
        let properties = await To2RentApi.getProperties();
        let prop = Array.isArray(properties) ? properties.find(p => p.id === id) : null;
        if (!prop) {
            const apts = await loadApartmentsFromXmlFallback('', '', '', '', '', '');
            const hss = await loadHousesFromXmlFallback('', '', '', '', '', '');
            prop = [...(apts || []), ...(hss || [])].find(p => p.id === id);
        }
        if (prop) {
            closeClientDashboardModal();
            let img = prop.image;
            if (img && !img.startsWith('../') && !img.startsWith('http') && !img.startsWith('/')) {
                img = '../' + img;
            }
            openBookingModal({
                id: prop.id,
                title: prop.title,
                price: prop.price,
                currency: prop.currency || '$',
                image: img
            });
        }
    } catch (err) {
        showToast('Ошибка', 'Не удалось открыть форму бронирования.', 'error');
    }
}

async function removeFavoriteFromDashboard(propertyId) {
    await togglePropertyFavorite(propertyId);
    renderUserFavorites();
}

// Global click delegation for favorites buttons
document.addEventListener('click', (e) => {
    const btn = e.target.closest('.btn-fav-toggle, .btn--favorite');
    if (btn) {
        e.preventDefault();
        e.stopPropagation();
        const propId = parseInt(btn.getAttribute('data-prop-id'), 10);
        const propTitle = btn.getAttribute('data-prop-title') || '';
        if (propId) {
            togglePropertyFavorite(propId, propTitle);
        }
    }
});

// Exports to window
window.showToast = showToast;
window.openBookingModal = openBookingModal;
window.openManagerModal = openManagerModal;
window.openAuthModal = openAuthModal;
window.closeAuthModal = closeAuthModal;
window.renderAuthNavbar = renderAuthNavbar;
window.openClientDashboardModal = openClientDashboardModal;
window.closeClientDashboardModal = closeClientDashboardModal;
window.handleClientCancelBooking = handleClientCancelBooking;
window.togglePropertyFavorite = togglePropertyFavorite;
window.isPropertyFavorite = isPropertyFavorite;
window.renderUserFavorites = renderUserFavorites;
window.openBookingFromFavorite = openBookingFromFavorite;
window.removeFavoriteFromDashboard = removeFavoriteFromDashboard;
window.updateAllFavoriteButtons = updateAllFavoriteButtons;
