// JS/houses.js - Dynamic & Filterable Houses Loader

document.addEventListener('DOMContentLoaded', () => {
    const container = document.getElementById('housesContainer');
    if (!container) return;

    // Insert Filter Toolbar above housesContainer
    insertHousesToolbar(container);

    // Initial load, reading query params
    const urlParams = new URLSearchParams(window.location.search);
    const initialSearch = urlParams.get('search') || '';
    if (initialSearch) {
        const searchInput = document.getElementById('filterHouseSearch');
        if (searchInput) searchInput.value = initialSearch;
    }

    loadHouses();
});

function insertHousesToolbar(container) {
    const toolbar = document.createElement('div');
    toolbar.className = 'catalog-toolbar';
    toolbar.innerHTML = `
        <div class="filter-grid">
            <div class="filter-item">
                <label class="filter-label" for="filterHouseSearch">Поиск по названию или городу</label>
                <input type="text" id="filterHouseSearch" class="filter-control" placeholder="Например: Коттедж, Modern, Лондон...">
            </div>

            <div class="filter-item">
                <label class="filter-label" for="filterHouseCity">Город</label>
                <select id="filterHouseCity" class="filter-control">
                    <option value="">Все города</option>
                    <option value="Москва">Москва</option>
                    <option value="Минск">Минск</option>
                    <option value="Лондон">Лондон</option>
                    <option value="Лос Анджелес">Лос Анджелес</option>
                </select>
            </div>

            <div class="filter-item">
                <label class="filter-label" for="filterHouseFloors">Количество этажей</label>
                <select id="filterHouseFloors" class="filter-control">
                    <option value="">Любое</option>
                    <option value="2">2 этажа</option>
                    <option value="3">3 этажа</option>
                </select>
            </div>

            <div class="filter-item">
                <label class="filter-label">Цена ($)</label>
                <div class="price-inputs-row">
                    <input type="number" id="filterHouseMinPrice" class="filter-control" placeholder="От">
                    <span>—</span>
                    <input type="number" id="filterHouseMaxPrice" class="filter-control" placeholder="До">
                </div>
            </div>

            <div class="filter-item">
                <label class="filter-label" for="filterHouseSort">Сортировка</label>
                <select id="filterHouseSort" class="filter-control">
                    <option value="">По умолчанию</option>
                    <option value="price_asc">Сначала дешевле</option>
                    <option value="price_desc">Сначала дороже</option>
                    <option value="area_desc">По площади участка</option>
                </select>
            </div>

            <div class="filter-item" style="justify-content: flex-end;">
                <button type="button" class="btn-filter-reset" id="filterHouseResetBtn">Сбросить</button>
            </div>
        </div>

        <div class="catalog-status-bar">
            <div>Найдено домов и коттеджей: <span class="catalog-count-badge" id="housesCount">0</span></div>
            <div id="filterHouseStatusHint">Нажмите на фото коттеджа, чтобы раскрыть подробности</div>
        </div>
    `;

    container.parentNode.insertBefore(toolbar, container);

    // Bind event listeners
    const triggerSearch = debounce(() => loadHouses(), 250);
    document.getElementById('filterHouseSearch').addEventListener('input', triggerSearch);
    document.getElementById('filterHouseCity').addEventListener('change', () => loadHouses());
    document.getElementById('filterHouseFloors').addEventListener('change', () => loadHouses());
    document.getElementById('filterHouseMinPrice').addEventListener('input', triggerSearch);
    document.getElementById('filterHouseMaxPrice').addEventListener('input', triggerSearch);
    document.getElementById('filterHouseSort').addEventListener('change', () => loadHouses());

    document.getElementById('filterHouseResetBtn').addEventListener('click', () => {
        document.getElementById('filterHouseSearch').value = '';
        document.getElementById('filterHouseCity').value = '';
        document.getElementById('filterHouseFloors').value = '';
        document.getElementById('filterHouseMinPrice').value = '';
        document.getElementById('filterHouseMaxPrice').value = '';
        document.getElementById('filterHouseSort').value = '';
        loadHouses();
    });
}

