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
        <div className="py-8 px-6 lg:px-8">
            {/* Page Header */}
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">Employees</h1>
                    <p className="text-sm text-[#64748b] mt-0.5">{employees.length} total employees</p>
                </div>
                <button
                    onClick={() => setIsModalOpen(true)}
                    className="inline-flex items-center gap-2 rounded-lg bg-[#0487D9] px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-[#0363A0] transition-all"
                >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                    </svg>
                    Add Employee
                </button>
            </div>

            {/* Search */}
            <div className="relative mb-6 max-w-sm">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                    <svg className="h-4 w-4 text-[#64748b]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                </div>
                <input
                    type="text"
                    className="block w-full rounded-lg border border-[#cbd5e1] py-2 pl-9 pr-3 text-slate-900 placeholder:text-[#64748b] focus:outline-none focus:ring-2 focus:ring-[#0487D9] focus:border-transparent text-sm bg-white"
                    placeholder="Search by name, email, or phone…"
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                />
            </div>

            {/* Table card */}
            <div className="bg-white rounded-xl shadow-sm border border-[#e2e8f0] overflow-hidden">
                <EmployeeTable
                    employees={filtered}
                    onEdit={handleEdit}
                    onDelete={handleDelete}
                />
            </div>

            <CreateEmployeeModal
                isOpen={isModalOpen}
                onClose={() => { setIsModalOpen(false); setEditingEmployee(null); }}
                onSave={handleSave}
                initialData={editingEmployee}
            />
        </div>
    );
}
