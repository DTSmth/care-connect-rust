import { useNavigate } from 'react-router-dom';

export default function ClientTable({ clients }) {
    const navigate = useNavigate();

    return (
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
            <table className="w-full border-collapse text-left text-sm text-gray-500">
                <thead className="bg-gray-50 text-xs font-semibold uppercase tracking-wider text-gray-700">
                <tr>
                    <th className="px-6 py-4">Client Name</th>
                    <th className="px-6 py-4">Care Needs</th>
                    <th className="px-6 py-4">Contact Info</th>
                    <th className="px-6 py-4">Address</th>
                </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                {clients.map((c) => (
                    <tr key={c.clientId} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4 font-medium text-gray-900">
                            {/* Wrap name in a button or link */}
                            <button
                                onClick={() => navigate(`/shifts?clientId=${c.clientId}`)}
                                className="text-indigo-600 hover:text-indigo-900 hover:underline text-left"
                            >
                                {c.firstName} {c.lastName}
                            </button>
                        </td>

                        {/* Boolean Badges for better scannability */}
                        <td className="px-6 py-4">
                            <div className="flex flex-wrap gap-2">
                                {c.hasPersonalCare && (
                                    <span className="inline-flex items-center rounded-md bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700 ring-1 ring-inset ring-blue-700/10">
                      Personal Care
                    </span>
                                )}
                                {c.hasLifting && (
                                    <span className="inline-flex items-center rounded-md bg-purple-50 px-2 py-1 text-xs font-medium text-purple-700 ring-1 ring-inset ring-purple-700/10">
                      Lifting
                    </span>
                                )}
                                {!c.hasPersonalCare && !c.hasLifting && (
                                    <span className="text-gray-400 italic">None</span>
                                )}
                            </div>
                        </td>

                        {/* Phone info */}
                        <td className="px-6 py-4 tabular-nums">
                            {c.phoneNumber}
                        </td>

                        {/* Address with secondary text styling */}
                        <td className="px-6 py-4">
                            <div className="text-gray-900">{c.address1}</div>
                            {c.address2 && <div className="text-xs text-gray-400">{c.address2}</div>}
                            <div className="text-xs font-mono">{c.zipcode}</div>
                        </td>
                    </tr>
                ))}
                </tbody>
            </table>
        </div>
    );
}