// JS/apartments.js - Dynamic & Filterable Apartments Loader

document.addEventListener('DOMContentLoaded', () => {
    const container = document.getElementById('apartmentsContainer');
    if (!container) return;

    // Insert Filter Toolbar above apartmentsContainer
    insertApartmentsToolbar(container);

    // Initial load, reading query params (e.g. ?search=Москва)
    const urlParams = new URLSearchParams(window.location.search);
    const initialSearch = urlParams.get('search') || '';
    if (initialSearch) {
        const searchInput = document.getElementById('filterApartSearch');
        if (searchInput) searchInput.value = initialSearch;
    }

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
                    <option value="">По умолчанию</option>
                    <option value="price_asc">Сначала дешевле</option>
                    <option value="price_desc">Сначала дороже</option>
                    <option value="area_desc">По площади</option>
                </select>
            </div>

            <div class="filter-item" style="justify-content: flex-end;">
                <button type="button" class="btn-filter-reset" id="filterApartResetBtn">Сбросить</button>
            </div>
        </div>

        <div class="catalog-status-bar">
            <div>Найдено квартир: <span class="catalog-count-badge" id="apartmentsCount">0</span></div>
            <div id="filterStatusHint">Нажмите на фото квартиры, чтобы раскрыть подробности</div>
        </div>
    `;

    container.parentNode.insertBefore(toolbar, container);

    // Bind event listeners
    const triggerSearch = debounce(() => loadApartments(), 250);
    document.getElementById('filterApartSearch').addEventListener('input', triggerSearch);
    document.getElementById('filterApartCity').addEventListener('change', () => loadApartments());
    document.getElementById('filterApartRooms').addEventListener('change', () => loadApartments());
    document.getElementById('filterApartMinPrice').addEventListener('input', triggerSearch);
    document.getElementById('filterApartMaxPrice').addEventListener('input', triggerSearch);
    document.getElementById('filterApartSort').addEventListener('change', () => loadApartments());

    document.getElementById('filterApartResetBtn').addEventListener('click', () => {
        document.getElementById('filterApartSearch').value = '';
        document.getElementById('filterApartCity').value = '';
        document.getElementById('filterApartRooms').value = '';
        document.getElementById('filterApartMinPrice').value = '';
        document.getElementById('filterApartMaxPrice').value = '';
        document.getElementById('filterApartSort').value = '';
        loadApartments();
    });
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
        // Normalize image path: if path starts with Images/, prepend ../
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
            <button class="btn btn--appart" type="button">Забронировать</button>
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
        timeout = setTimeout(() => func.apply(this, args), delay);
    };
}