import { useState, useEffect } from 'react';
import { updateOccurrence, deleteOccurrence } from '../api/calendarApi';

const STATUS_OPTIONS = ['confirmed', 'cancelled'];
const STATUS_STYLES = {
    open:       'bg-[#fef3c7] text-[#92400e]',
    confirmed:  'bg-[#d1fae5] text-[#065f46]',
    cancelled:  'bg-[#fee2e2] text-[#991b1b]',
};

function fmt(iso) {
    if (!iso) return '—';
    return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', timeZone: 'UTC' });
}

export default function OccurrenceDetailModal({ occurrence, employees = [], onClose, onSaved, onDeleted }) {
    const [employeeId, setEmployeeId] = useState('');
    const [status, setStatus]         = useState('scheduled');
    const [notes, setNotes]           = useState('');
    const [saving, setSaving]         = useState(false);
    const [error, setError]           = useState(null);

    useEffect(() => {
        if (occurrence) {
            setEmployeeId(occurrence.employee?.employeeId ?? '');
            setStatus(occurrence.status ?? 'open');
            setNotes(occurrence.notes ?? '');
            setError(null);
        }
    }, [occurrence]);

    const handleEmployeeChange = (e) => {
        const val = e.target.value;
        setEmployeeId(val);
        if (status !== 'cancelled') {
            setStatus(val ? 'confirmed' : 'open');
        }
    };

    const { shift } = occurrence;
    const client = shift?.client;
    const dateStr = new Date(occurrence.scheduledStart).toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric', timeZone: 'UTC' });

    const handleSave = async () => {
        setSaving(true);
        setError(null);
        try {
            await updateOccurrence(occurrence.occurrenceId, {
                employeeId: employeeId ? parseInt(employeeId, 10) : null,
                status,
                notes: notes || null,
            });
            onSaved();
        } catch (e) {
            setError('Failed to save. Please try again.');
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async () => {
        if (!window.confirm('Remove this occurrence from the calendar?')) return;
        try {
            await deleteOccurrence(occurrence.occurrenceId);
            onDeleted();
        } catch {
            setError('Failed to delete occurrence.');
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={onClose}>
            <div className="w-full max-w-md rounded-xl bg-white shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>

                {/* Header — blue gradient */}
                <div className="bg-gradient-to-r from-[#0487D9] to-[#0CB1F2] px-6 py-4 text-white">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-xs text-white/70 uppercase tracking-wide font-semibold">{shift?.service?.serviceName}</p>
                            <h2 className="text-lg font-bold mt-0.5">
                                {client?.firstName} {client?.lastName}
                            </h2>
                            <p className="text-sm text-white/80 mt-1">{dateStr}</p>
                        </div>
                        <button onClick={onClose} className="text-white/70 hover:text-white mt-1 transition-colors">
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>
                    <div className="flex items-center gap-3 mt-3">
                        <span className="text-sm font-medium">
                            {fmt(occurrence.scheduledStart)} – {fmt(occurrence.scheduledEnd)}
                        </span>
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${STATUS_STYLES[status]}`}>
                            {status}
                        </span>
                    </div>
                </div>

                {/* Body */}
                <div className="p-6 space-y-5">
                    {error && <p className="text-sm text-red-600 bg-[#fee2e2] rounded-lg px-3 py-2">{error}</p>}

                    {/* Client info summary */}
                    <div className="text-sm text-slate-600 bg-[#F2F2F2] rounded-lg px-4 py-3 space-y-1">
                        <p><span className="font-semibold text-slate-800">Address:</span> {client?.address1} {client?.address2} {client?.zipcode}</p>
                        <p><span className="font-semibold text-slate-800">Phone:</span> {client?.phoneNumber}</p>
                        {shift?.totalHours && <p><span className="font-semibold text-slate-800">Hours:</span> {shift.totalHours}h</p>}
                    </div>

                    {/* Assign employee */}
                    <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-1">Assigned Employee</label>
                        <select
                            className="w-full rounded-lg border border-[#cbd5e1] p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#0487D9] focus:border-transparent"
                            value={employeeId}
                            onChange={handleEmployeeChange}
                        >
                            <option value="">— Unassigned —</option>
                            {employees.map(emp => (
                                <option key={emp.employeeId} value={emp.employeeId}>
                                    {emp.firstName} {emp.lastName}
                                </option>
                            ))}
                        </select>
                        <p className="mt-1.5 text-xs text-[#64748b]">Applies to all visits in this shift schedule</p>
                    </div>

                    {/* Status */}
                    <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-2">Status</label>
                        {occurrence.status === 'open' && (
                            <p className="text-xs text-[#0487D9] bg-[#99E2F2]/30 rounded-lg px-3 py-2 mb-2">
                                This visit is open. Assign an employee above to confirm it, or use <strong>Reassign</strong> on the Shift Board to re-run matching.
                            </p>
                        )}
                        <div className="flex gap-2 flex-wrap">
                            {STATUS_OPTIONS.map(s => (
                                <button
                                    key={s}
                                    type="button"
                                    onClick={() => setStatus(s)}
                                    className={`px-3 py-1.5 rounded-full text-xs font-semibold capitalize transition-all border ${
                                        status === s
                                            ? `${STATUS_STYLES[s]} border-current ring-2 ring-offset-1 ring-current`
                                            : 'bg-[#F2F2F2] text-[#64748b] border-transparent hover:bg-[#e2e8f0]'
                                    }`}
                                >
                                    {s}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Notes */}
                    <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-1">Notes</label>
                        <textarea
                            rows={2}
                            placeholder="Any notes for this visit..."
                            className="w-full rounded-lg border border-[#cbd5e1] p-2.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[#0487D9] focus:border-transparent"
                            value={notes}
                            onChange={e => setNotes(e.target.value)}
                        />
                    </div>
                </div>

                {/* Footer */}
                <div className="px-6 pb-6 flex justify-between items-center">
                    <button
                        onClick={handleDelete}
                        className="text-sm text-red-500 hover:text-red-700 font-medium transition-colors"
                    >
                        Remove occurrence
                    </button>
                    <div className="flex gap-3">
                        <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-[#64748b] hover:bg-[#F2F2F2] rounded-lg transition-colors">
                            Cancel
                        </button>
                        <button
                            onClick={handleSave}
                            disabled={saving}
                            className="rounded-lg bg-[#0487D9] px-4 py-2 text-sm font-semibold text-white hover:bg-[#0363A0] disabled:opacity-60 transition-colors"
                        >
                            {saving ? 'Saving…' : 'Save Changes'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
