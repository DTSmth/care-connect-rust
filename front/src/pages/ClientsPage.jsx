import { useEffect, useState } from 'react';
import { getAllClients } from '../api/clientApi';
import ClientTable from '../components/ClientTable';

export default function ClientsPage() {
    const [clients, setClients] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        getAllClients()
            .then(res => {
                setClients(res.data);
                setLoading(false);
            })
            .catch(err => {
                console.error(err);
                setLoading(false);
            });
    }, []);

    const filteredClients = clients.filter(c =>
        `${c.firstName} ${c.lastName}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.phoneNumber.includes(searchTerm)
    );

    return (
        <div className="py-8 px-6 lg:px-8">
            {/* Page Header */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">Clients</h1>
                    <p className="text-sm text-[#64748b] mt-0.5">{clients.length} total clients</p>
                </div>
                {/* Search */}
                <div className="relative w-full md:w-72">
                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                        <svg className="h-4 w-4 text-[#64748b]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                    </div>
                    <input
                        type="text"
                        className="block w-full rounded-lg border border-[#cbd5e1] py-2 pl-9 pr-3 text-slate-900 placeholder:text-[#64748b] focus:outline-none focus:ring-2 focus:ring-[#0487D9] focus:border-transparent text-sm bg-white"
                        placeholder="Search by name or phone…"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            {/* Table card */}
            <div className="bg-white rounded-xl shadow-sm border border-[#e2e8f0] overflow-hidden">
                {loading ? (
                    <div className="flex items-center justify-center py-16 text-[#64748b] text-sm">Loading clients…</div>
                ) : (
                    <ClientTable clients={filteredClients} />
                )}
            </div>
        </div>
    );
}
