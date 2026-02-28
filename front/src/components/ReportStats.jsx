export default function ReportStats({ shifts }) {

    if (!shifts || shifts.length === 0) {
        return (
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-3 mb-8 opacity-50">
                {[1, 2, 3].map((i) => (
                    <div key={i} className="h-24 bg-gray-200 animate-pulse rounded-xl border border-gray-200"></div>
                ))}
            </div>
        );
    }

    const totalOpenHours = shifts
        .filter(s => s.available)
        .reduce((sum, s) => sum + (s.totalHours || 0), 0);

    const serviceCounts = shifts.reduce((acc, s) => {
        const name = s.service?.serviceName || 'Other';
        acc[name] = (acc[name] || 0) + 1;
        return acc;
    }, {});

    const topService = Object.entries(serviceCounts)
        .sort((a, b) => b[1] - a[1])[0];

    return (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-3 mb-8">
            {/* Total Hours Card */}
            <div className="overflow-hidden rounded-xl bg-white px-4 py-5 shadow-sm border border-gray-200 sm:p-6">
                <dt className="truncate text-sm font-medium text-gray-500">Total Open Hours</dt>
                <dd className="mt-1 text-3xl font-semibold tracking-tight text-indigo-600">{totalOpenHours} hrs</dd>
            </div>

            {/* High Demand Service Card */}
            <div className="overflow-hidden rounded-xl bg-white px-4 py-5 shadow-sm border border-gray-200 sm:p-6">
                <dt className="truncate text-sm font-medium text-gray-500">High Demand Service</dt>
                <dd className="mt-1 text-3xl font-semibold tracking-tight text-gray-900">
                    {topService ? topService[0] : 'N/A'}
                </dd>
                <p className="text-xs text-gray-400 mt-1">{topService ? topService[1] : 0} active shifts</p>
            </div>

            {/* Fill Rate Card */}
            <div className="overflow-hidden rounded-xl bg-white px-4 py-5 shadow-sm border border-gray-200 sm:p-6">
                <dt className="truncate text-sm font-medium text-gray-500">Shift Fill Rate</dt>
                <dd className="mt-1 text-3xl font-semibold tracking-tight text-green-600">
                    {shifts.length > 0
                        ? Math.round((shifts.filter(s => !s.available).length / shifts.length) * 100)
                        : 0}%
                </dd>
            </div>
        </div>
    );
}