import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';

function SortIcon({ active, dir }) {
    if (!active) return <span className="ml-1 text-slate-300 select-none">⇅</span>;
    return <span className="ml-1 text-[#0487D9] select-none">{dir === 'asc' ? '↑' : '↓'}</span>;
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
        <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-sm">
                <thead className="bg-[#F2F2F2] border-b border-[#e2e8f0]">
                <tr>
                    <th className="px-6 py-3.5 text-xs font-semibold uppercase tracking-wider text-slate-500 cursor-pointer select-none hover:text-[#0487D9] transition-colors"
                        onClick={() => toggleSort('name')}>
                        Client Name
                        <SortIcon active={sort.key === 'name'} dir={sort.dir} />
                    </th>
                    <th className="px-6 py-3.5 text-xs font-semibold uppercase tracking-wider text-slate-500 cursor-pointer select-none hover:text-[#0487D9] transition-colors"
                        onClick={() => toggleSort('careNeeds')}>
                        Care Needs
                        <SortIcon active={sort.key === 'careNeeds'} dir={sort.dir} />
                    </th>
                    <th className="px-6 py-3.5 text-xs font-semibold uppercase tracking-wider text-slate-500">Contact Info</th>
                    <th className="px-6 py-3.5 text-xs font-semibold uppercase tracking-wider text-slate-500 cursor-pointer select-none hover:text-[#0487D9] transition-colors"
                        onClick={() => toggleSort('zipcode')}>
                        Address
                        <SortIcon active={sort.key === 'zipcode'} dir={sort.dir} />
                    </th>
                </tr>
                </thead>
                <tbody className="divide-y divide-[#e2e8f0]">
                {sorted.length === 0 ? (
                    <tr>
                        <td colSpan="4" className="px-6 py-12 text-center text-[#64748b]">No clients found.</td>
                    </tr>
                ) : sorted.map((c, i) => (
                    <tr key={c.clientId} className={`hover:bg-[#f0faff] transition-colors ${i % 2 === 1 ? 'bg-[#fafafa]' : 'bg-white'}`}>
                        <td className="px-6 py-4 font-medium text-slate-800">
                            <button
                                onClick={() => navigate(`/shifts?clientId=${c.clientId}`)}
                                className="text-[#0487D9] hover:text-[#0363A0] hover:underline text-left font-semibold transition-colors"
                            >
                                {c.firstName} {c.lastName}
                            </button>
                        </td>

                        <td className="px-6 py-4">
                            <div className="flex flex-wrap gap-1.5">
                                {c.hasPersonalCare && (
                                    <span className="inline-flex items-center rounded-full bg-[#99E2F2] px-2.5 py-0.5 text-xs font-medium text-[#0487D9]">
                                        Personal Care
                                    </span>
                                )}
                                {c.hasLifting && (
                                    <span className="inline-flex items-center rounded-full bg-[#0FC9F2]/20 px-2.5 py-0.5 text-xs font-medium text-[#0487D9]">
                                        Lifting
                                    </span>
                                )}
                                {!c.hasPersonalCare && !c.hasLifting && (
                                    <span className="text-[#64748b] italic text-xs">None</span>
                                )}
                            </div>
                        </td>

                        <td className="px-6 py-4 tabular-nums text-slate-600 text-sm">
                            {c.phoneNumber}
                        </td>

                        <td className="px-6 py-4">
                            <div className="text-slate-800 text-sm">{c.address1}</div>
                            {c.address2 && <div className="text-xs text-[#64748b]">{c.address2}</div>}
                            <div className="text-xs font-mono text-[#64748b]">{c.zipcode}</div>
                        </td>
                    </tr>
                ))}
                </tbody>
            </table>
        </div>
    );
}
