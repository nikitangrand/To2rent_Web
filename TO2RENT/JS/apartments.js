// JS/apartments.js - Dynamic & Filterable Apartments Loader (Search, Sort, Quick Tags, URL Sync) - Zero Emojis

document.addEventListener('DOMContentLoaded', () => {
    const container = document.getElementById('apartmentsContainer');
    if (!container) return;

    // Insert Filter Toolbar above apartmentsContainer
    insertApartmentsToolbar(container);

    // Initial load, reading query params
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('search')) {
        const searchInput = document.getElementById('filterApartSearch');
        if (searchInput) searchInput.value = urlParams.get('search');
    }
    if (urlParams.get('city')) {
        const citySelect = document.getElementById('filterApartCity');
        if (citySelect) citySelect.value = urlParams.get('city');
    }
    if (urlParams.get('rooms')) {
        const roomsSelect = document.getElementById('filterApartRooms');
        if (roomsSelect) roomsSelect.value = urlParams.get('rooms');
    }
    if (urlParams.get('minPrice')) {
        const minPriceInput = document.getElementById('filterApartMinPrice');
        if (minPriceInput) minPriceInput.value = urlParams.get('minPrice');
    }
    if (urlParams.get('maxPrice')) {
        const maxPriceInput = document.getElementById('filterApartMaxPrice');
        if (maxPriceInput) maxPriceInput.value = urlParams.get('maxPrice');
    }
    if (urlParams.get('sort')) {
        const sortSelect = document.getElementById('filterApartSort');
        if (sortSelect) sortSelect.value = urlParams.get('sort');
    }

    syncApartmentQuickTagChips();
    loadApartments();
});

