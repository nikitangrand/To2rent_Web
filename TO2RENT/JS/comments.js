// JS/comments.js - Dynamic Reviews Loader, Property Selector & Filters (Zero Emojis)

let allReviews = [];
let currentFilter = 'all';

document.addEventListener('DOMContentLoaded', () => {
    loadPropertiesSelect();
    loadReviews();
    bindReviewForm();
    bindFilterButtons();
    autoFillAuthorInfo();

    window.addEventListener('to2rent:auth_changed', () => {
        autoFillAuthorInfo();
    });
});

function autoFillAuthorInfo() {
    const user = To2RentApi.getCurrentUser();
    const nameInput = document.getElementById('name');
    if (user && nameInput && !nameInput.value) {
        nameInput.value = user.fullName || user.username;
    }
}

async function loadPropertiesSelect() {
    const select = document.getElementById('reviewProperty');
    if (!select) return;

    try {
        const properties = await To2RentApi.getProperties();
        if (properties && Array.isArray(properties)) {
            properties.forEach(p => {
                const opt = document.createElement('option');
                opt.value = p.id;
                opt.textContent = `${p.title} (${p.city})`;
                select.appendChild(opt);
            });
        }
    } catch (err) {
        console.warn('Не удалось загрузить список объектов для формы:', err);
    }
}

async function loadReviews() {
    const listEl = document.querySelector('.review-list');
    if (!listEl) return;

    listEl.innerHTML = '<li style="text-align: center; padding: 20px; color: #888;">Загрузка отзывов...</li>';

    try {
        const reviews = await To2RentApi.getReviews(true);
        allReviews = Array.isArray(reviews) ? reviews : [];
        applyFilter();
    } catch (err) {
        listEl.innerHTML = '<li style="text-align: center; padding: 20px; color: #888;">Не удалось загрузить отзывы.</li>';
    }
}

function bindFilterButtons() {
    const filterBar = document.getElementById('reviewsFilterBar');
    if (!filterBar) return;

    filterBar.querySelectorAll('.review-filter-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            filterBar.querySelectorAll('.review-filter-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentFilter = btn.getAttribute('data-filter') || 'all';
            applyFilter();
        });
    });
}

function applyFilter() {
    const listEl = document.querySelector('.review-list');
    if (!listEl) return;

    let filtered = allReviews;
    if (currentFilter === 'agency') {
        filtered = allReviews.filter(r => !r.propertyId);
    } else if (currentFilter === 'properties') {
        filtered = allReviews.filter(r => !!r.propertyId);
    }

    renderReviewsList(filtered, listEl);
}

function renderReviewsList(reviews, listEl) {
    listEl.innerHTML = '';

    if (!reviews || reviews.length === 0) {
        listEl.innerHTML = '<li style="text-align: center; padding: 24px; color: #888; background: #c4c4c4; border-radius: 0;">В этой категории пока нет опубликованных отзывов.</li>';
        return;
    }

    reviews.forEach(review => {
        const li = document.createElement('li');
        li.className = 'review';
        li.style.borderRadius = '0';

        const dateStr = formatDateRussian(review.createdAt);
        const propTag = review.propertyTitle 
            ? `<div class="review-prop-tag">Объект: ${escapeHtml(review.propertyTitle)}</div>` 
            : '';

        li.innerHTML = `
            ${propTag}
            <div class="stars">Оценка: ${review.rating} из 5</div>
            <div class="review-header">
                <span class="author">${escapeHtml(review.author)}</span>
                <span class="date">${dateStr}</span>
            </div>
            <p class="com-text">${escapeHtml(review.comment)}</p>
        `;

        listEl.appendChild(li);
    });
}

function bindReviewForm() {
    const form = document.querySelector('.review-form');
    if (!form) return;

    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const nameInput = document.getElementById('name');
        const ratingInput = document.getElementById('rating');
        const commentInput = document.getElementById('comment');
        const propSelect = document.getElementById('reviewProperty');
        const submitBtn = form.querySelector('.submit-btn');

        const author = (nameInput?.value || '').trim();
        const rating = parseInt(ratingInput?.value || '5', 10);
        const comment = (commentInput?.value || '').trim();
        const selectedPropId = propSelect?.value ? parseInt(propSelect.value, 10) : null;
        const selectedPropText = propSelect?.selectedIndex > 0 ? propSelect.options[propSelect.selectedIndex].text : null;

        if (!author) {
            showToast('Внимание', 'Укажите ваше имя', 'error');
            return;
        }

        if (isNaN(rating) || rating < 1 || rating > 5) {
            showToast('Внимание', 'Оценка должна быть числом от 1 до 5', 'error');
            return;
        }

        if (!comment) {
            showToast('Внимание', 'Напишите текст отзыва', 'error');
            return;
        }

        submitBtn.disabled = true;
        submitBtn.textContent = 'Отправка...';

        const user = To2RentApi.getCurrentUser();
        const payload = {
            propertyId: selectedPropId,
            propertyTitle: selectedPropText,
            userId: user?.id || null,
            author,
            rating,
            comment
        };

        try {
            const newReview = await To2RentApi.createReview(payload);
            allReviews.unshift(newReview);
            applyFilter();

            form.reset();
            autoFillAuthorInfo();
            showToast('Спасибо за отзыв', 'Отзыв опубликован и добавлен в базу данных.', 'success');
        } catch (err) {
            showToast('Ошибка публикации', err.message || 'Не удалось опубликовать отзыв', 'error');
        } finally {
            submitBtn.disabled = false;
            submitBtn.textContent = 'Отправить отзыв';
        }
    });
}

function formatDateRussian(isoString) {
    if (!isoString) return 'Сегодня';
    try {
        const d = new Date(isoString);
        return d.toLocaleDateString('ru-RU', {
            day: 'numeric',
            month: 'long',
            year: 'numeric'
        });
    } catch (_) {
        return 'Недавно';
    }
}

function escapeHtml(str) {
    if (!str) return '';
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}
