import { api } from './authApi';

export const getAllEmployees    = () => api.get('/employees');
export const getEmployeeById   = (id) => api.get(`/employees/${id}`);
export const createEmployee    = (data) => api.post('/employees', data);
export const updateEmployee    = (id, data) => api.put(`/employees/${id}`, data);
export const deleteEmployee    = (id) => api.delete(`/employees/${id}`);

export const getPreferences    = (id) => api.get(`/employees/${id}/preferences`);
export const upsertPreferences = (id, data) => api.put(`/employees/${id}/preferences`, data);
export const getMatches        = (id) => api.get(`/employees/${id}/matches`);
