import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';

function SortIcon({ active, dir }) {
    if (!active) return <span className="ml-1 text-slate-300 select-none">⇅</span>;
    return <span className="ml-1 text-[#0487D9] select-none">{dir === 'asc' ? '↑' : '↓'}</span>;
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
        <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-sm">
                <thead className="bg-[#F2F2F2] border-b border-[#e2e8f0]">
                    <tr>
                        <th className="px-6 py-3.5 text-xs font-semibold uppercase tracking-wider text-slate-500 cursor-pointer select-none hover:text-[#0487D9] transition-colors"
                            onClick={() => toggleSort('name')}>
                            Name
                            <SortIcon active={sort.key === 'name'} dir={sort.dir} />
                        </th>
                        <th className="px-6 py-3.5 text-xs font-semibold uppercase tracking-wider text-slate-500">Phone</th>
                        <th className="px-6 py-3.5 text-xs font-semibold uppercase tracking-wider text-slate-500 cursor-pointer select-none hover:text-[#0487D9] transition-colors"
                            onClick={() => toggleSort('email')}>
                            Email
                            <SortIcon active={sort.key === 'email'} dir={sort.dir} />
                        </th>
                        <th className="px-6 py-3.5 text-xs font-semibold uppercase tracking-wider text-slate-500 text-right">Actions</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-[#e2e8f0]">
                    {sorted.length === 0 ? (
                        <tr>
                            <td colSpan="4" className="px-6 py-12 text-center text-[#64748b]">
                                No employees found.
                            </td>
                        </tr>
                    ) : (
                        sorted.map((emp, i) => (
                            <tr key={emp.employeeId} className={`hover:bg-[#f0faff] transition-colors ${i % 2 === 1 ? 'bg-[#fafafa]' : 'bg-white'}`}>
                                <td className="px-6 py-4 font-semibold text-slate-800">
                                    <button
                                        onClick={() => navigate(`/shifts?employeeId=${emp.employeeId}`)}
                                        className="text-[#0487D9] hover:text-[#0363A0] hover:underline transition-colors text-left"
                                    >
                                        {emp.firstName} {emp.lastName}
                                    </button>
                                </td>
                                <td className="px-6 py-4 tabular-nums text-slate-600">
                                    {emp.phoneNumber}
                                </td>
                                <td className="px-6 py-4 text-slate-600">
                                    {emp.email || <span className="italic text-[#64748b]">—</span>}
                                </td>
                                <td className="px-6 py-4 text-right">
                                    <div className="flex justify-end gap-3">
                                        <button
                                            onClick={() => onEdit(emp)}
                                            className="text-[#0487D9] hover:text-[#0363A0] font-medium text-sm transition-colors"
                                        >
                                            Edit
                                        </button>
                                        <button
                                            onClick={() => onDelete(emp.employeeId)}
                                            className="text-red-500 hover:text-red-700 font-medium text-sm transition-colors"
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
