import { useState, useEffect } from 'react';
import { getAllEmployees, createEmployee, updateEmployee, deleteEmployee } from '../api/employeeApi';
import EmployeeTable from '../components/EmployeeTable';
import CreateEmployeeModal from '../components/CreateEmployeeModal';

export default function EmployeesPage() {
    const [employees, setEmployees] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingEmployee, setEditingEmployee] = useState(null);

    const loadEmployees = () => {
        getAllEmployees()
            .then(res => setEmployees(res.data || []))
            .catch(err => console.error('Failed to load employees', err));
    };

    useEffect(() => { loadEmployees(); }, []);

    const handleSave = async (payload) => {
        try {
            if (editingEmployee) {
                await updateEmployee(editingEmployee.employeeId, payload);
            } else {
                await createEmployee(payload);
            }
            setIsModalOpen(false);
            setEditingEmployee(null);
            loadEmployees();
        } catch (err) {
            console.error(err);
            alert('Error saving employee: ' + err.message);
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Delete this employee?')) return;
        try {
            await deleteEmployee(id);
            loadEmployees();
        } catch (err) {
            console.error(err);
            alert('Error deleting employee');
        }
    };

    const handleEdit = (emp) => {
        setEditingEmployee(emp);
        setIsModalOpen(true);
    };

    const filtered = employees.filter(e =>
        `${e.firstName} ${e.lastName}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (e.email || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (e.phoneNumber || '').includes(searchTerm)
    );

    return (
        <div className="py-8 px-4 sm:px-6 lg:px-8">
            <div className="max-w-7xl mx-auto">
                <div className="flex items-center justify-between mb-6">
                    <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Employees</h1>
                    <button
                        onClick={() => setIsModalOpen(true)}
                        className="inline-flex items-center rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 transition-all"
                    >
                        Add Employee
                    </button>
                </div>

                <div className="mb-6">
                    <input
                        type="text"
                        className="block w-full rounded-lg border-gray-300 py-2 px-4 shadow-sm focus:ring-2 focus:ring-indigo-600 sm:text-sm border"
                        placeholder="Search by name, email, or phone..."
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                    />
                </div>

                <EmployeeTable
                    employees={filtered}
                    onEdit={handleEdit}
                    onDelete={handleDelete}
                />

                <CreateEmployeeModal
                    isOpen={isModalOpen}
                    onClose={() => { setIsModalOpen(false); setEditingEmployee(null); }}
                    onSave={handleSave}
                    initialData={editingEmployee}
                />
            </div>
        </div>
    );
}
