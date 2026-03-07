export default function ReportStats({ shifts, occurrences = [], weekStart, onPrevWeek, onNextWeek }) {

    if (!shifts || shifts.length === 0) {
        return (
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-3 mb-8 opacity-50">
                {[1, 2, 3].map((i) => (
                    <div key={i} className="h-24 bg-gray-200 animate-pulse rounded-xl border border-gray-200"></div>
                ))}
            </div>
        );
    }

    // Week label
    const weekEnd = weekStart ? new Date(weekStart) : null;
    if (weekEnd) weekEnd.setDate(weekStart.getDate() + 6);
    const fmtLabel = d => d ? d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' }) : '';
    const weekLabel = weekStart ? `${fmtLabel(weekStart)} – ${fmtLabel(weekEnd)}` : '';

    // Occurrence-based metrics for the selected week
    const occHoursOpen = occurrences
        .filter(o => !o.employee && o.status === 'open')
        .reduce((sum, o) => {
            const hrs = (new Date(o.scheduledEnd) - new Date(o.scheduledStart)) / 3600000;
            return sum + hrs;
        }, 0);

    const totalOccs = occurrences.filter(o => o.status === 'open' || o.status === 'confirmed').length;
    const confirmedOccs = occurrences.filter(o => o.status === 'confirmed').length;
    const fillRate = totalOccs > 0 ? Math.round((confirmedOccs / totalOccs) * 100) : 0;

    const serviceCounts = shifts.reduce((acc, s) => {
        const name = s.service?.serviceName || 'Other';
        acc[name] = (acc[name] || 0) + 1;
        return acc;
    }, {});

    const topService = Object.entries(serviceCounts)
        .sort((a, b) => b[1] - a[1])[0];

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

            <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
                {/* Open Hours This Week */}
                <div className="overflow-hidden rounded-xl bg-white px-4 py-5 shadow-sm border border-gray-200 sm:p-6">
                    <dt className="truncate text-sm font-medium text-gray-500">Open Hours This Week</dt>
                    <dd className="mt-1 text-3xl font-semibold tracking-tight text-indigo-600">
                        {occHoursOpen % 1 === 0 ? occHoursOpen : occHoursOpen.toFixed(1)} hrs
                    </dd>
                    <p className="text-xs text-gray-400 mt-1">{weekLabel}</p>
                </div>

                {/* High Demand Service */}
                <div className="overflow-hidden rounded-xl bg-white px-4 py-5 shadow-sm border border-gray-200 sm:p-6">
                    <dt className="truncate text-sm font-medium text-gray-500">High Demand Service</dt>
                    <dd className="mt-1 text-3xl font-semibold tracking-tight text-gray-900">
                        {topService ? topService[0] : 'N/A'}
                    </dd>
                    <p className="text-xs text-gray-400 mt-1">{topService ? topService[1] : 0} active shifts</p>
                </div>

                {/* Weekly Fill Rate */}
                <div className="overflow-hidden rounded-xl bg-white px-4 py-5 shadow-sm border border-gray-200 sm:p-6">
                    <dt className="truncate text-sm font-medium text-gray-500">Weekly Fill Rate</dt>
                    <dd className={`mt-1 text-3xl font-semibold tracking-tight ${fillRate >= 80 ? 'text-green-600' : fillRate >= 50 ? 'text-blue-600' : 'text-indigo-600'}`}>
                        {fillRate}%
                    </dd>
                    <p className="text-xs text-gray-400 mt-1">{confirmedOccs} of {totalOccs} slots confirmed</p>
                </div>
            </div>
        </div>
    );
}