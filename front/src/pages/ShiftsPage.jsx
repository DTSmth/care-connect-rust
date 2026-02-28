import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { createShift, deleteShift, updateShift } from '../api/shiftApi';
import ShiftTable from '../components/ShiftTable';
import CreateShiftModal from '../components/CreateShiftModal';
import MatchShiftModal from '../components/MatchShiftModal';

export default function ShiftsPage({ shifts, clients, services, users, employees, refreshData }) {
    const [searchTerm, setSearchTerm] = useState('');
    const [searchParams, setSearchParams] = useSearchParams();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingShift, setEditingShift] = useState(null);
    const [isMatchModalOpen, setIsMatchModalOpen] = useState(false);

    const clientIdFilter = searchParams.get('clientId');

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

    const handleDeleteShift = async (id) => {
        if (window.confirm("Are you sure you want to delete this shift?")) {
            try {
                await deleteShift(id);
                refreshData(); // Re-fetches the list from App.jsx
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
        const matchesClient = clientIdFilter ? s.client?.clientId === parseInt(clientIdFilter) : true;
        const matchesSearch =
            (s.zipcode || "").includes(searchTerm) ||
            (s.service?.serviceName || "").toLowerCase().includes(searchTerm.toLowerCase());

        return matchesClient && matchesSearch;
    });

    return (
        <div className="py-8 px-4 sm:px-6 lg:px-8">
            <div className="max-w-7xl mx-auto">
                <div className="flex items-center justify-between mb-6">
                    <h1 className="text-3xl font-bold text-gray-900 tracking-tight">
                        {clientIdFilter ? 'Client Schedule' : 'Shift Board'}
                    </h1>
                    <div className="flex gap-3">
                        {clientIdFilter && (
                            <button onClick={() => setSearchParams({})} className="...">
                                Clear Client Filter
                            </button>
                        )}
                        <button
                            onClick={() => setIsMatchModalOpen(true)}
                            className="inline-flex items-center rounded-lg bg-violet-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-violet-500 transition-all"
                        >
                            Find Match
                        </button>
                        <button
                            onClick={() => setIsModalOpen(true)}
                            className="inline-flex items-center rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 transition-all"
                        >
                            Post New Shift
                        </button>
                    </div>
                </div>

                <div className="mb-6">
                    <input
                        type="text"
                        className="block w-full rounded-lg border-gray-300 py-2 px-4 shadow-sm focus:ring-2 focus:ring-indigo-600 sm:text-sm border"
                        placeholder="Search Zipcode or Service..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>

                <ShiftTable
                    shifts={displayedShifts}
                    onDelete={handleDeleteShift}
                    onEdit={handleOpenEdit}
                />

                {/* Modal for adding shifts */}
                <CreateShiftModal
                    isOpen={isModalOpen}
                    onClose={() => {
                        setIsModalOpen(false);
                        setEditingShift(null);
                    }}
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
            </div>
        </div>
    );
}