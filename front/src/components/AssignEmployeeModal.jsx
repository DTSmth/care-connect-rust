import { useState } from 'react';
import { assignShift } from '../api/shiftApi';

export default function AssignEmployeeModal({ shift, employees, onAssigned, onClose }) {
    const [search, setSearch]       = useState('');
    const [selectedId, setSelected] = useState('');
    const [loading, setLoading]     = useState(false);
    const [error, setError]         = useState('');

    if (!shift) return null;

    const filtered = (employees || []).filter(e => {
        const name = `${e.firstName} ${e.lastName}`.toLowerCase();
        return name.includes(search.toLowerCase());
    });

    const handleAssign = async () => {
        if (!selectedId) return;
        setLoading(true);
        setError('');
        try {
            await assignShift(shift.shiftId, { employeeId: parseInt(selectedId) });
            onAssigned();
            onClose();
        } catch (err) {
            console.error(err);
            setError('Failed to assign. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm">
            <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-2xl">
                <div className="flex items-start justify-between mb-4">
                    <div>
                        <h2 className="text-lg font-bold text-gray-900">Assign Employee</h2>
                        <p className="text-sm text-gray-500 mt-0.5">
                            {shift.service?.serviceName} · {shift.client?.firstName} {shift.client?.lastName}
                        </p>
                    </div>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">&times;</button>
                </div>

                <input
                    type="text"
                    placeholder="Search employees..."
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm mb-3 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />

                <div className="max-h-64 overflow-y-auto divide-y divide-gray-100 rounded-lg border border-gray-200 mb-4">
                    {filtered.length === 0 ? (
                        <p className="text-center text-sm text-gray-400 py-6">No employees found</p>
                    ) : filtered.map(e => (
                        <button
                            key={e.employeeId}
                            onClick={() => setSelected(String(e.employeeId))}
                            className={`w-full text-left px-4 py-3 text-sm transition-colors ${
                                selectedId === String(e.employeeId)
                                    ? 'bg-indigo-50 text-indigo-900 font-medium'
                                    : 'hover:bg-gray-50 text-gray-800'
                            }`}
                        >
                            {e.firstName} {e.lastName}
                        </button>
                    ))}
                </div>

                {error && <p className="text-sm text-red-600 mb-3">{error}</p>}

                <div className="flex justify-end gap-3">
                    <button
                        onClick={onClose}
                        className="rounded-lg px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleAssign}
                        disabled={!selectedId || loading}
                        className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                    >
                        {loading ? 'Assigning…' : 'Assign'}
                    </button>
                </div>
            </div>
        </div>
    );
}
