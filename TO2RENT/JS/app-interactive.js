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

    window.addEventListener('to2rent:auth_changed', () => {
        renderAuthNavbar();
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
            <button type="button" class="btn-nav-logout" id="navLogoutBtn">Выйти</button>
        `;

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
                </div>
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

function openBookingModal(property = {}) {
    initBookingModal();
    currentBookingProperty = property;

    const preview = document.getElementById('bookingPropertyPreview');
    const titleEl = document.getElementById('bookingPropTitle');
    const priceEl = document.getElementById('bookingPropPrice');
    const imgEl = document.getElementById('bookingPropImg');

    if (property && property.title) {
        preview.style.display = 'flex';
        titleEl.textContent = property.title;
        priceEl.textContent = `${formatNumber(property.price || 0)} ${property.currency || '$'} / сутки`;
        imgEl.src = property.image || '../Images/Terr1.jpg';
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

    document.getElementById('bookCheckIn').value = formatDateIso(tomorrow);
    document.getElementById('bookCheckOut').value = formatDateIso(checkOut);
    document.getElementById('bookCheckIn').min = formatDateIso(tomorrow);
    document.getElementById('bookCheckOut').min = formatDateIso(tomorrow);

    updateBookingPriceCalculation();
    bookingModal?.classList.add('active');
}

function closeBookingModal() {
    bookingModal?.classList.remove('active');
}

function updateBookingPriceCalculation() {
    const inVal = document.getElementById('bookCheckIn')?.value;
    const outVal = document.getElementById('bookCheckOut')?.value;
    const totalEl = document.getElementById('bookingTotalPrice');
    const daysEl = document.getElementById('bookingDaysCount');

    if (!inVal || !outVal || !totalEl || !daysEl) return;

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

    const payload = {
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

function escapeHtml(str) {
    if (!str) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

window.showToast = showToast;
window.openBookingModal = openBookingModal;
window.openManagerModal = openManagerModal;
window.openAuthModal = openAuthModal;
window.closeAuthModal = closeAuthModal;
window.renderAuthNavbar = renderAuthNavbar;
