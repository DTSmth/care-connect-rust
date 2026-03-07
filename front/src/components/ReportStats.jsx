export default function ReportStats({ shifts, occurrences = [], weekStart, onPrevWeek, onNextWeek }) {

    if (!shifts || shifts.length === 0) {
        return (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6 mb-8 opacity-50">
                {[1,2,3,4,5,6].map(i => (
                    <div key={i} className="h-24 bg-gray-200 animate-pulse rounded-xl border border-gray-200" />
                ))}
            </div>
        );
    }

    const weekEnd = weekStart ? new Date(weekStart) : null;
    if (weekEnd) weekEnd.setDate(weekStart.getDate() + 6);
    const fmtLabel = d => d ? d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' }) : '';
    const weekLabel = weekStart ? `${fmtLabel(weekStart)} – ${fmtLabel(weekEnd)}` : '';

    // Only count schedulable occurrences (ignore cancelled etc.)
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

    const fillColor = fillRate >= 80 ? 'text-green-600' : fillRate >= 50 ? 'text-amber-500' : 'text-red-600';

    const Card = ({ label, value, sub, valueClass = 'text-gray-900' }) => (
        <div className="overflow-hidden rounded-xl bg-white px-4 py-5 shadow-sm border border-gray-200 sm:p-5">
            <dt className="truncate text-xs font-semibold uppercase tracking-wide text-gray-400">{label}</dt>
            <dd className={`mt-1 text-2xl font-bold tracking-tight ${valueClass}`}>{value}</dd>
            {sub && <p className="text-xs text-gray-400 mt-1 truncate">{sub}</p>}
        </div>
    );

    return (
        <div className="mb-8">
            {/* Week navigator */}
            <div className="flex items-center gap-3 mb-3">
                <span className="text-sm font-semibold text-gray-400 uppercase tracking-widest">Week of</span>
                <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-lg px-3 py-1 shadow-sm">
                    <button onClick={onPrevWeek} className="text-gray-400 hover:text-indigo-600 transition-colors p-0.5">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                    </button>
                    <span className="text-sm font-medium text-gray-700 w-36 text-center">{weekLabel}</span>
                    <button onClick={onNextWeek} className="text-gray-400 hover:text-indigo-600 transition-colors p-0.5">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
                <Card
                    label="Fill Rate"
                    value={`${fillRate}%`}
                    sub={`${confirmedCnt} of ${totalOccs} visits`}
                    valueClass={fillColor}
                />
                <Card
                    label="Unfilled Visits"
                    value={openCnt}
                    sub={`${openHours % 1 === 0 ? openHours : openHours.toFixed(1)} hrs uncovered`}
                    valueClass={openCnt > 0 ? 'text-red-600' : 'text-green-600'}
                />
                <Card
                    label="Total Hours"
                    value={`${totalHours % 1 === 0 ? totalHours : totalHours.toFixed(1)}h`}
                    sub="scheduled this week"
                />
                <Card
                    label="Employees Active"
                    value={employeesActive}
                    sub="with confirmed visits"
                    valueClass="text-indigo-600"
                />
                <Card
                    label="Visits This Week"
                    value={totalOccs}
                    sub={weekLabel}
                />
                <Card
                    label="Top Service"
                    value={topService ? topService[0] : 'N/A'}
                    sub={topService ? `${topService[1]} schedule${topService[1] !== 1 ? 's' : ''}` : ''}
                />
            </div>
        </div>
    );
}
