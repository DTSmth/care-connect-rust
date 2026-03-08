import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { createShift, deleteShift, updateShift, setShiftMatching } from '../api/shiftApi';
import ShiftTable from '../components/ShiftTable';
import CreateShiftModal from '../components/CreateShiftModal';
import MatchShiftModal from '../components/MatchShiftModal';
import AssignEmployeeModal from '../components/AssignEmployeeModal';

export default function ShiftsPage({ shifts, clients, services, users, employees, refreshData }) {
    const [searchTerm, setSearchTerm] = useState('');
    const [searchParams, setSearchParams] = useSearchParams();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingShift, setEditingShift] = useState(null);
    const [isMatchModalOpen, setIsMatchModalOpen] = useState(false);
    const [assigningShift, setAssigningShift] = useState(null);

    const clientIdFilter   = searchParams.get('clientId');
    const employeeIdFilter = searchParams.get('employeeId');
    const editIdParam      = searchParams.get('edit');

    useEffect(() => {
        if (!editIdParam || !shifts?.length) return;
        const shift = shifts.find(s => s.shiftId === parseInt(editIdParam));
        if (shift) {
            setEditingShift(shift);
            setIsModalOpen(true);
            setSearchParams(p => { p.delete('edit'); return p; });
        }
    }, [editIdParam, shifts]);

    const handleSaveShift = async (payload) => {
        console.log("1. Button Clicked");
        console.log("2. Current editingShift object:", editingShift);

        try {
            if (editingShift) {
                const idToUpdate = editingShift.shiftId || editingShift.id;
                console.log("3. Attempting API call to ID:", idToUpdate);
                if (!idToUpdate) {
                    throw new Error("Could not find an ID for the shift you are trying to edit.");
                }
                await updateShift(idToUpdate, payload);
                console.log("4. API Call Success");
            } else {
                await createShift(payload);
            }
            setIsModalOpen(false);
            setEditingShift(null);
            refreshData();
        } catch (err) {
            console.error("CATCH BLOCK TRIGGERED:", err);
            alert("Error saving shift: " + err.message);
        }
    };

    const handleMatchingToggled = async (shiftId, openForMatching) => {
        try {
            await setShiftMatching(shiftId, openForMatching);
            refreshData();
        } catch (err) {
            console.error(err);
            alert('Error updating matching status');
        }
    };

    const handleDeleteShift = async (id) => {
        if (window.confirm("Are you sure you want to delete this shift?")) {
            try {
                await deleteShift(id);
                refreshData();
            } catch (err) {
                console.error(err);
                alert("Error deleting shift");
            }
        }
    };

    const handleOpenEdit = (shift) => {
        setEditingShift(shift);
        setIsModalOpen(true);
    };

    const displayedShifts = (shifts || []).filter(s => {
        const matchesClient   = clientIdFilter   ? s.client?.clientId === parseInt(clientIdFilter)                           : true;
        const matchesEmployee = employeeIdFilter ? s.assignedEmployee?.employeeId === parseInt(employeeIdFilter) : true;
        const matchesSearch   =
            (s.zipcode || "").includes(searchTerm) ||
            (s.service?.serviceName || "").toLowerCase().includes(searchTerm.toLowerCase());
        return matchesClient && matchesEmployee && matchesSearch;
    });

    const hasFilter = clientIdFilter || employeeIdFilter;
    const pageTitle = clientIdFilter ? 'Client Schedule' : employeeIdFilter ? 'Employee Shifts' : 'Shift Board';

    return (
        <div className="py-8 px-6 lg:px-8">
            {/* Page Header */}
            <div className="flex items-start justify-between mb-6 gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">{pageTitle}</h1>
                    <p className="text-sm text-[#64748b] mt-0.5">{displayedShifts.length} shift{displayedShifts.length !== 1 ? 's' : ''}</p>
                </div>
                <div className="flex items-center gap-2 flex-wrap justify-end">
                    {hasFilter && (
                        <button
                            onClick={() => setSearchParams({})}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-[#0487D9] bg-[#99E2F2]/30 text-[#0487D9] px-3 py-2 text-sm font-medium hover:bg-[#99E2F2]/60 transition-all"
                        >
                            <span>Active filter</span>
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                            </svg>
                        </button>
                    )}
                    <button
                        onClick={() => setIsMatchModalOpen(true)}
                        className="inline-flex items-center gap-2 rounded-lg border border-[#0487D9] text-[#0487D9] bg-white px-4 py-2 text-sm font-semibold hover:bg-[#99E2F2] transition-all"
                    >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
                        </svg>
                        Find Match
                    </button>
                    <button
                        onClick={() => setIsModalOpen(true)}
                        className="inline-flex items-center gap-2 rounded-lg bg-[#0487D9] px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-[#0363A0] transition-all"
                    >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                        </svg>
                        Post New Shift
                    </button>
                </div>
            </div>

            {/* Search */}
            <div className="relative mb-6 max-w-sm">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                    <svg className="h-4 w-4 text-[#64748b]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                </div>
                <input
                    type="text"
                    className="block w-full rounded-lg border border-[#cbd5e1] py-2 pl-9 pr-3 text-slate-900 placeholder:text-[#64748b] focus:outline-none focus:ring-2 focus:ring-[#0487D9] focus:border-transparent text-sm bg-white"
                    placeholder="Search zipcode or service…"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>

            {/* Table card */}
            <div className="bg-white rounded-xl shadow-sm border border-[#e2e8f0] overflow-hidden">
                <ShiftTable
                    shifts={displayedShifts}
                    onDelete={handleDeleteShift}
                    onEdit={handleOpenEdit}
                    onMatchingToggled={handleMatchingToggled}
                    onAssign={setAssigningShift}
                />
            </div>

            <CreateShiftModal
                isOpen={isModalOpen}
                onClose={() => { setIsModalOpen(false); setEditingShift(null); }}
                clients={clients}
                services={services}
                onSave={handleSaveShift}
                initialData={editingShift}
            />

            <MatchShiftModal
                isOpen={isMatchModalOpen}
                onClose={() => setIsMatchModalOpen(false)}
                employees={employees}
                onAssigned={refreshData}
            />

            <AssignEmployeeModal
                shift={assigningShift}
                employees={employees}
                onAssigned={refreshData}
                onClose={() => setAssigningShift(null)}
            />
        </div>
    );
}
