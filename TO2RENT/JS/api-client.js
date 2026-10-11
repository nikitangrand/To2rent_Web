// TO2RENT API Client (With JWT Authentication & Role Management)
const To2RentApi = (() => {
    const getBaseUrl = () => {
        if (window.location.protocol.startsWith('http') && 
            (window.location.port === '5000' || window.location.port === '5001' || window.location.port === '5140')) {
            return window.location.origin;
        }
        return 'http://localhost:5000';
    };

    const API_BASE = getBaseUrl();

    async function request(endpoint, options = {}) {
        const url = `${API_BASE}${endpoint}`;
        const token = localStorage.getItem('to2rent_token');

        const defaultHeaders = {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        };

        if (token) {
            defaultHeaders['Authorization'] = `Bearer ${token}`;
        }

        const config = {
            ...options,
            headers: {
                ...defaultHeaders,
                ...(options.headers || {})
            }
        };

        try {
            const response = await fetch(url, config);
            if (!response.ok) {
                let errorMsg = `Ошибка сервера: ${response.status} ${response.statusText}`;
                try {
                    const errData = await response.json();
                    if (errData && errData.message) errorMsg = errData.message;
                } catch (_) {}
                throw new Error(errorMsg);
            }

            if (response.status === 204) return null;
            return await response.json();
        } catch (error) {
            console.warn(`[API] Ошибка запроса к ${url}:`, error.message);
            throw error;
        }
    }

    return {
        baseUrl: API_BASE,

        // Authentication & User Identity
        async register(data) {
            const res = await request('/api/auth/register', {
                method: 'POST',
                body: JSON.stringify(data)
            });
            if (res && res.token) {
                localStorage.setItem('to2rent_token', res.token);
                localStorage.setItem('to2rent_user', JSON.stringify(res.user));
                window.dispatchEvent(new CustomEvent('to2rent:auth_changed', { detail: res.user }));
            }
            return res;
        },

        async login(usernameOrEmail, password) {
            const res = await request('/api/auth/login', {
                method: 'POST',
                body: JSON.stringify({ usernameOrEmail, password })
            });
            if (res && res.token) {
                localStorage.setItem('to2rent_token', res.token);
                localStorage.setItem('to2rent_user', JSON.stringify(res.user));
                window.dispatchEvent(new CustomEvent('to2rent:auth_changed', { detail: res.user }));
            }
            return res;
        },

        logout() {
            localStorage.removeItem('to2rent_token');
            localStorage.removeItem('to2rent_user');
            window.dispatchEvent(new CustomEvent('to2rent:auth_changed', { detail: null }));
        },

        getCurrentUser() {
            try {
                const raw = localStorage.getItem('to2rent_user');
                return raw ? JSON.parse(raw) : null;
            } catch (_) {
                return null;
            }
        },

        getToken() {
            return localStorage.getItem('to2rent_token');
        },

        isAuthenticated() {
            return !!localStorage.getItem('to2rent_token');
        },

        isAdmin() {
            const u = this.getCurrentUser();
            return u && (u.role === 'Admin' || u.role === 'admin');
        },

        getMe() {
            return request('/api/auth/me');
        },

        getAllUsers() {
            return request('/api/auth/users');
        },

        // Properties
        getProperties(filters = {}) {
            const params = new URLSearchParams();
            if (filters.type) params.append('type', filters.type);
            if (filters.city) params.append('city', filters.city);
            if (filters.minPrice) params.append('minPrice', filters.minPrice);
            if (filters.maxPrice) params.append('maxPrice', filters.maxPrice);
            if (filters.minRooms) params.append('minRooms', filters.minRooms);
            if (filters.maxRooms) params.append('maxRooms', filters.maxRooms);
            if (filters.search) params.append('search', filters.search);
            if (filters.sort) params.append('sort', filters.sort);

            const queryString = params.toString() ? `?${params.toString()}` : '';
            return request(`/api/properties${queryString}`);
        },

        getProperty(id) {
            return request(`/api/properties/${id}`);
        },

        getPopularProperties() {
            return request('/api/properties/popular');
        },

        getFeaturedProperty() {
            return request('/api/properties/featured');
        },

        createProperty(data) {
            return request('/api/properties', {
                method: 'POST',
                body: JSON.stringify(data)
            });
        },

        updateProperty(id, data) {
            return request(`/api/properties/${id}`, {
                method: 'PUT',
                body: JSON.stringify(data)
            });
        },

        deleteProperty(id) {
            return request(`/api/properties/${id}`, {
                method: 'DELETE'
            });
        },

        // Bookings
        getBookings(status = null) {
            const endpoint = status ? `/api/bookings?status=${encodeURIComponent(status)}` : '/api/bookings';
            return request(endpoint);
        },

        getBooking(id) {
            return request(`/api/bookings/${id}`);
        },

        createBooking(data) {
            return request('/api/bookings', {
                method: 'POST',
                body: JSON.stringify(data)
            });
        },

        getBookedDates(propertyId) {
            return request(`/api/properties/${propertyId}/booked-dates`);
        },

        updateBookingStatus(id, status) {
            return request(`/api/bookings/${id}/status`, {
                method: 'PATCH',
                body: JSON.stringify({ status })
            });
        },

        deleteBooking(id) {
            return request(`/api/bookings/${id}`, {
                method: 'DELETE'
            });
        },

        getUserBookings(userId, email = null, phone = null) {
            const params = new URLSearchParams();
            if (email) params.append('email', email);
            if (phone) params.append('phone', phone);
            const qs = params.toString() ? `?${params.toString()}` : '';
            return request(`/api/bookings/user/${userId}${qs}`);
        },

        cancelBooking(id, userId = null) {
            const qs = userId ? `?userId=${userId}` : '';
            return request(`/api/bookings/${id}/cancel${qs}`, {
                method: 'POST'
            });
        },

        updateProfile(data, userId = null) {
            const qs = userId ? `?userId=${userId}` : '';
            return request(`/api/auth/profile${qs}`, {
                method: 'PUT',
                body: JSON.stringify(data)
            });
        },

        // Reviews
        getReviews(onlyApproved = true) {
            return request(`/api/reviews?onlyApproved=${onlyApproved}`);
        },

        createReview(data) {
            return request('/api/reviews', {
                method: 'POST',
                body: JSON.stringify(data)
            });
        },

        updateReviewStatus(id, isApproved) {
            return request(`/api/reviews/${id}/status`, {
                method: 'PATCH',
                body: JSON.stringify({ isApproved })
            });
        },

        deleteReview(id) {
            return request(`/api/reviews/${id}`, {
                method: 'DELETE'
            });
        },

        // Inquiries / Contacts
        getInquiries(status = null) {
            const endpoint = status ? `/api/inquiries?status=${encodeURIComponent(status)}` : '/api/inquiries';
            return request(endpoint);
        },

        createInquiry(data) {
            return request('/api/inquiries', {
                method: 'POST',
                body: JSON.stringify(data)
            });
        },

        updateInquiryStatus(id, status) {
            return request(`/api/inquiries/${id}/status`, {
                method: 'PATCH',
                body: JSON.stringify({ status })
            });
        },

        deleteInquiry(id) {
            return request(`/api/inquiries/${id}`, {
                method: 'DELETE'
            });
        },

        // Statistics
        getStats() {
            return request('/api/stats');
        }
    };
})();

window.To2RentApi = To2RentApi;
