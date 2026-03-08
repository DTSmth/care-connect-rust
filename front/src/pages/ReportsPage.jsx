import { useState, useEffect, useMemo } from 'react';
import ReportStats from '../components/ReportStats';
import ReportView from '../components/ReportView';
import { getCalendar } from '../api/calendarApi';

function getMonday(d) {
    const day = d.getDay();
    const diff = day === 0 ? -6 : 1 - day;
    const mon = new Date(d);
    mon.setDate(d.getDate() + diff);
    mon.setHours(0, 0, 0, 0);
    return mon;
}

const fmtDate = d => d.toISOString().slice(0, 10);
const calcHours = (start, end) => (new Date(end) - new Date(start)) / 3600000;
const fmt1 = n => n % 1 === 0 ? String(n) : n.toFixed(1);
const fmtH = n => `${fmt1(n)}h`;

function recurrenceDaysPerWeek(rule) {
    if (!rule) return 1;
    if (rule === 'DAILY') return 7;
    if (rule.startsWith('WEEKLY:')) return rule.replace('WEEKLY:', '').split(',').length;
    return 1;
}

function shiftWeekHours(shift) {
    const durationH = shift.defaultDurationMinutes
        ? shift.defaultDurationMinutes / 60
        : (shift.totalHours || 0);
    return durationH * recurrenceDaysPerWeek(shift.recurrenceRule);
}

const REPORT_ICONS = {
    'client-roster': (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
        </svg>
    ),
    'open-shifts': (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 0 0 2.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 0 0-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 0 0 .75-.75 2.25 2.25 0 0 0-.1-.664m-5.8 0A2.251 2.251 0 0 1 13.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25Z" />
        </svg>
    ),
    'employee-utilization': (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z" />
        </svg>
    ),
    'service-fill-rate': (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 0 1 3 19.875v-6.75ZM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V8.625ZM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V4.125Z" />
        </svg>
    ),
    'zipcode-demand': (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1 1 15 0Z" />
        </svg>
    ),
    'client-coverage': (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12c0 1.268-.63 2.39-1.593 3.068a3.745 3.745 0 0 1-1.043 3.296 3.745 3.745 0 0 1-3.296 1.043A3.745 3.745 0 0 1 12 21c-1.268 0-2.39-.63-3.068-1.593a3.746 3.746 0 0 1-3.296-1.043 3.745 3.745 0 0 1-1.043-3.296A3.745 3.745 0 0 1 3 12c0-1.268.63-2.39 1.593-3.068a3.745 3.745 0 0 1 1.043-3.296 3.746 3.746 0 0 1 3.296-1.043A3.746 3.746 0 0 1 12 3c1.268 0 2.39.63 3.068 1.593a3.746 3.746 0 0 1 3.296 1.043 3.746 3.746 0 0 1 1.043 3.296A3.745 3.745 0 0 1 21 12Z" />
        </svg>
    ),
};

