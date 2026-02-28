import { api } from './authApi';

export const getAllClients = () =>
    api.get('/clients');
