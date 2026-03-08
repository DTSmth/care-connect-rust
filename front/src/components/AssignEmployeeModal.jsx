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
                <div className="flex items-start justify-between mb-5">
                    <div>
                        <h2 className="text-lg font-bold text-slate-800">Assign Employee</h2>
                        <p className="text-sm text-[#64748b] mt-0.5">
                            {shift.service?.serviceName} · {shift.client?.firstName} {shift.client?.lastName}
                        </p>
                    </div>
                    <button onClick={onClose} className="text-[#64748b] hover:text-slate-800 text-xl leading-none transition-colors">&times;</button>
                </div>

                <div className="relative mb-3">
                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                        <svg className="h-4 w-4 text-[#64748b]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                    </div>
                    <input
                        type="text"
                        placeholder="Search employees..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        className="w-full rounded-lg border border-[#cbd5e1] pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0487D9] focus:border-transparent"
                    />
                </div>

                <div className="max-h-64 overflow-y-auto divide-y divide-[#e2e8f0] rounded-lg border border-[#e2e8f0] mb-4">
                    {filtered.length === 0 ? (
                        <p className="text-center text-sm text-[#64748b] py-6">No employees found</p>
                    ) : filtered.map(e => (
                        <button
                            key={e.employeeId}
                            onClick={() => setSelected(String(e.employeeId))}
                            className={`w-full text-left px-4 py-3 text-sm transition-colors ${
                                selectedId === String(e.employeeId)
                                    ? 'bg-[#99E2F2]/40 text-[#0487D9] font-semibold'
                                    : 'hover:bg-[#F2F2F2] text-slate-800'
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
                        className="rounded-lg px-4 py-2 text-sm font-medium text-[#64748b] hover:bg-[#F2F2F2] transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleAssign}
                        disabled={!selectedId || loading}
                        className="rounded-lg bg-[#0487D9] px-4 py-2 text-sm font-semibold text-white hover:bg-[#0363A0] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                    >
                        {loading ? 'Assigning…' : 'Assign'}
                    </button>
                </div>
            </div>
        </div>
    );
}
