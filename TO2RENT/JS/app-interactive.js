// TO2RENT Global Interactive Features (Modals, Toasts, Forms, Bookings) - Clean & No Emojis

document.addEventListener('DOMContentLoaded', () => {
    initToastContainer();
    initBookingModal();
    initManagerModal();
    bindGlobalButtons();
    bindSearchForm();
    bindFooterForms();
    highlightCurrentNavLink();
});

// ==========================================================================
// Toast Notifications (Zero Emojis)
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
// Booking Modal System
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
                        <input type="email" id="bookClientEmail" class="input-field" placeholder="client@mail.ru">
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
                        <textarea id="bookNotes" class="input-field" placeholder="Время прибытия, детская кроватка, парковка..."></textarea>
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
    closeBtn.addEventListener('click', closeBookingModal);

    bookingModal.addEventListener('click', (e) => {
        if (e.target === bookingModal) closeBookingModal();
    });

    const inInput = document.getElementById('bookCheckIn');
    const outInput = document.getElementById('bookCheckOut');
    inInput.addEventListener('change', updateBookingPriceCalculation);
    outInput.addEventListener('change', updateBookingPriceCalculation);

    const form = document.getElementById('bookingForm');
    form.addEventListener('submit', handleBookingSubmit);
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
        priceEl.textContent = `${formatNumber(property.price || 0)} ${property.currency || '$'}`;
        imgEl.src = property.image || '../Images/Terr1.jpg';
    } else {
        preview.style.display = 'none';
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
    bookingModal.classList.add('active');
}

function closeBookingModal() {
    if (bookingModal) {
        bookingModal.classList.remove('active');
    }
}

function updateBookingPriceCalculation() {
    const inVal = document.getElementById('bookCheckIn').value;
    const outVal = document.getElementById('bookCheckOut').value;
    const totalEl = document.getElementById('bookingTotalPrice');
    const daysEl = document.getElementById('bookingDaysCount');

    if (!inVal || !outVal) return;

    const inDate = new Date(inVal);
    const outDate = new Date(outVal);

    let days = Math.round((outDate - inDate) / (1000 * 60 * 60 * 24));
    if (days <= 0) days = 1;

    daysEl.textContent = `За ${days} ${getDaysPlural(days)}`;

    let baseRate = 350;
    if (currentBookingProperty && currentBookingProperty.price) {
        baseRate = Math.max(150, Math.round(currentBookingProperty.price / 30));
    }

    const total = baseRate * days;
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
// Manager Contact Modal System
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
                        <input type="text" id="managerClientName" class="input-field" placeholder="Александр" required>
                    </div>

                    <div class="form-group-full">
                        <label class="input-label" for="managerContactInfo">Телефон или Email *</label>
                        <input type="text" id="managerContactInfo" class="input-field" placeholder="+7 (999) 123-45-67" required>
                    </div>

                    <div class="form-group-full">
                        <label class="input-label" for="managerClientMessage">Вопрос или пожелание *</label>
                        <textarea id="managerClientMessage" class="input-field" placeholder="Здравствуйте, интересует аренда апартаментов в Москве..." required></textarea>
                    </div>
                </div>

                <button type="submit" class="modal-submit-btn" id="managerSubmitBtn">Отправить запрос</button>
            </form>
        </div>
    </div>`;

    document.body.insertAdjacentHTML('beforeend', modalMarkup);
    managerModal = document.getElementById('managerModalOverlay');

    const closeBtn = document.getElementById('managerModalClose');
    closeBtn.addEventListener('click', closeManagerModal);

    managerModal.addEventListener('click', (e) => {
        if (e.target === managerModal) closeManagerModal();
    });

    const form = document.getElementById('managerForm');
    form.addEventListener('submit', handleManagerSubmit);
}

function openManagerModal(managerName = 'Менеджер TO2RENT') {
    initManagerModal();
    currentManagerName = managerName;
    document.getElementById('managerModalTitle').textContent = `Связаться: ${managerName}`;
    managerModal.classList.add('active');
}

function closeManagerModal() {
    if (managerModal) {
        managerModal.classList.remove('active');
    }
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
// Button Bindings
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
            showToast('Поиск', 'Введите название города для поиска', 'info');
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

            try {
                await To2RentApi.createInquiry({
                    name: 'Клиент сайта',
                    contactInfo: 'Форма обратной связи',
                    message: message,
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
