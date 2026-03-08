import axios from 'axios';

export const api = axios.create({
    // In production (same-origin), VITE_API_URL is empty so requests go to /login, /shifts etc.
    // In local dev, set VITE_API_URL=http://localhost:9000 in front/.env
    baseURL: import.meta.env.VITE_API_URL ?? ''
});

api.interceptors.request.use(config => {
    const token = localStorage.getItem('token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

export function loginRequest(credentials) {
    return api.post('/login', credentials);
}
