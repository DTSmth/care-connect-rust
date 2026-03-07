import { useNavigate } from 'react-router-dom';

export default function EmployeeTable({ employees, onEdit, onDelete }) {
    const navigate = useNavigate();
    return (
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
            <table className="w-full border-collapse text-left text-sm text-gray-500">
                <thead className="bg-gray-50 text-xs font-semibold uppercase tracking-wider text-gray-700">
                    <tr>
                        <th className="px-6 py-4">Name</th>
                        <th className="px-6 py-4">Phone</th>
                        <th className="px-6 py-4">Email</th>
                        <th className="px-6 py-4 text-right">Actions</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                    {employees.length === 0 ? (
                        <tr>
                            <td colSpan="4" className="px-6 py-10 text-center text-gray-400">
                                No employees found.
                            </td>
                        </tr>
                    ) : (
                        employees.map(emp => (
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
