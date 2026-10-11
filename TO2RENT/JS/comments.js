// JS/comments.js - Dynamic Reviews Loader & Submitter

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
        console.warn('API отзывов недоступен, остаются предустановленные отзывы:', err);
    }
}

function renderReviewsList(reviews, listEl) {
    listEl.innerHTML = '';
    reviews.forEach(review => {
        const li = document.createElement('li');
        li.className = 'review';
        
        const starsText = getStarRating(review.rating);
        const dateStr = formatDateRussian(review.createdAt);

        li.innerHTML = `
            <div class="stars">${starsText}</div>
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
            showToast('Внимание', 'Пожалуйста, укажите ваше имя', 'error');
            return;
        }

        if (isNaN(rating) || rating < 1 || rating > 5) {
            showToast('Внимание', 'Оценка должна быть числом от 1 до 5', 'error');
            return;
        }

        if (!comment) {
            showToast('Внимание', 'Пожалуйста, напишите текст отзыва', 'error');
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

            // Prepend new review to the list immediately
            const listEl = document.querySelector('.review-list');
            if (listEl) {
                const li = document.createElement('li');
                li.className = 'review';
                li.style.animation = 'fadeIn 0.5s ease';
                li.innerHTML = `
                    <div class="stars">${getStarRating(newReview.rating)}</div>
                    <div class="review-header">
                        <span class="author">${escapeHtml(newReview.author)}</span>
                        <span class="date">${formatDateRussian(newReview.createdAt)}</span>
                    </div>
                    <p class="com-text">${escapeHtml(newReview.comment)}</p>
                `;
                listEl.insertBefore(li, listEl.firstChild);
            }

            form.reset();
            showToast('Спасибо за отзыв!', 'Ваш отзыв успешно опубликован и добавлен в базу.', 'success');
        } catch (err) {
            showToast('Ошибка публикации', err.message || 'Не удалось опубликовать отзыв', 'error');
        } finally {
            submitBtn.disabled = false;
            submitBtn.textContent = 'Отправить';
        }
    });
}

function getStarRating(rating) {
    const r = Math.max(1, Math.min(5, Math.round(rating || 5)));
    return '★'.repeat(r) + '☆'.repeat(5 - r);
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
