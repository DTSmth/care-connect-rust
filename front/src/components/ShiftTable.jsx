export default function ShiftTable({ shifts, onDelete, onEdit }) {
    return (
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
            <table className="w-full border-collapse text-left text-sm text-gray-500">
                <thead className="bg-gray-50 text-xs font-semibold uppercase tracking-wider text-gray-700">
                <tr>
                    <th className="px-6 py-4">Service Type & Client</th>
                    <th className="px-6 py-4">Location (Zip)</th>
                    <th className="px-6 py-4">Duration</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4 text-right">Actions</th>
                </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                {shifts.length === 0 ? (
                    <tr>
                        <td colSpan="5" className="px-6 py-10 text-center text-gray-400">
                            No shifts found.
                        </td>
                    </tr>
                ) : (
                    shifts.map((s) => (
                        <tr key={s.shiftId} className="hover:bg-gray-50 transition-colors">
                            {/* Service Name & Client info */}
                            <td className="px-6 py-4">
                                <div className="flex items-center gap-3">
                                    <div className="h-8 w-8 rounded bg-indigo-50 flex items-center justify-center text-indigo-600">
                                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                                        </svg>
                                    </div>
                                    <div>
                                        <div className="font-medium text-gray-900">
                                            {s.service?.serviceName || "Unknown Service"}
                                        </div>
                                        <div className="text-xs text-gray-400">
                                            Client: {s.client ? `${s.client.firstName} ${s.client.lastName}` : 'Unassigned'}
                                        </div>
                                    </div>
                                </div>
                            </td>

                            {/* Zipcode */}
                            <td className="px-6 py-4 font-mono text-gray-600">
                                {s.zipcode}
                            </td>

                            {/* Total Hours */}
                            <td className="px-6 py-4">
                                <span className="text-gray-900 font-semibold">{s.totalHours}</span>
                                <span className="text-gray-400 ml-1">hrs</span>
                            </td>

                            {/* Availability Badge */}
                            <td className="px-6 py-4">
                                {s.available ? (
                                    <span className="inline-flex items-center gap-1.5 rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-700">
                                            <span className="h-1.5 w-1.5 rounded-full bg-green-600"></span>
                                            Available
                                        </span>
                                ) : (
                                    <span className="inline-flex items-center gap-1.5 rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-600">
                                            <span className="h-1.5 w-1.5 rounded-full bg-gray-400"></span>
                                            Filled
                                        </span>
                                )}
                            </td>

                            {/* Actions Column */}
                            <td className="px-6 py-4 text-right text-sm">
                                <div className="flex justify-end gap-3">
                                    <button
                                        onClick={() => onEdit(s)}
                                        className="text-indigo-600 hover:text-indigo-900 mr-4 font-medium"
                                    >
                                        Edit
                                    </button>
                                    <button
                                        onClick={() => onDelete(s.shiftId)}
                                        className="text-red-600 hover:text-red-900 font-medium transition-colors"
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