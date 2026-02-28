import { useState } from 'react';
import ReportStats from '../components/ReportStats';
import ReportView from '../components/ReportView';

export default function ReportsPage({ clients, shifts }) {
    const [activeReport, setActiveReport] = useState(null);

    // This configuration defines what data goes into each formal report table
    const reportTypes = [
        {
            id: 'client-roster',
            title: 'Active Client Roster',
            columns: [
                { header: 'Full Name', render: (r) => `${r.firstName} ${r.lastName}` },
                { header: 'Address', key: 'address1' },
                { header: 'Phone', key: 'phoneNumber' },
                { header: 'Personal Care', render: (r) => r.hasPersonalCare ? 'Yes' : 'No' }
            ],
            data: clients
        },
        {
            id: 'open-shifts',
            title: 'Shift Availability Summary',
            columns: [
                { header: 'Service', render: (r) => r.service?.serviceName },
                { header: 'Zip', key: 'zipcode' },
                { header: 'Hours', key: 'totalHours' },
                { header: 'Status', render: (r) => r.available ? 'Available' : 'Filled' }
            ],
            data: shifts
        }
    ];

    return (
        <div className="py-8 px-4 sm:px-6 lg:px-8 bg-gray-50 min-h-screen">
            <div className="max-w-7xl mx-auto">

                {/* 1. Header Section - Always hidden when printing */}
                <div className="flex justify-between items-center mb-8 print:hidden">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Reports & Analytics</h1>
                        <p className="text-sm text-gray-500 mt-1">Real-time data insights and formal documentation.</p>
                    </div>
                    {activeReport && (
                        <button
                            onClick={() => window.print()}
                            className="bg-indigo-600 text-white px-5 py-2.5 rounded-lg font-semibold hover:bg-indigo-700 shadow-sm transition-all flex items-center gap-2"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M6.72 13.829c-.24.03-.48.062-.72.096m.72-.096a42.415 42.415 0 0 1 10.56 0m-10.56 0L6.34 18m10.94-4.171c.24.03.48.062.72.096m-.72-.096L17.66 18m0 0 .229 2.523a1.125 1.125 0 0 1-1.12 1.227H7.231a1.125 1.125 0 0 1-1.12-1.227L6.34 18m11.318 0h1.091A2.25 2.25 0 0 0 21 15.75V9.456c0-1.081-.768-2.015-1.837-2.175a48.055 48.055 0 0 0-1.913-.247M6.34 18H5.25A2.25 2.25 0 0 1 3 15.75V9.456c0-1.081.768-2.015 1.837-2.175a48.041 48.041 0 0 1 1.913-.247m10.5 0a48.536 48.536 0 0 0-10.5 0m10.5 0V3.375c0-.621-.504-1.125-1.125-1.125h-8.25c-.621 0-1.125.504-1.125 1.125v3.656l10.5 0Z" />
                            </svg>
                            Print Report
                        </button>
                    )}
                </div>

                {/* 2. Top-Level Stats - Hidden when printing */}
                <div className="print:hidden">
                    <ReportStats shifts={shifts} />
                </div>

                {/* 3. Report Selector Tabs - Hidden when printing */}
                <div className="mb-8 print:hidden">
                    <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-widest mb-4">Select Report Type</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {reportTypes.map(report => (
                            <button
                                key={report.id}
                                onClick={() => setActiveReport(report)}
                                className={`p-6 text-left rounded-xl border-2 transition-all ${
                                    activeReport?.id === report.id
                                        ? 'border-indigo-600 bg-white shadow-md ring-4 ring-indigo-50'
                                        : 'border-white bg-white hover:border-gray-200 shadow-sm'
                                }`}
                            >
                                <h3 className="font-bold text-gray-900 text-lg">{report.title}</h3>
                                <p className="text-sm text-gray-500 mt-1">Generate a comprehensive {report.id.replace('-', ' ')}.</p>
                            </button>
                        ))}
                    </div>
                </div>

                {/* 4. The Report View (This IS visible when printing) */}
                <div className="mt-12">
                    {activeReport ? (
                        <ReportView
                            title={activeReport.title}
                            columns={activeReport.columns}
                            data={activeReport.data}
                        />
                    ) : (
                        <div className="text-center py-24 bg-white rounded-2xl border-2 border-dashed border-gray-200 print:hidden">
                            <div className="mx-auto h-12 w-12 text-gray-300 mb-4">
                                <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.5l5 5V19a2 2 0 01-2 2z" />
                                </svg>
                            </div>
                            <p className="text-gray-500 font-medium">No report selected</p>
                            <p className="text-gray-400 text-sm">Choose a report from the options above to view details.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}