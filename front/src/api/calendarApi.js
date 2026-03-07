import { api } from './authApi';

export const getCalendar = (start, end, filters = {}) => {
    const params = { start, end, ...filters };
    return api.get('/calendar', { params });
};

export const getShiftOccurrences = (shiftId) =>
    api.get(`/shifts/${shiftId}/occurrences`);

export const getOccurrence = (id) =>
    api.get(`/occurrences/${id}`);

export const createOccurrence = (shiftId, data) =>
    api.post(`/shifts/${shiftId}/occurrences`, data);

export const updateOccurrence = (id, data) =>
    api.put(`/occurrences/${id}`, data);

export const deleteOccurrence = (id) =>
    api.delete(`/occurrences/${id}`);
