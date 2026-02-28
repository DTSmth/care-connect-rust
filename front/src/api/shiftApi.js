import { api } from './authApi';

export const getAllShifts = () => api.get('/shifts');

export const createShift = (shiftData) => api.post('/shifts', shiftData);

export const deleteShift = (id) => api.delete(`/shifts/${id}`);

export const updateShift = (id, data) => api.put(`/shifts/${id}`, data);