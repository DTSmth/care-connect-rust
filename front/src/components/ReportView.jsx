export default function ReportView({ title, columns, data }) {
    const timestamp = new Date().toLocaleString();

    return (
        <div className="bg-white p-8 shadow-lg border border-gray-200 rounded-sm max-w-5xl mx-auto my-8 print:shadow-none print:border-none print:m-0">
            {/* Report Header */}
            <div className="flex justify-between items-start border-b-2 border-gray-900 pb-4 mb-6">
                <div>
                    <h1 className="text-2xl font-bold uppercase tracking-wider text-gray-900">{title}</h1>
                    <p className="text-sm text-gray-500 mt-1">CarePortal Internal Document</p>
                </div>
                <div className="text-right">
                    <p className="text-xs font-mono text-gray-400 uppercase">Generated On</p>
                    <p className="text-sm font-medium text-gray-900">{timestamp}</p>
                </div>
            </div>

            {/* Report Table */}
            <table className="w-full text-left text-xs border-collapse">
                <thead>
                <tr className="border-b border-gray-300 bg-gray-50">
                    {columns.map((col, i) => (
                        <th key={i} className="py-3 px-2 font-bold text-gray-700 uppercase">{col.header}</th>
                    ))}
                </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                {data.map((row, rowIndex) => (
                    <tr key={rowIndex} className="hover:bg-gray-50">
                        {columns.map((col, colIndex) => (
                            <td key={colIndex} className="py-3 px-2 text-gray-600">
                                {col.render ? col.render(row) : row[col.key]}
                            </td>
                        ))}
                    </tr>
                ))}
                </tbody>
            </table>

            {/* Footer for Page Numbers/Signatures when printed */}
            <div className="mt-12 pt-4 border-t border-gray-100 flex justify-between text-[10px] text-gray-400 uppercase">
                <span>Confidential - For Authorized Personnel Only</span>
                <span>Page 1 of 1</span>
            </div>
        </div>
    );
}