function insertApartmentsToolbar(container) {
    const toolbar = document.createElement('div');
    toolbar.className = 'catalog-toolbar';
    toolbar.innerHTML = `
        <div class="filter-grid">
            <div class="filter-item">
                <label class="filter-label" for="filterApartSearch">Поиск по названию или городу</label>
                <input type="text" id="filterApartSearch" class="filter-control" placeholder="Например: Москва, Бибирево, 8 комнат...">
            </div>

            <div class="filter-item">
                <label class="filter-label" for="filterApartCity">Город</label>
                <select id="filterApartCity" class="filter-control">
                    <option value="">Все города</option>
                    <option value="Москва">Москва</option>
                    <option value="Минск">Минск</option>
                    <option value="Лондон">Лондон</option>
                    <option value="Лос Анджелес">Лос Анджелес</option>
                </select>
            </div>

            <div class="filter-item">
                <label class="filter-label" for="filterApartRooms">Количество комнат</label>
                <select id="filterApartRooms" class="filter-control">
                    <option value="">Любое</option>
                    <option value="1">1 комната</option>
                    <option value="2">2 комнаты</option>
                    <option value="6">6 комнат</option>
                    <option value="8">8 комнат</option>
                </select>
            </div>

            <div class="filter-item">
                <label class="filter-label">Цена ($)</label>
                <div class="price-inputs-row">
                    <input type="number" id="filterApartMinPrice" class="filter-control" placeholder="От">
                    <span>—</span>
                    <input type="number" id="filterApartMaxPrice" class="filter-control" placeholder="До">
                </div>
            </div>

            <div class="filter-item">
                <label class="filter-label" for="filterApartSort">Сортировка</label>
                <select id="filterApartSort" class="filter-control">
                    <option value="">По умолчанию (Новые)</option>
                    <option value="price_asc">Сначала дешевле</option>
                    <option value="price_desc">Сначала дороже</option>
                    <option value="area_desc">По площади (Больше)</option>
                    <option value="area_asc">По площади (Меньше)</option>
                    <option value="title_asc">По названию (А — Я)</option>
                </select>
            </div>

            <div class="filter-item" style="justify-content: flex-end;">
                <button type="button" class="btn-filter-reset" id="filterApartResetBtn">Сбросить</button>
            </div>
        </div>

        <div class="quick-tags-row" id="apartQuickTagsRow">
            <span class="quick-tags-label">Быстрый выбор:</span>
            <button type="button" class="quick-tag-chip active" data-type="city" data-val="">Все города</button>
            <button type="button" class="quick-tag-chip" data-type="city" data-val="Москва">Москва</button>
            <button type="button" class="quick-tag-chip" data-type="city" data-val="Минск">Минск</button>
            <button type="button" class="quick-tag-chip" data-type="city" data-val="Лондон">Лондон</button>
            <button type="button" class="quick-tag-chip" data-type="city" data-val="Лос Анджелес">Лос Анджелес</button>
            <span class="quick-tags-separator">|</span>
            <button type="button" class="quick-tag-chip" data-type="price-range" data-min="" data-max="500">До 500 $</button>
            <button type="button" class="quick-tag-chip" data-type="price-range" data-min="500" data-max="1000">500 — 1000 $</button>
            <button type="button" class="quick-tag-chip" data-type="price-range" data-min="1000" data-max="">От 1000 $</button>
            <span class="quick-tags-separator">|</span>
            <button type="button" class="quick-tag-chip" data-type="rooms" data-val="1">1 комн.</button>
            <button type="button" class="quick-tag-chip" data-type="rooms" data-val="2">2 комн.</button>
            <button type="button" class="quick-tag-chip" data-type="rooms" data-val="6">6+ комн.</button>
        </div>

        <div class="catalog-status-bar">
            <div>Найдено квартир: <span class="catalog-count-badge" id="apartmentsCount">0</span></div>
            <div id="filterStatusHint">Нажмите на фото квартиры, чтобы раскрыть подробности</div>
        </div>
    `;

    container.parentNode.insertBefore(toolbar, container);

    // Bind event listeners
    const triggerSearch = debounce(() => {
        syncApartmentQuickTagChips();
        loadApartments();
    }, 250);

    document.getElementById('filterApartSearch').addEventListener('input', triggerSearch);
    document.getElementById('filterApartCity').addEventListener('change', () => {
        syncApartmentQuickTagChips();
        loadApartments();
    });
    document.getElementById('filterApartRooms').addEventListener('change', () => {
        syncApartmentQuickTagChips();
        loadApartments();
    });
    document.getElementById('filterApartMinPrice').addEventListener('input', triggerSearch);
    document.getElementById('filterApartMaxPrice').addEventListener('input', triggerSearch);
    document.getElementById('filterApartSort').addEventListener('change', () => loadApartments());

    // Quick tag chips binding
    document.querySelectorAll('#apartQuickTagsRow .quick-tag-chip').forEach(chip => {
        chip.addEventListener('click', () => {
            const type = chip.getAttribute('data-type');
            if (type === 'city') {
                const val = chip.getAttribute('data-val') || '';
                document.getElementById('filterApartCity').value = val;
            } else if (type === 'rooms') {
                const val = chip.getAttribute('data-val') || '';
                document.getElementById('filterApartRooms').value = val;
            } else if (type === 'price-range') {
                const min = chip.getAttribute('data-min') || '';
                const max = chip.getAttribute('data-max') || '';
                document.getElementById('filterApartMinPrice').value = min;
                document.getElementById('filterApartMaxPrice').value = max;
            }
            syncApartmentQuickTagChips();
            loadApartments();
        });
    });

    document.getElementById('filterApartResetBtn').addEventListener('click', () => {
        document.getElementById('filterApartSearch').value = '';
        document.getElementById('filterApartCity').value = '';
        document.getElementById('filterApartRooms').value = '';
        document.getElementById('filterApartMinPrice').value = '';
        document.getElementById('filterApartMaxPrice').value = '';
        document.getElementById('filterApartSort').value = '';
        syncApartmentQuickTagChips();
        loadApartments();
    });
}

