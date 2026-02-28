import axios from 'axios';

export const api = axios.create({
    baseURL: 'http://localhost:9000'
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
