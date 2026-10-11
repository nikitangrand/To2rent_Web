// JS/comments.js - Dynamic Reviews Loader & Submitter (Clean & No Emojis)

document.addEventListener('DOMContentLoaded', () => {
    loadReviews();
    bindReviewForm();
});

async function loadReviews() {
    const listEl = document.querySelector('.review-list');
    if (!listEl) return;

    try {
        const reviews = await To2RentApi.getReviews();
        if (reviews && reviews.length > 0) {
            renderReviewsList(reviews, listEl);
        }
    } catch (err) {
        console.warn('API отзывов недоступен:', err);
    }
}

function renderReviewsList(reviews, listEl) {
    listEl.innerHTML = '';
    reviews.forEach(review => {
        const li = document.createElement('li');
        li.className = 'review';

        const dateStr = formatDateRussian(review.createdAt);

        li.innerHTML = `
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
        const submitBtn = form.querySelector('.submit-btn');

        const author = (nameInput?.value || '').trim();
        const rating = parseInt(ratingInput?.value || '5', 10);
        const comment = (commentInput?.value || '').trim();

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

        try {
            const newReview = await To2RentApi.createReview({
                author,
                rating,
                comment
            });

            const listEl = document.querySelector('.review-list');
            if (listEl) {
                const li = document.createElement('li');
                li.className = 'review';
                li.innerHTML = `
                    <div class="stars">Оценка: ${newReview.rating} из 5</div>
                    <div class="review-header">
                        <span class="author">${escapeHtml(newReview.author)}</span>
                        <span class="date">${formatDateRussian(newReview.createdAt)}</span>
                    </div>
                    <p class="com-text">${escapeHtml(newReview.comment)}</p>
                `;
                listEl.insertBefore(li, listEl.firstChild);
            }

            form.reset();
            showToast('Спасибо за отзыв', 'Отзыв опубликован и добавлен в базу данных.', 'success');
        } catch (err) {
            showToast('Ошибка публикации', err.message || 'Не удалось опубликовать отзыв', 'error');
        } finally {
            submitBtn.disabled = false;
            submitBtn.textContent = 'Отправить';
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
