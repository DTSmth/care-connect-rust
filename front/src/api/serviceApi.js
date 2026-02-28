import { api } from './authApi';

export const getAllServices = () => api.get('/services');