async function loadHouses() {
    const container = document.getElementById('housesContainer');
    const countEl = document.getElementById('housesCount');
    if (!container) return;

    const search = document.getElementById('filterHouseSearch')?.value.trim() || '';
    const city = document.getElementById('filterHouseCity')?.value || '';
    const floors = document.getElementById('filterHouseFloors')?.value || '';
    const minPrice = document.getElementById('filterHouseMinPrice')?.value || '';
    const maxPrice = document.getElementById('filterHouseMaxPrice')?.value || '';
    const sort = document.getElementById('filterHouseSort')?.value || '';

    let items = [];

    // Fetch from C# API
    try {
        const filters = {
            type: 'house',
            search: search || undefined,
            city: city || undefined,
            minPrice: minPrice ? parseFloat(minPrice) : undefined,
            maxPrice: maxPrice ? parseFloat(maxPrice) : undefined,
            sort: sort || undefined
        };

        items = await To2RentApi.getProperties(filters);

        if (floors) {
            const fNum = parseInt(floors, 10);
            items = items.filter(x => x.floors === fNum);
        }
    } catch (apiErr) {
        console.warn('API недоступен, загрузка данных из XML:', apiErr);
        items = await loadHousesFromXmlFallback(search, city, floors, minPrice, maxPrice, sort);
    }

    renderHousesList(items, container, countEl);
}

function renderHousesList(items, container, countEl) {
    container.innerHTML = '';
    if (countEl) countEl.textContent = items.length;

    if (!items || items.length === 0) {
        container.innerHTML = `
            <div class="empty-catalog-message">
                <h3>Дома и коттеджи по вашему запросу не найдены</h3>
                <p>Попробуйте изменить параметры фильтра или сбросить условия поиска.</p>
                <button class="btn" onclick="document.getElementById('filterHouseResetBtn').click()">Сбросить фильтры</button>
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
                    <h3 class="price">${formatNumber(item.price)} ${item.currency || '$'}</h3>
                    <p class="description">${escapeHtml(item.description)}</p>
                    <p>Этажи: ${item.floors || 2}</p>
                    <p>Участок: ${item.landArea || item.area || 400} м²</p>
                    <a href="${detailLink}">
                        <button class="btn--description">Подробнее</button>
                    </a>
                </div>
            </div>
            <button class="btn btn--appart" type="button">Забронировать</button>
        `;

        // Image toggle animation
        const imgEl = card.querySelector('.card-image');
        imgEl.addEventListener('click', () => {
            card.classList.toggle('active');
        });

        // Booking modal
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

// Fallback loader from XML
async function loadHousesFromXmlFallback(search, city, floors, minPrice, maxPrice, sort) {
    try {
        const response = await fetch('../Xml/houses.xml');
        const xmlText = await response.text();
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(xmlText, 'text/xml');

        let list = [];
        xmlDoc.querySelectorAll('house').forEach(item => {
            list.push({
                id: parseInt(item.getAttribute('id') || '0', 10),
                title: item.querySelector('title')?.textContent || '',
                type: 'house',
                city: item.querySelector('title')?.textContent.replace('Коттедж', '').replace('Modern', '').replace('Семейный', '').replace('Стандарт', '').replace('Элитный', '').trim() || '',
                image: item.querySelector('image')?.textContent || '',
                price: parseFloat(item.querySelector('price')?.textContent || '0'),
                currency: item.querySelector('price')?.getAttribute('currency') || '$',
                description: item.querySelector('description')?.textContent || '',
                detailLink: item.querySelector('detailLink')?.textContent || '',
                floors: parseInt(item.querySelector('floors')?.textContent || '2', 10),
                landArea: parseInt(item.querySelector('land_area')?.textContent || '400', 10)
            });
        });

        if (search) {
            const s = search.toLowerCase();
            list = list.filter(x => x.title.toLowerCase().includes(s) || x.description.toLowerCase().includes(s));
        }
        if (city) {
            list = list.filter(x => x.city.toLowerCase().includes(city.toLowerCase()) || x.title.toLowerCase().includes(city.toLowerCase()));
        }
        if (floors) {
            list = list.filter(x => x.floors === parseInt(floors, 10));
        }
        if (minPrice) {
            list = list.filter(x => x.price >= parseFloat(minPrice));
        }
        if (maxPrice) {
            list = list.filter(x => x.price <= parseFloat(maxPrice));
        }
        if (sort === 'price_asc') list.sort((a, b) => a.price - b.price);
        if (sort === 'price_desc') list.sort((a, b) => b.price - a.price);
        if (sort === 'area_desc') list.sort((a, b) => (b.landArea || 0) - (a.landArea || 0));

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