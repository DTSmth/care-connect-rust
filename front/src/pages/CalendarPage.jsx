import { useState, useEffect, useCallback } from 'react';
import { getCalendar } from '../api/calendarApi';
import OccurrenceDetailModal from '../components/OccurrenceDetailModal';
import { useNavigate } from 'react-router-dom';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function startOfWeek(date) {
    const d = new Date(date);
    const day = d.getUTCDay();
    const diff = day === 0 ? -6 : 1 - day;
    d.setUTCDate(d.getUTCDate() + diff);
    d.setUTCHours(0, 0, 0, 0);
    return d;
}

function addDays(date, n) {
    const d = new Date(date);
    d.setUTCDate(d.getUTCDate() + n);
    return d;
}

function toDateStr(date) { return date.toISOString().slice(0, 10); }

function fmtTime(iso) {
    return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', timeZone: 'UTC' });
}

function fmtDayHeading(date) {
    return date.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric', timeZone: 'UTC' });
}

function isToday(date) {
    return date.toISOString().slice(0, 10) === new Date().toISOString().slice(0, 10);
}

const STATUS_CARD = {
    open:      'border-indigo-300  bg-indigo-50  text-indigo-900',
    confirmed: 'border-green-400  bg-green-50  text-green-900',
    cancelled: 'border-red-200    bg-red-50    text-red-400   opacity-60',
};

const STATUS_DOT = {
    open:      'bg-indigo-400',
    confirmed: 'bg-green-500',
    cancelled: 'bg-red-400',
};

// ─── Unscheduled shift card ───────────────────────────────────────────────────