function syncApartmentQuickTagChips() {
    const curCity = document.getElementById('filterApartCity')?.value || '';
    const curRooms = document.getElementById('filterApartRooms')?.value || '';
    const curMin = document.getElementById('filterApartMinPrice')?.value || '';
    const curMax = document.getElementById('filterApartMaxPrice')?.value || '';

    document.querySelectorAll('#apartQuickTagsRow .quick-tag-chip').forEach(chip => {
        const type = chip.getAttribute('data-type');
        chip.classList.remove('active');
        if (type === 'city') {
            if (chip.getAttribute('data-val') === curCity) chip.classList.add('active');
        } else if (type === 'rooms') {
            if (chip.getAttribute('data-val') === curRooms) chip.classList.add('active');
        } else if (type === 'price-range') {
            const min = chip.getAttribute('data-min') || '';
            const max = chip.getAttribute('data-max') || '';
            if (min === curMin && max === curMax) chip.classList.add('active');
        }
    });
}

function updateApartmentsUrlParams(search, city, rooms, minPrice, maxPrice, sort) {
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    if (city) params.set('city', city);
    if (rooms) params.set('rooms', rooms);
    if (minPrice) params.set('minPrice', minPrice);
    if (maxPrice) params.set('maxPrice', maxPrice);
    if (sort) params.set('sort', sort);
    const newUrl = `${window.location.pathname}${params.toString() ? '?' + params.toString() : ''}`;
    window.history.replaceState({}, '', newUrl);
}

async function loadApartments() {
    const container = document.getElementById('apartmentsContainer');
    const countEl = document.getElementById('apartmentsCount');
    if (!container) return;

    const search = document.getElementById('filterApartSearch')?.value.trim() || '';
    const city = document.getElementById('filterApartCity')?.value || '';
    const rooms = document.getElementById('filterApartRooms')?.value || '';
    const minPrice = document.getElementById('filterApartMinPrice')?.value || '';
    const maxPrice = document.getElementById('filterApartMaxPrice')?.value || '';
    const sort = document.getElementById('filterApartSort')?.value || '';

    updateApartmentsUrlParams(search, city, rooms, minPrice, maxPrice, sort);

    let items = [];

    // Try fetching from C# backend API
    try {
        const filters = {
            type: 'apartment',
            search: search || undefined,
            city: city || undefined,
            minRooms: rooms ? parseInt(rooms, 10) : undefined,
            maxRooms: rooms ? parseInt(rooms, 10) : undefined,
            minPrice: minPrice ? parseFloat(minPrice) : undefined,
            maxPrice: maxPrice ? parseFloat(maxPrice) : undefined,
            sort: sort || undefined
        };

        items = await To2RentApi.getProperties(filters);
    } catch (apiErr) {
        console.warn('API недоступен, загрузка данных из XML:', apiErr);
        items = await loadApartmentsFromXmlFallback(search, city, rooms, minPrice, maxPrice, sort);
    }

    renderApartmentsList(items, container, countEl);
}

