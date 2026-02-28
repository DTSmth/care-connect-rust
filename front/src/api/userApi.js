import { api } from './authApi';

export const getAllUsers = () => api.get('/users');