function UnscheduledCard({ shift, onSchedule }) {
    return (
        <div className="rounded-lg border border-dashed border-gray-300 bg-white px-3 py-2.5 flex items-start justify-between gap-2">
            <div className="min-w-0">
                <p className="text-xs font-bold text-gray-800 truncate">
                    {shift.client?.firstName} {shift.client?.lastName}
                </p>
                <p className="text-xs text-gray-500 truncate">{shift.service?.serviceName}</p>
                <p className="text-xs text-gray-400">{shift.zipcode} · {shift.totalHours}h</p>
            </div>
            <button
                onClick={() => onSchedule(shift)}
                className="shrink-0 rounded-md bg-indigo-600 px-2 py-1 text-xs font-semibold text-white hover:bg-indigo-500 transition-colors"
            >
                Schedule
            </button>
        </div>
    );
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function CalendarPage({ employees = [], clients = [], shifts = [] }) {
    const navigate = useNavigate();
    const [weekStart, setWeekStart]         = useState(() => startOfWeek(new Date()));
    const [occurrences, setOccurrences]     = useState([]);
    const [loading, setLoading]             = useState(false);
    const [error, setError]                 = useState(null);
    const [selectedOccurrence, setSelected] = useState(null);
    const [panelOpen, setPanelOpen]         = useState(true);

    // Filters
    const [filterEmployee, setFilterEmployee] = useState('');
    const [filterClient, setFilterClient]     = useState('');
    const [filterStatus, setFilterStatus]     = useState('');

    const weekEnd = addDays(weekStart, 6);

    const loadCalendar = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const filters = {};
            if (filterEmployee) filters.employeeId = filterEmployee;
            if (filterClient)   filters.clientId   = filterClient;
            const res = await getCalendar(toDateStr(weekStart), toDateStr(weekEnd), filters);
            setOccurrences(res.data || []);
        } catch (e) {
            setError('Failed to load calendar. Is the server running?');
        } finally {
            setLoading(false);
        }
    }, [weekStart, filterEmployee, filterClient]);

    useEffect(() => { loadCalendar(); }, [loadCalendar]);

    const prevWeek = () => setWeekStart(d => addDays(d, -7));
    const nextWeek = () => setWeekStart(d => addDays(d, 7));
    const goToday  = () => setWeekStart(startOfWeek(new Date()));

    const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

    const occurrencesForDay = (day) => {
        const dateStr = toDateStr(day);
        return occurrences
            .filter(o => {
                if (o.scheduledStart.slice(0, 10) !== dateStr) return false;
                if (filterStatus && o.status !== filterStatus) return false;
                return true;
            })
            .sort((a, b) => new Date(a.scheduledStart) - new Date(b.scheduledStart));
    };

    // Shifts with no start time set — invisible on calendar
    const unscheduledShifts = shifts.filter(s => !s.defaultStartTime);

    const openCount  = occurrences.filter(o => !o.employee && o.status !== 'cancelled').length;
    const totalCount = occurrences.filter(o => o.status !== 'cancelled').length;
    const hasFilters = filterEmployee || filterClient || filterStatus;

    const weekLabel = `${weekStart.toLocaleDateString([], { month: 'short', day: 'numeric' })} – ${weekEnd.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}`;

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col">

            {/* ── Top bar ─────────────────────────────────────────────────── */}
            <div className="bg-white border-b border-gray-200 px-4 sm:px-6 lg:px-8 py-4">
                <div className="mx-auto max-w-7xl space-y-3">

                    {/* Title + week nav */}
                    <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                            <h1 className="text-xl font-bold text-gray-900">Schedule</h1>
                            <p className="text-sm text-gray-500 mt-0.5">{weekLabel}</p>
                        </div>
                        <div className="flex items-center gap-2">
                            <button onClick={prevWeek} className="p-2 rounded-lg hover:bg-gray-100 text-gray-600">
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                            </button>
                            <button onClick={goToday} className="px-3 py-1.5 text-sm font-medium rounded-lg border border-gray-300 hover:bg-gray-50 text-gray-700">Today</button>
                            <button onClick={nextWeek} className="p-2 rounded-lg hover:bg-gray-100 text-gray-600">
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                            </button>
                        </div>
                    </div>

                    {/* Filters */}
                    <div className="flex flex-wrap items-center gap-3">
                        <select className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:ring-2 focus:ring-indigo-500 bg-white" value={filterEmployee} onChange={e => setFilterEmployee(e.target.value)}>
                            <option value="">All Employees</option>
                            {employees.map(e => <option key={e.employeeId} value={e.employeeId}>{e.firstName} {e.lastName}</option>)}
                        </select>
                        <select className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:ring-2 focus:ring-indigo-500 bg-white" value={filterClient} onChange={e => setFilterClient(e.target.value)}>
                            <option value="">All Clients</option>
                            {clients.map(c => <option key={c.clientId} value={c.clientId}>{c.firstName} {c.lastName}</option>)}
                        </select>
                        <select className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:ring-2 focus:ring-indigo-500 bg-white" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
                            <option value="">All Statuses</option>
                            <option value="open">Open</option>
                            <option value="confirmed">Confirmed</option>
                            <option value="cancelled">Cancelled</option>
                        </select>
                        {hasFilters && (
                            <button onClick={() => { setFilterEmployee(''); setFilterClient(''); setFilterStatus(''); }} className="text-xs text-indigo-600 hover:underline">
                                Clear filters
                            </button>
                        )}
                        <div className="ml-auto flex items-center gap-2">
                            {!loading && openCount > 0 && (
                                <span className="text-xs font-semibold bg-indigo-100 text-indigo-800 px-2.5 py-1 rounded-full">
                                    {openCount} open shift{openCount !== 1 ? 's' : ''}
                                </span>
                            )}
                            {!loading && openCount === 0 && totalCount > 0 && (
                                <span className="text-xs font-semibold bg-green-100 text-green-800 px-2.5 py-1 rounded-full">
                                    All {totalCount} shifts covered ✓
                                </span>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* ── Main content: sidebar + grid ────────────────────────────── */}
            <div className="flex-1 flex overflow-hidden px-4 sm:px-6 lg:px-8 py-4 gap-4 mx-auto w-full max-w-7xl">

                {/* ── Unscheduled panel ──────────────────────────────────── */}
                <div className={`shrink-0 transition-all duration-200 ${panelOpen ? 'w-56' : 'w-8'}`}>
                    <div className="bg-white rounded-xl border border-gray-200 shadow-sm h-full flex flex-col overflow-hidden">

                        {/* Panel header */}
                        <button
                            onClick={() => setPanelOpen(p => !p)}
                            className="flex items-center justify-between px-3 py-2.5 border-b border-gray-100 hover:bg-gray-50 transition-colors w-full text-left"
                        >
                            {panelOpen ? (
                                <>
                                    <span className="text-xs font-semibold text-gray-700 uppercase tracking-wide">
                                        Unscheduled
                                        {unscheduledShifts.length > 0 && (
                                            <span className="ml-1.5 inline-flex items-center justify-center w-4 h-4 rounded-full bg-indigo-600 text-white text-xs">{unscheduledShifts.length}</span>
                                        )}
                                    </span>
                                    <svg className="w-3.5 h-3.5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                                </>
                            ) : (
                                <svg className="w-3.5 h-3.5 text-gray-400 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                            )}
                        </button>

                        {/* Panel body */}
                        {panelOpen && (
                            <div className="flex-1 overflow-y-auto p-2 space-y-2">
                                {unscheduledShifts.length === 0 ? (
                                    <p className="text-xs text-gray-400 text-center py-4">All shifts scheduled ✓</p>
                                ) : (
                                    unscheduledShifts.map(s => (
                                        <UnscheduledCard
                                            key={s.shiftId}
                                            shift={s}
                                            onSchedule={() => navigate(`/shifts?edit=${s.shiftId}`)}
                                        />
                                    ))
                                )}
                            </div>
                        )}
                    </div>
                </div>

                {/* ── Calendar grid ──────────────────────────────────────── */}
                <div className="flex-1 overflow-x-auto">
                    {error && (
                        <div className="mb-4 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">{error}</div>
                    )}
                    {loading ? (
                        <div className="flex items-center justify-center h-64 text-gray-400 text-sm">Loading schedule…</div>
                    ) : (
                        <div className="grid grid-cols-7 gap-3 min-w-[560px]">
                            {days.map(day => {
                                const dayOccs = occurrencesForDay(day);
                                const today = isToday(day);
                                return (
                                    <div key={day.toISOString()} className="flex flex-col min-h-[200px]">
                                        <div className={`mb-2 rounded-lg px-2 py-1.5 text-center text-xs font-semibold ${today ? 'bg-indigo-600 text-white' : 'bg-white border border-gray-200 text-gray-600'}`}>
                                            {fmtDayHeading(day)}
                                        </div>
                                        <div className="flex flex-col gap-2">
                                            {dayOccs.length === 0 ? (
                                                <div className="rounded-lg border border-dashed border-gray-200 bg-white px-2 py-4 text-center text-xs text-gray-300">No shifts</div>
                                            ) : (
                                                dayOccs.map(occ => {
                                                    const isOpen = !occ.employee && occ.status !== 'cancelled';
                                                    const cardStyle = STATUS_CARD[occ.status] ?? STATUS_CARD.open;
                                                    return (
                                                        <button
                                                            key={occ.occurrenceId}
                                                            onClick={() => setSelected(occ)}
                                                            className={`w-full text-left rounded-lg border px-2.5 py-2 transition-all hover:shadow-md hover:-translate-y-0.5 ${cardStyle}`}
                                                        >
                                                            <p className="text-xs font-semibold opacity-80 leading-tight">
                                                                {fmtTime(occ.scheduledStart)} – {fmtTime(occ.scheduledEnd)}
                                                            </p>
                                                            <p className="text-xs font-bold mt-0.5 truncate leading-tight">
                                                                {occ.shift?.client?.firstName} {occ.shift?.client?.lastName}
                                                            </p>
                                                            <p className="text-xs opacity-60 truncate leading-tight">
                                                                {occ.shift?.service?.serviceName}
                                                            </p>
                                                            <div className="mt-1.5 flex items-center gap-1">
                                                                <span className={`inline-block w-1.5 h-1.5 rounded-full shrink-0 ${STATUS_DOT[occ.status]}`} />
                                                                {isOpen ? (
                                                                    <span className="text-xs font-bold text-indigo-700 uppercase tracking-wide">Open</span>
                                                                ) : (
                                                                    <span className="text-xs truncate opacity-75">
                                                                        {occ.employee ? `${occ.employee.firstName} ${occ.employee.lastName}` : '—'}
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </button>
                                                    );
                                                })
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>

            {selectedOccurrence && (
                <OccurrenceDetailModal
                    occurrence={selectedOccurrence}
                    employees={employees}
                    onClose={() => setSelected(null)}
                    onSaved={() => { setSelected(null); loadCalendar(); }}
                    onDeleted={() => { setSelected(null); loadCalendar(); }}
                />
            )}
        </div>
    );
}

