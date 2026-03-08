export default function ReportStats({ shifts, occurrences = [], weekStart, onPrevWeek, onNextWeek }) {

    if (!shifts || shifts.length === 0) {
        return (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6 mb-8 opacity-50">
                {[1,2,3,4,5,6].map(i => (
                    <div key={i} className="h-24 bg-[#e2e8f0] animate-pulse rounded-xl border border-[#e2e8f0]" />
                ))}
            </div>
        );
    }

    const weekEnd = weekStart ? new Date(weekStart) : null;
    if (weekEnd) weekEnd.setDate(weekStart.getDate() + 6);
    const fmtLabel = d => d ? d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' }) : '';
    const weekLabel = weekStart ? `${fmtLabel(weekStart)} – ${fmtLabel(weekEnd)}` : '';

    const relevant   = occurrences.filter(o => o.status === 'open' || o.status === 'confirmed');
    const confirmed  = relevant.filter(o => o.status === 'confirmed');
    const open       = relevant.filter(o => o.status === 'open');

    const totalOccs    = relevant.length;
    const confirmedCnt = confirmed.length;
    const openCnt      = open.length;
    const fillRate     = totalOccs > 0 ? Math.round((confirmedCnt / totalOccs) * 100) : 0;

    const calcHours = arr => arr.reduce((sum, o) => {
        return sum + (new Date(o.scheduledEnd) - new Date(o.scheduledStart)) / 3600000;
    }, 0);

    const openHours  = calcHours(open.filter(o => !o.employee));
    const totalHours = calcHours(relevant);

    const employeesActive = new Set(
        confirmed.filter(o => o.employee).map(o => o.employee.employeeId)
    ).size;

    const serviceCounts = shifts.reduce((acc, s) => {
        const name = s.service?.serviceName || 'Other';
        acc[name] = (acc[name] || 0) + 1;
        return acc;
    }, {});
    const topService = Object.entries(serviceCounts).sort((a, b) => b[1] - a[1])[0];

    const fillColor = fillRate >= 80 ? 'text-white' : fillRate >= 50 ? 'text-white' : 'text-white';

    return (
        <div className="mb-8">
            {/* Week navigator */}
            <div className="flex items-center gap-3 mb-3">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Week of</span>
                <div className="flex items-center gap-2 bg-white border border-[#e2e8f0] rounded-lg px-3 py-1 shadow-sm">
                    <button onClick={onPrevWeek} className="text-[#64748b] hover:text-[#0487D9] transition-colors p-0.5">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                    </button>
                    <span className="text-sm font-medium text-slate-700 w-36 text-center">{weekLabel}</span>
                    <button onClick={onNextWeek} className="text-[#64748b] hover:text-[#0487D9] transition-colors p-0.5">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
                {/* Fill Rate — featured card */}
                <div className="overflow-hidden rounded-xl bg-gradient-to-br from-[#0487D9] to-[#0CB1F2] px-4 py-5 shadow-sm sm:p-5">
                    <dt className="truncate text-xs font-semibold uppercase tracking-wide text-white/70">Fill Rate</dt>
                    <dd className={`mt-1 text-2xl font-bold tracking-tight ${fillColor}`}>{fillRate}%</dd>
                    <p className="text-xs text-white/60 mt-1 truncate">{confirmedCnt} of {totalOccs} visits</p>
                </div>

                {/* Unfilled Visits */}
                <div className="overflow-hidden rounded-xl bg-white px-4 py-5 shadow-sm border border-[#e2e8f0] border-t-2 border-t-[#0487D9] sm:p-5">
                    <dt className="truncate text-xs font-semibold uppercase tracking-wide text-slate-400">Unfilled Visits</dt>
                    <dd className={`mt-1 text-2xl font-bold tracking-tight ${openCnt > 0 ? 'text-[#ef4444]' : 'text-[#10b981]'}`}>{openCnt}</dd>
                    <p className="text-xs text-[#64748b] mt-1 truncate">{openHours % 1 === 0 ? openHours : openHours.toFixed(1)} hrs uncovered</p>
                </div>

                {/* Total Hours */}
                <div className="overflow-hidden rounded-xl bg-white px-4 py-5 shadow-sm border border-[#e2e8f0] border-t-2 border-t-[#0487D9] sm:p-5">
                    <dt className="truncate text-xs font-semibold uppercase tracking-wide text-slate-400">Total Hours</dt>
                    <dd className="mt-1 text-2xl font-bold tracking-tight text-slate-800">{totalHours % 1 === 0 ? totalHours : totalHours.toFixed(1)}h</dd>
                    <p className="text-xs text-[#64748b] mt-1 truncate">scheduled this week</p>
                </div>

                {/* Employees Active */}
                <div className="overflow-hidden rounded-xl bg-white px-4 py-5 shadow-sm border border-[#e2e8f0] border-t-2 border-t-[#0487D9] sm:p-5">
                    <dt className="truncate text-xs font-semibold uppercase tracking-wide text-slate-400">Employees Active</dt>
                    <dd className="mt-1 text-2xl font-bold tracking-tight text-[#0487D9]">{employeesActive}</dd>
                    <p className="text-xs text-[#64748b] mt-1 truncate">with confirmed visits</p>
                </div>

                {/* Visits This Week */}
                <div className="overflow-hidden rounded-xl bg-white px-4 py-5 shadow-sm border border-[#e2e8f0] border-t-2 border-t-[#0487D9] sm:p-5">
                    <dt className="truncate text-xs font-semibold uppercase tracking-wide text-slate-400">Visits This Week</dt>
                    <dd className="mt-1 text-2xl font-bold tracking-tight text-slate-800">{totalOccs}</dd>
                    <p className="text-xs text-[#64748b] mt-1 truncate">{weekLabel}</p>
                </div>

                {/* Top Service */}
                <div className="overflow-hidden rounded-xl bg-white px-4 py-5 shadow-sm border border-[#e2e8f0] border-t-2 border-t-[#0487D9] sm:p-5">
                    <dt className="truncate text-xs font-semibold uppercase tracking-wide text-slate-400">Top Service</dt>
                    <dd className="mt-1 text-lg font-bold tracking-tight text-slate-800 truncate">{topService ? topService[0] : 'N/A'}</dd>
                    <p className="text-xs text-[#64748b] mt-1 truncate">{topService ? `${topService[1]} schedule${topService[1] !== 1 ? 's' : ''}` : ''}</p>
                </div>
            </div>
        </div>
    );
}
