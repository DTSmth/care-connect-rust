import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';

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

export default function ClientTable({ clients }) {
    const navigate = useNavigate();
    const [sort, toggleSort] = useSortable('name', 'asc');

    const sorted = useMemo(() => {
        const data = [...clients];
        const { key, dir } = sort;
        const mul = dir === 'asc' ? 1 : -1;

        data.sort((a, b) => {
            switch (key) {
                case 'name': {
                    const la = `${a.lastName} ${a.firstName}`.toLowerCase();
                    const lb = `${b.lastName} ${b.firstName}`.toLowerCase();
                    return mul * la.localeCompare(lb);
                }
                case 'careNeeds': {
                    // Score: personal care = +2, lifting = +1; higher complexity sorts first (asc)
                    const score = c => (c.hasPersonalCare ? 2 : 0) + (c.hasLifting ? 1 : 0);
                    return mul * (score(b) - score(a));
                }
                case 'zipcode': {
                    return mul * (a.zipcode ?? '').localeCompare(b.zipcode ?? '');
                }
                default: return 0;
            }
        });
        return data;
    }, [clients, sort]);

    return (
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
            <table className="w-full border-collapse text-left text-sm text-gray-500">
                <thead className="bg-gray-50 text-xs font-semibold uppercase tracking-wider text-gray-700">
                <tr>
                    <th className="px-6 py-4 cursor-pointer select-none hover:text-indigo-600"
                        onClick={() => toggleSort('name')}>
                        Client Name
                        <SortIcon active={sort.key === 'name'} dir={sort.dir} />
                    </th>
                    <th className="px-6 py-4 cursor-pointer select-none hover:text-indigo-600"
                        onClick={() => toggleSort('careNeeds')}>
                        Care Needs
                        <SortIcon active={sort.key === 'careNeeds'} dir={sort.dir} />
                    </th>
                    <th className="px-6 py-4">Contact Info</th>
                    <th className="px-6 py-4 cursor-pointer select-none hover:text-indigo-600"
                        onClick={() => toggleSort('zipcode')}>
                        Address
                        <SortIcon active={sort.key === 'zipcode'} dir={sort.dir} />
                    </th>
                </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                {sorted.map((c) => (
                    <tr key={c.clientId} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4 font-medium text-gray-900">
                            <button
                                onClick={() => navigate(`/shifts?clientId=${c.clientId}`)}
                                className="text-indigo-600 hover:text-indigo-900 hover:underline text-left"
                            >
                                {c.firstName} {c.lastName}
                            </button>
                        </td>

                        <td className="px-6 py-4">
                            <div className="flex flex-wrap gap-2">
                                {c.hasPersonalCare && (
                                    <span className="inline-flex items-center rounded-md bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700 ring-1 ring-inset ring-blue-700/10">
                                        Personal Care
                                    </span>
                                )}
                                {c.hasLifting && (
                                    <span className="inline-flex items-center rounded-md bg-purple-50 px-2 py-1 text-xs font-medium text-purple-700 ring-1 ring-inset ring-purple-700/10">
                                        Lifting
                                    </span>
                                )}
                                {!c.hasPersonalCare && !c.hasLifting && (
                                    <span className="text-gray-400 italic">None</span>
                                )}
                            </div>
                        </td>

                        <td className="px-6 py-4 tabular-nums">
                            {c.phoneNumber}
                        </td>

                        <td className="px-6 py-4">
                            <div className="text-gray-900">{c.address1}</div>
                            {c.address2 && <div className="text-xs text-gray-400">{c.address2}</div>}
                            <div className="text-xs font-mono">{c.zipcode}</div>
                        </td>
                    </tr>
                ))}
                </tbody>
            </table>
        </div>
    );
}
