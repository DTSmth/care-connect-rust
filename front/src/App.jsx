// src/App.jsx
import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { useState, useEffect } from 'react';
import LoginPage from './pages/LoginPage';
import ClientsPage from './pages/ClientsPage';
import ShiftsPage from "./pages/ShiftsPage.jsx";
import ReportsPage from "./pages/ReportsPage.jsx";
import EmployeesPage from "./pages/EmployeesPage.jsx";
import CalendarPage from "./pages/CalendarPage.jsx";
import ProtectedRoute from './auth/ProtectedRoute';
import { AuthProvider, useAuth } from './auth/AuthContext';
import Navbar from './components/Navbar';

// API imports
import { getAllClients } from './api/clientApi';
import { getAllShifts } from './api/shiftApi';
import { getAllServices } from './api/serviceApi';
import { getAllUsers } from './api/userApi';
import { getAllEmployees } from './api/employeeApi';

// 1. Define Layout First
function AppLayout() {
    return (
        <div className="flex h-screen bg-[#F2F2F2]">
            <Navbar />
            <main className="flex-1 ml-64 overflow-y-auto">
                <Outlet />
            </main>
        </div>
    );
}

// 2. Define Content Logic
function AppContent() {
    const [clients, setClients] = useState([]);
    const [shifts, setShifts] = useState([]);
    const [services, setServices] = useState([]);
    const [users, setUsers] = useState([]);
    const [employees, setEmployees] = useState([]);
    const { token } = useAuth();

    const loadData = () => {
        if (token) {
            Promise.all([getAllClients(), getAllShifts(), getAllServices(), getAllUsers(), getAllEmployees()])
                .then(([clientRes, shiftRes, serviceRes, userRes, empRes]) => {
                    setClients(clientRes.data || []);
                    setShifts(shiftRes.data || []);
                    setServices(serviceRes.data || []);
                    setUsers(userRes.data || []);
                    setEmployees(empRes.data || []);
                })
                .catch(err => console.error("Error loading app data", err));
        }
    };

    useEffect(() => {
        loadData();
    }, [token]);

    return (
        <Routes>
            <Route path="/" element={<Navigate to="/login" replace />} />
            <Route path="/login" element={<LoginPage />} />

            <Route element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
                <Route path="/clients" element={<ClientsPage clients={clients} />} />
                <Route path="/shifts" element={
                    <ShiftsPage
                        shifts={shifts}
                        clients={clients}
                        services={services}
                        users={users}
                        employees={employees}
                        refreshData={loadData}
                    />
                } />
                <Route path="/employees" element={<EmployeesPage />} />
                <Route path="/calendar" element={
                    <CalendarPage employees={employees} clients={clients} shifts={shifts} onDataChanged={loadData} />
                } />
                <Route path="/reports" element={<ReportsPage clients={clients} shifts={shifts} />} />
            </Route>

            <Route path="*" element={<Navigate to="/clients" replace />} />
        </Routes>
    );
}

// 3. Define Main Entry Point
function App() {
    return (
        <AuthProvider>
            <BrowserRouter>
                <AppContent />
            </BrowserRouter>
        </AuthProvider>
    );
}

export default App;
