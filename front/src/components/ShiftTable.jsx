import { useState, useMemo } from 'react';
import { setShiftMatching } from '../api/shiftApi';

function fmtTime(t) {
    if (!t) return null;
    const [h, m] = t.split(':');
    const hour = parseInt(h, 10);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const h12  = hour % 12 || 12;
    return `${h12}:${m} ${ampm}`;
}

function fmtDuration(minutes) {
    if (!minutes) return null;
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    if (h && m) return `${h}h ${m}m`;
    if (h)      return `${h}h`;
    return `${m}m`;
}

function RecurrenceBadge({ rule }) {
    if (!rule) return null;
    let label = '';
    if (rule === 'DAILY') label = 'Daily';
    else if (rule.startsWith('WEEKLY:')) label = rule.replace('WEEKLY:', '').split(',').join(' ');
    else label = rule;
    return (
        <span className="inline-flex items-center rounded-full bg-indigo-50 px-2 py-0.5 text-xs font-medium text-indigo-700 mt-1">
            ↻ {label}
        </span>
    );
}

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

export default function ShiftTable({ shifts, onDelete, onEdit, onMatchingToggled, onAssign }) {
    // Default: unassigned first — coordinators' primary workflow is filling open shifts
    const [sort, toggleSort] = useSortable('status', 'asc');

    const sorted = useMemo(() => {
        const data = [...shifts];
        const { key, dir } = sort;
        const mul = dir === 'asc' ? 1 : -1;

        data.sort((a, b) => {
            switch (key) {
                case 'client': {
                    const la = `${a.client?.lastName} ${a.client?.firstName}`.toLowerCase();
                    const lb = `${b.client?.lastName} ${b.client?.firstName}`.toLowerCase();
                    return mul * la.localeCompare(lb);
                }
                case 'service': {
                    const sa = (a.service?.serviceName ?? '').toLowerCase();
                    const sb = (b.service?.serviceName ?? '').toLowerCase();
                    return mul * sa.localeCompare(sb);
                }
                case 'status': {
                    // asc = unassigned first (0), desc = assigned first (1)
                    const va = a.assignedEmployee ? 1 : 0;
                    const vb = b.assignedEmployee ? 1 : 0;
                    return mul * (va - vb);
                }
                case 'time': {
                    // nulls last regardless of direction
                    if (!a.defaultStartTime && !b.defaultStartTime) return 0;
                    if (!a.defaultStartTime) return 1;
                    if (!b.defaultStartTime) return -1;
                    return mul * a.defaultStartTime.localeCompare(b.defaultStartTime);
                }
                default: return 0;
            }
        });
        return data;
    }, [shifts, sort]);

    return (
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
            <table className="w-full border-collapse text-left text-sm text-gray-500">
                <thead className="bg-gray-50 text-xs font-semibold uppercase tracking-wider text-gray-700">
                <tr>
                    <th className="px-6 py-4 cursor-pointer select-none hover:text-indigo-600"
                        onClick={() => toggleSort('service')}>
                        Service Type
                        <SortIcon active={sort.key === 'service'} dir={sort.dir} />
                    </th>
                    <th className="px-6 py-4 cursor-pointer select-none hover:text-indigo-600"
                        onClick={() => toggleSort('client')}>
                        Client
                        <SortIcon active={sort.key === 'client'} dir={sort.dir} />
                    </th>
                    <th className="px-6 py-4">Location (Zip)</th>
                    <th className="px-6 py-4 cursor-pointer select-none hover:text-indigo-600"
                        onClick={() => toggleSort('time')}>
                        Schedule
                        <SortIcon active={sort.key === 'time'} dir={sort.dir} />
                    </th>
                    <th className="px-6 py-4 cursor-pointer select-none hover:text-indigo-600"
                        onClick={() => toggleSort('status')}>
                        Status
                        <SortIcon active={sort.key === 'status'} dir={sort.dir} />
                    </th>
                    <th className="px-6 py-4 text-right">Actions</th>
                </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                {sorted.length === 0 ? (
                    <tr>
                        <td colSpan="6" className="px-6 py-10 text-center text-gray-400">
                            No shifts found.
                        </td>
                    </tr>
                ) : (
                    sorted.map((s) => (
                        <tr key={s.shiftId} className="hover:bg-gray-50 transition-colors">
                            {/* Service Type */}
                            <td className="px-6 py-4">
                                <div className="flex items-center gap-3">
                                    <div className="h-8 w-8 rounded bg-indigo-50 flex items-center justify-center text-indigo-600">
                                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                                        </svg>
                                    </div>
                                    <span className="font-medium text-gray-900">
                                        {s.service?.serviceName || "Unknown Service"}
                                    </span>
                                </div>
                            </td>

                            {/* Client */}
                            <td className="px-6 py-4 text-gray-700">
                                {s.client ? `${s.client.firstName} ${s.client.lastName}` : <span className="italic text-gray-400">—</span>}
                            </td>

                            {/* Zipcode */}
                            <td className="px-6 py-4 font-mono text-gray-600">
                                {s.zipcode}
                            </td>

                            {/* Schedule: time + duration + recurrence */}
                            <td className="px-6 py-4">
                                {s.defaultStartTime ? (
                                    <div>
                                        <span className="text-gray-900 font-semibold">{fmtTime(s.defaultStartTime)}</span>
                                        {s.defaultDurationMinutes && (
                                            <span className="text-gray-400 ml-1.5 text-xs">{fmtDuration(s.defaultDurationMinutes)}</span>
                                        )}
                                        <RecurrenceBadge rule={s.recurrenceRule} />
                                    </div>
                                ) : (
                                    <div>
                                        <span className="text-gray-900 font-semibold">{s.totalHours}</span>
                                        <span className="text-gray-400 ml-1">hrs</span>
                                        <p className="text-xs text-gray-300 mt-0.5">No time set</p>
                                    </div>
                                )}
                            </td>

                            {/* Staff Status */}
                            <td className="px-6 py-4">
                                {s.assignedEmployee ? (
                                    <div>
                                        <p className="text-sm font-medium text-gray-900">
                                            {s.assignedEmployee.firstName} {s.assignedEmployee.lastName}
                                        </p>
                                        <span className="inline-flex items-center gap-1 text-xs text-green-600 font-medium mt-0.5">
                                            <span className="h-1.5 w-1.5 rounded-full bg-green-500"></span>
                                            Assigned
                                        </span>
                                    </div>
                                ) : (
                                    <span className="inline-flex items-center gap-1.5 rounded-full bg-indigo-100 px-2.5 py-0.5 text-xs font-medium text-indigo-700">
                                        <span className="h-1.5 w-1.5 rounded-full bg-indigo-500"></span>
                                        Unassigned
                                    </span>
                                )}
                            </td>

                            {/* Actions Column */}
                            <td className="px-6 py-4 text-right text-sm">
                                <div className="flex justify-end gap-3">
                                    {s.assignedEmployee && (
                                        <button
                                            onClick={() => onMatchingToggled && onMatchingToggled(s.shiftId, true)}
                                            className="text-indigo-600 hover:text-indigo-900 font-medium transition-colors"
                                            title="Unassign and re-open for matching"
                                        >
                                            Reassign
                                        </button>
                                    )}
                                    {!s.assignedEmployee && (
                                        <button
                                            onClick={() => onAssign && onAssign(s)}
                                            className="text-green-600 hover:text-green-900 font-medium transition-colors"
                                        >
                                            Assign
                                        </button>
                                    )}
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