export default function ReportsPage({ clients, shifts }) {
    const [activeReport, setActiveReport] = useState(null);
    const [weekStart, setWeekStart] = useState(() => getMonday(new Date()));
    const [weekOccurrences, setWeekOccurrences] = useState([]);

    useEffect(() => {
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekStart.getDate() + 6);
        getCalendar(fmtDate(weekStart), fmtDate(weekEnd))
            .then(r => setWeekOccurrences(r.data))
            .catch(() => setWeekOccurrences([]));
    }, [weekStart]);

    const prevWeek = () => setWeekStart(d => { const n = new Date(d); n.setDate(d.getDate() - 7); return n; });
    const nextWeek = () => setWeekStart(d => { const n = new Date(d); n.setDate(d.getDate() + 7); return n; });

    const employeeUtilization = useMemo(() => {
        const map = {};
        weekOccurrences
            .filter(o => o.employee && o.status === 'confirmed')
            .forEach(o => {
                const id = o.employee.employeeId;
                if (!map[id]) map[id] = {
                    name: `${o.employee.firstName} ${o.employee.lastName}`,
                    shifts: 0, hours: 0, services: new Set(),
                };
                map[id].shifts++;
                map[id].hours += calcHours(o.scheduledStart, o.scheduledEnd);
                if (o.shift?.service?.serviceName) map[id].services.add(o.shift.service.serviceName);
            });
        return Object.values(map)
            .map(e => ({ ...e, services: [...e.services].join(', ') }))
            .sort((a, b) => b.hours - a.hours);
    }, [weekOccurrences]);

    const serviceFillRate = useMemo(() => {
        const map = {};
        const shiftIdsWithOccurrences = new Set(
            weekOccurrences.map(o => o.shift?.shiftId).filter(Boolean)
        );
        weekOccurrences
            .filter(o => o.status === 'open' || o.status === 'confirmed')
            .forEach(o => {
                const svc = o.shift?.service?.serviceName ?? 'Unknown';
                if (!map[svc]) map[svc] = { service: svc, confirmedH: 0, openH: 0 };
                const h = calcHours(o.scheduledStart, o.scheduledEnd);
                if (o.status === 'confirmed') map[svc].confirmedH += h;
                else map[svc].openH += h;
            });
        (shifts || [])
            .filter(s => s.openForMatching && !shiftIdsWithOccurrences.has(s.shiftId))
            .forEach(s => {
                const svc = s.service?.serviceName ?? 'Unknown';
                if (!map[svc]) map[svc] = { service: svc, confirmedH: 0, openH: 0 };
                map[svc].openH += shiftWeekHours(s);
            });
        return Object.values(map)
            .map(r => {
                const total = r.confirmedH + r.openH;
                return {
                    service: r.service,
                    totalHours: fmtH(total),
                    confirmedHours: fmtH(r.confirmedH),
                    openHours: fmtH(r.openH),
                    fillRate: total > 0 ? Math.round((r.confirmedH / total) * 100) + '%' : '—',
                    _openH: r.openH,
                };
            })
            .sort((a, b) => b._openH - a._openH);
    }, [weekOccurrences, shifts]);

    const zipcodeDemand = useMemo(() => {
        const map = {};
        weekOccurrences
            .filter(o => o.status === 'open' || o.status === 'confirmed')
            .forEach(o => {
                const zip = o.shift?.zipcode ?? 'Unknown';
                if (!map[zip]) map[zip] = { zipcode: zip, openH: 0, coveredH: 0 };
                const h = calcHours(o.scheduledStart, o.scheduledEnd);
                if (o.status === 'open') map[zip].openH += h;
                else map[zip].coveredH += h;
            });
        return Object.values(map)
            .map(r => ({
                zipcode: r.zipcode,
                openHours: fmtH(r.openH),
                coveredHours: fmtH(r.coveredH),
                totalHours: fmtH(r.openH + r.coveredH),
                fillRate: r.openH + r.coveredH > 0
                    ? Math.round((r.coveredH / (r.openH + r.coveredH)) * 100) + '%'
                    : '—',
                _openH: r.openH,
            }))
            .sort((a, b) => b._openH - a._openH);
    }, [weekOccurrences]);

    const clientCoverage = useMemo(() => {
        const map = {};
        weekOccurrences
            .filter(o => o.status === 'open' || o.status === 'confirmed')
            .forEach(o => {
                const c = o.shift?.client;
                if (!c) return;
                const id = c.clientId ?? `${c.firstName}${c.lastName}`;
                if (!map[id]) map[id] = { client: `${c.firstName} ${c.lastName}`, confirmedH: 0, openH: 0 };
                const h = calcHours(o.scheduledStart, o.scheduledEnd);
                if (o.status === 'confirmed') map[id].confirmedH += h;
                else map[id].openH += h;
            });
        return Object.values(map)
            .map(r => {
                const total = r.confirmedH + r.openH;
                return {
                    client: r.client,
                    totalHours: fmtH(total),
                    confirmedHours: fmtH(r.confirmedH),
                    openHours: fmtH(r.openH),
                    coverage: total > 0 ? Math.round((r.confirmedH / total) * 100) + '%' : '—',
                    _openH: r.openH,
                };
            })
            .sort((a, b) => b._openH - a._openH || a.client.localeCompare(b.client));
    }, [weekOccurrences]);

    const reportTypes = [
        {
            id: 'client-roster',
            title: 'Active Client Roster',
            description: 'Full list of active clients with care needs and contact info.',
            columns: [
                { header: 'Full Name', render: r => `${r.firstName} ${r.lastName}` },
                { header: 'Address', key: 'address1' },
                { header: 'Phone', key: 'phoneNumber' },
                { header: 'Personal Care', render: r => r.hasPersonalCare ? 'Yes' : 'No' },
                { header: 'Lifting', render: r => r.hasLifting ? 'Yes' : 'No' },
            ],
            data: clients,
        },
        {
            id: 'open-shifts',
            title: 'Shift Schedule Overview',
            description: 'All recurring shift schedules with recurrence patterns and current open-for-matching status.',
            columns: [
                { header: 'Service', render: r => r.service?.serviceName },
                { header: 'Client', render: r => r.client ? `${r.client.firstName} ${r.client.lastName}` : '—' },
                { header: 'Zip', key: 'zipcode' },
                { header: 'Schedule', render: r => {
                    if (!r.defaultStartTime) return `${r.totalHours}h (no time set)`;
                    const [h, m] = r.defaultStartTime.split(':');
                    const hour = parseInt(h, 10);
                    const label = `${hour % 12 || 12}:${m} ${hour >= 12 ? 'PM' : 'AM'}`;
                    const dur = r.defaultDurationMinutes
                        ? ` · ${Math.floor(r.defaultDurationMinutes/60)}h${r.defaultDurationMinutes%60 ? ` ${r.defaultDurationMinutes%60}m` : ''}`
                        : '';
                    return `${label}${dur}`;
                }},
                { header: 'Recurrence', render: r => {
                    if (!r.recurrenceRule) return 'One-time';
                    if (r.recurrenceRule === 'DAILY') return 'Daily';
                    return r.recurrenceRule.replace('WEEKLY:', '').split(',').join(', ');
                }},
                { header: 'Status', render: r => r.openForMatching ? 'Open for Matching' : 'Filled / Not Matching' },
            ],
            data: shifts,
        },
        {
            id: 'employee-utilization',
            title: 'Employee Utilization',
            description: 'Hours and shifts per employee for the selected week.',
            columns: [
                { header: 'Employee', key: 'name' },
                { header: 'Visits This Week', key: 'shifts' },
                { header: 'Hours This Week', render: r => `${fmt1(r.hours)}h` },
                { header: 'Services Covered', key: 'services' },
            ],
            data: employeeUtilization,
        },
        {
            id: 'service-fill-rate',
            title: 'Service Fill Rate',
            description: 'Billable hours by service type — confirmed vs open.',
            columns: [
                { header: 'Service', key: 'service' },
                { header: 'Total Hours', key: 'totalHours' },
                { header: 'Confirmed Hours', key: 'confirmedHours' },
                { header: 'Open Hours', key: 'openHours' },
                { header: 'Fill Rate', key: 'fillRate' },
            ],
            data: serviceFillRate,
        },
        {
            id: 'zipcode-demand',
            title: 'Open Hours by Location',
            description: 'Unfilled billable hours by zipcode — shows where care demand is unmet.',
            columns: [
                { header: 'Zipcode', key: 'zipcode' },
                { header: 'Open Hours', key: 'openHours' },
                { header: 'Covered Hours', key: 'coveredHours' },
                { header: 'Total Hours', key: 'totalHours' },
                { header: 'Fill Rate', key: 'fillRate' },
            ],
            data: zipcodeDemand,
        },
        {
            id: 'client-coverage',
            title: 'Client Coverage',
            description: 'Confirmed vs open billable hours per client — flags clients at risk of care gaps.',
            columns: [
                { header: 'Client', key: 'client' },
                { header: 'Total Hours', key: 'totalHours' },
                { header: 'Confirmed Hours', key: 'confirmedHours' },
                { header: 'Open Hours', key: 'openHours' },
                { header: 'Coverage Rate', key: 'coverage' },
            ],
            data: clientCoverage,
        },
    ];

    return (
        <div className="py-8 px-6 lg:px-8 min-h-screen">
            {/* Header */}
            <div className="flex justify-between items-start mb-8 print:hidden">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">Reports & Analytics</h1>
                    <p className="text-sm text-[#64748b] mt-1">Staffing intelligence for the selected week.</p>
                </div>
                {activeReport && (
                    <button
                        onClick={() => window.print()}
                        className="bg-[#0487D9] text-white px-5 py-2.5 rounded-lg font-semibold hover:bg-[#0363A0] shadow-sm transition-all flex items-center gap-2"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6.72 13.829c-.24.03-.48.062-.72.096m.72-.096a42.415 42.415 0 0 1 10.56 0m-10.56 0L6.34 18m10.94-4.171c.24.03.48.062.72.096m-.72-.096L17.66 18m0 0 .229 2.523a1.125 1.125 0 0 1-1.12 1.227H7.231a1.125 1.125 0 0 1-1.12-1.227L6.34 18m11.318 0h1.091A2.25 2.25 0 0 0 21 15.75V9.456c0-1.081-.768-2.015-1.837-2.175a48.055 48.055 0 0 0-1.913-.247M6.34 18H5.25A2.25 2.25 0 0 1 3 15.75V9.456c0-1.081.768-2.015 1.837-2.175a48.041 48.041 0 0 1 1.913-.247m10.5 0a48.536 48.536 0 0 0-10.5 0m10.5 0V3.375c0-.621-.504-1.125-1.125-1.125h-8.25c-.621 0-1.125.504-1.125 1.125v3.656l10.5 0Z" />
                        </svg>
                        Print Report
                    </button>
                )}
            </div>

            {/* KPI Cards */}
            <div className="print:hidden">
                <ReportStats
                    shifts={shifts}
                    occurrences={weekOccurrences}
                    weekStart={weekStart}
                    onPrevWeek={prevWeek}
                    onNextWeek={nextWeek}
                />
            </div>

            {/* Report Selector */}
            <div className="mb-8 print:hidden">
                <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4">Printable Reports</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {reportTypes.map(report => (
                        <button
                            key={report.id}
                            onClick={() => setActiveReport(report)}
                            className={`p-5 text-left rounded-xl border-2 transition-all ${
                                activeReport?.id === report.id
                                    ? 'border-[#0487D9] bg-white shadow-md ring-4 ring-[#99E2F2]/50'
                                    : 'border-white bg-white hover:border-[#e2e8f0] shadow-sm hover:shadow-md'
                            }`}
                        >
                            <div className="flex items-start gap-3 mb-2">
                                <div className={`p-2 rounded-lg shrink-0 ${activeReport?.id === report.id ? 'bg-[#0487D9] text-white' : 'bg-[#F2F2F2] text-[#64748b]'}`}>
                                    {REPORT_ICONS[report.id]}
                                </div>
                                <h3 className="font-bold text-slate-800 text-sm leading-snug mt-1">{report.title}</h3>
                            </div>
                            <p className="text-xs text-[#64748b] leading-relaxed">{report.description}</p>
                            <p className={`text-xs font-semibold mt-2 ${activeReport?.id === report.id ? 'text-[#0487D9]' : 'text-[#64748b]'}`}>
                                {report.data.length} record{report.data.length !== 1 ? 's' : ''}
                            </p>
                        </button>
                    ))}
                </div>
            </div>

            {/* Report Table */}
            <div className="mt-4">
                {activeReport ? (
                    <ReportView
                        title={activeReport.title}
                        columns={activeReport.columns}
                        data={activeReport.data}
                    />
                ) : (
                    <div className="text-center py-20 bg-white rounded-2xl border-2 border-dashed border-[#e2e8f0] print:hidden">
                        <div className="mx-auto h-12 w-12 text-[#64748b]/40 mb-4">
                            <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.5l5 5V19a2 2 0 01-2 2z" />
                            </svg>
                        </div>
                        <p className="text-slate-600 font-medium">No report selected</p>
                        <p className="text-[#64748b] text-sm mt-1">Choose a report above to view and print.</p>
                    </div>
                )}
            </div>
        </div>
    );
}
