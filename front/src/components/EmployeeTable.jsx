import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';

function SortIcon({ active, dir }) {
    if (!active) return <span className="ml-1 text-gray-300 select-none">⇅</span>;
    return <span className="ml-1 text-indigo-600 select-none">{dir === 'asc' ? '↑' : '↓'}</span>;
}

function useSortable(defaultKey, defaultDir = 'asc') {
    const [sort, setSort] = useState({ key: defaultKey, dir: defaultDir });
    const toggle = (key) => setSort(prev =>
        prev.key === key
            ? { key, dir: prev.dir === 'asc' ? 'desc' : 'asc' }
            : { key, dir: 'asc' }
    );
    return [sort, toggle];
}

export default function EmployeeTable({ employees, onEdit, onDelete }) {
    const navigate = useNavigate();
    const [sort, toggleSort] = useSortable('name', 'asc');

    const sorted = useMemo(() => {
        const data = [...employees];
        const { key, dir } = sort;
        const mul = dir === 'asc' ? 1 : -1;

        data.sort((a, b) => {
            switch (key) {
                case 'name': {
                    const la = `${a.lastName} ${a.firstName}`.toLowerCase();
                    const lb = `${b.lastName} ${b.firstName}`.toLowerCase();
                    return mul * la.localeCompare(lb);
                }
                case 'email': {
                    return mul * (a.email ?? '').localeCompare(b.email ?? '');
                }
                default: return 0;
            }
        });
        return data;
    }, [employees, sort]);

    return (
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
            <table className="w-full border-collapse text-left text-sm text-gray-500">
                <thead className="bg-gray-50 text-xs font-semibold uppercase tracking-wider text-gray-700">
                    <tr>
                        <th className="px-6 py-4 cursor-pointer select-none hover:text-indigo-600"
                            onClick={() => toggleSort('name')}>
                            Name
                            <SortIcon active={sort.key === 'name'} dir={sort.dir} />
                        </th>
                        <th className="px-6 py-4">Phone</th>
                        <th className="px-6 py-4 cursor-pointer select-none hover:text-indigo-600"
                            onClick={() => toggleSort('email')}>
                            Email
                            <SortIcon active={sort.key === 'email'} dir={sort.dir} />
                        </th>
                        <th className="px-6 py-4 text-right">Actions</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                    {sorted.length === 0 ? (
                        <tr>
                            <td colSpan="4" className="px-6 py-10 text-center text-gray-400">
                                No employees found.
                            </td>
                        </tr>
                    ) : (
                        sorted.map(emp => (
                            <tr key={emp.employeeId} className="hover:bg-gray-50 transition-colors">
                                <td className="px-6 py-4 font-medium text-gray-900">
                                    <button
                                        onClick={() => navigate(`/shifts?employeeId=${emp.employeeId}`)}
                                        className="hover:text-indigo-600 hover:underline transition-colors text-left"
                                    >
                                        {emp.firstName} {emp.lastName}
                                    </button>
                                </td>
                                <td className="px-6 py-4 tabular-nums text-gray-600">
                                    {emp.phoneNumber}
                                </td>
                                <td className="px-6 py-4 text-gray-600">
                                    {emp.email || <span className="italic text-gray-400">—</span>}
                                </td>
                                <td className="px-6 py-4 text-right">
                                    <div className="flex justify-end gap-3">
                                        <button
                                            onClick={() => onEdit(emp)}
                                            className="text-indigo-600 hover:text-indigo-900 font-medium"
                                        >
                                            Edit
                                        </button>
                                        <button
                                            onClick={() => onDelete(emp.employeeId)}
                                            className="text-red-600 hover:text-red-900 font-medium"
                                        >
                                            Delete
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))
                    )}
                </tbody>
            </table>
        </div>
    );
}