function renderApartmentsList(items, container, countEl) {
    container.innerHTML = '';
    if (countEl) countEl.textContent = items.length;

    if (!items || items.length === 0) {
        container.innerHTML = `
            <div class="empty-catalog-message">
                <h3>Квартиры по вашему запросу не найдены</h3>
                <p>Попробуйте изменить параметры фильтра или сбросить условия поиска.</p>
                <button class="btn" onclick="document.getElementById('filterApartResetBtn').click()">Сбросить фильтры</button>
            </div>
        `;
        return;
    }

    items.forEach(item => {
        let imgPath = item.image;
        if (!imgPath.startsWith('../') && !imgPath.startsWith('http')) {
            imgPath = '../' + imgPath.replace(/^\/+/, '');
        }

        const detailLink = item.detailLink || '#';
        const card = document.createElement('div');
        card.className = 'appart--card';
        card.innerHTML = `
            <h2>${escapeHtml(item.title)}</h2>
            <div class="card-content">
                <img src="${imgPath}" alt="${escapeHtml(item.title)}" class="card-image" loading="lazy">
                <div class="card-info">
                    <h3 class="price">${formatNumber(item.price)} ${item.currency || '$'} <span style="font-size: 14px; font-weight: normal; color: #777;">/ сутки</span></h3>
                    <p class="description">${escapeHtml(item.description)}</p>
                    <p>Комнат: ${item.rooms}</p>
                    <p>Площадь: ${item.area} м²</p>
                    <a href="${detailLink}">
                        <button class="btn--description">Подробнее</button>
                    </a>
                </div>
            </div>
            <div style="display: flex; gap: 8px; width: 100%;">
                <button class="btn btn--appart" type="button" style="flex: 1;">Забронировать</button>
                <button class="btn btn-fav-toggle ${window.isPropertyFavorite && window.isPropertyFavorite(item.id) ? 'is-active' : ''}" type="button" data-prop-id="${item.id}" data-prop-title="${escapeHtml(item.title)}">${window.isPropertyFavorite && window.isPropertyFavorite(item.id) ? 'В избранном' : 'В избранное'}</button>
            </div>
        `;

        // Image click toggle animation
        const imgEl = card.querySelector('.card-image');
        imgEl.addEventListener('click', () => {
            card.classList.toggle('active');
        });

        // Booking button click
        const bookBtn = card.querySelector('.btn--appart');
        bookBtn.addEventListener('click', () => {
            openBookingModal({
                id: item.id,
                title: item.title,
                price: item.price,
                currency: item.currency || '$',
                image: imgPath
            });
        });

        container.appendChild(card);
    });

    if (window.updateAllFavoriteButtons) {
        window.updateAllFavoriteButtons();
    }
}

// Fallback loader from XML if backend is offline
async function loadApartmentsFromXmlFallback(search, city, rooms, minPrice, maxPrice, sort) {
    try {
        const response = await fetch('../Xml/apartments.xml');
        const xmlText = await response.text();
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(xmlText, 'text/xml');

        let list = [];
        xmlDoc.querySelectorAll('apartment').forEach(item => {
            list.push({
                id: parseInt(item.getAttribute('id') || '0', 10),
                title: item.querySelector('title')?.textContent || '',
                type: 'apartment',
                city: item.querySelector('title')?.textContent.replace('Апартаменты', '').trim() || '',
                image: item.querySelector('image')?.textContent || '',
                price: parseFloat(item.querySelector('price')?.textContent || '0'),
                currency: item.querySelector('price')?.getAttribute('currency') || '$',
                description: item.querySelector('description')?.textContent || '',
                detailLink: item.querySelector('detailLink')?.textContent || '',
                rooms: parseInt(item.querySelector('rooms')?.textContent || '0', 10),
                area: parseInt(item.querySelector('area')?.textContent || '0', 10)
            });
        });

        if (search) {
            const s = search.toLowerCase();
            list = list.filter(x => x.title.toLowerCase().includes(s) || x.description.toLowerCase().includes(s));
        }
        if (city) {
            list = list.filter(x => x.city.toLowerCase().includes(city.toLowerCase()) || x.title.toLowerCase().includes(city.toLowerCase()));
        }
        if (rooms) {
            list = list.filter(x => x.rooms === parseInt(rooms, 10));
        }
        if (minPrice) {
            list = list.filter(x => x.price >= parseFloat(minPrice));
        }
        if (maxPrice) {
            list = list.filter(x => x.price <= parseFloat(maxPrice));
        }
        if (sort === 'price_asc') list.sort((a, b) => a.price - b.price);
        if (sort === 'price_desc') list.sort((a, b) => b.price - a.price);
        if (sort === 'area_desc') list.sort((a, b) => b.area - a.area);
        if (sort === 'area_asc') list.sort((a, b) => a.area - b.area);
        if (sort === 'title_asc') list.sort((a, b) => a.title.localeCompare(b.title, 'ru'));

        return list;
    } catch (e) {
        console.error('Ошибка загрузки XML:', e);
        return [];
    }
}

function debounce(func, delay) {
    let timeout;
    return (...args) => {
        clearTimeout(timeout);
        timeout = setTimeout(() => func(...args), delay);
    };
}