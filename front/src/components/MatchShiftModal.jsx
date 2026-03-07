import { useState, useEffect } from 'react';
import { getPreferences, upsertPreferences, getMatches } from '../api/employeeApi';
import { assignShift } from '../api/shiftApi';

const EMPTY_PREFS = {
    canDoPersonalCare: false,
    canDoLifting: false,
    preferredZipcode: '',
    minHours: '',
    maxHours: '',
};

function ScoreBadge({ score }) {
    const color =
        score >= 6 ? 'bg-green-100 text-green-800' :
        score >= 3 ? 'bg-blue-100 text-blue-800' :
                     'bg-gray-100 text-gray-600';
    return (
        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${color}`}>
            ★ {score}
        </span>
    );
}

export default function MatchShiftModal({ isOpen, onClose, employees = [], onAssigned }) {
    const [step, setStep] = useState(1);
    const [selectedEmployeeId, setSelectedEmployeeId] = useState('');
    const [prefs, setPrefs] = useState(EMPTY_PREFS);
    const [matches, setMatches] = useState([]);
    const [loading, setLoading] = useState(false);
    const [assigning, setAssigning] = useState(null);
    const [error, setError] = useState('');

    // Load preferences when employee is selected
    useEffect(() => {
        if (!selectedEmployeeId) return;
        setPrefs(EMPTY_PREFS);
        getPreferences(selectedEmployeeId)
            .then(res => {
                const p = res.data;
                setPrefs({
                    canDoPersonalCare: p.canDoPersonalCare ?? false,
                    canDoLifting: p.canDoLifting ?? false,
                    preferredZipcode: p.preferredZipcode ?? '',
                    minHours: p.minHours ?? '',
                    maxHours: p.maxHours ?? '',
                });
            })
            .catch(() => setPrefs(EMPTY_PREFS)); // no prefs yet — start fresh
    }, [selectedEmployeeId]);

    const handleFindMatches = async (e) => {
        e.preventDefault();
        if (!selectedEmployeeId) return;
        setError('');
        setLoading(true);
        try {
            await upsertPreferences(selectedEmployeeId, {
                canDoPersonalCare: prefs.canDoPersonalCare,
                canDoLifting: prefs.canDoLifting,
                preferredZipcode: prefs.preferredZipcode || null,
                minHours: prefs.minHours !== '' ? parseInt(prefs.minHours) : null,
                maxHours: prefs.maxHours !== '' ? parseInt(prefs.maxHours) : null,
            });
            const res = await getMatches(selectedEmployeeId);
            setMatches(res.data || []);
            setStep(2);
        } catch (err) {
            setError('Failed to load matches. Please try again.');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleAssign = async (match) => {
        setAssigning(match.shift.shiftId);
        try {
            await assignShift(match.shift.shiftId, { employeeId: parseInt(selectedEmployeeId) });
            onAssigned();
            handleClose();
        } catch (err) {
            console.error(err);
            setError('Failed to assign shift.');
        } finally {
            setAssigning(null);
        }
    };

    const handleClose = () => {
        setStep(1);
        setSelectedEmployeeId('');
        setPrefs(EMPTY_PREFS);
        setMatches([]);
        setError('');
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm">
            <div className="w-full max-w-lg rounded-xl bg-white p-6 shadow-2xl">

                {/* Header */}
                <div className="flex items-center justify-between mb-5">
                    <div>
                        <h2 className="text-xl font-bold text-gray-900">Find Best Match</h2>
                        <p className="text-sm text-gray-500 mt-0.5">
                            {step === 1 ? 'Set employee preferences to find ideal shifts' : 'Ranked matches — highest score is the best fit'}
                        </p>
                    </div>
                    <span className="text-xs font-medium text-gray-400">Step {step} of 2</span>
                </div>

                {error && (
                    <div className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
                )}

                {/* ── STEP 1: Employee + Preferences ── */}
                {step === 1 && (
                    <form onSubmit={handleFindMatches} className="space-y-4">
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-1">Employee</label>
                            <select
                                required
                                className="w-full rounded-lg border border-gray-300 p-2.5 focus:ring-2 focus:ring-violet-500"
                                value={selectedEmployeeId}
                                onChange={e => setSelectedEmployeeId(e.target.value)}
                            >
                                <option value="">-- Select Employee --</option>
                                {employees.map(emp => (
                                    <option key={emp.employeeId} value={emp.employeeId}>
                                        {emp.firstName} {emp.lastName}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div className="rounded-lg border border-gray-100 bg-gray-50 p-4 space-y-4">
                            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Preferences</p>

                            <div className="flex gap-6">
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        className="h-4 w-4 rounded text-violet-600 focus:ring-violet-500"
                                        checked={prefs.canDoPersonalCare}
                                        onChange={e => setPrefs({ ...prefs, canDoPersonalCare: e.target.checked })}
                                    />
                                    <span className="text-sm text-gray-700">Personal Care</span>
                                </label>
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        className="h-4 w-4 rounded text-violet-600 focus:ring-violet-500"
                                        checked={prefs.canDoLifting}
                                        onChange={e => setPrefs({ ...prefs, canDoLifting: e.target.checked })}
                                    />
                                    <span className="text-sm text-gray-700">Can Do Lifting</span>
                                </label>
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-1">Preferred Zipcode</label>
                                <input
                                    type="text"
                                    className="w-full rounded-lg border border-gray-300 p-2.5"
                                    placeholder="e.g. 30301"
                                    value={prefs.preferredZipcode}
                                    onChange={e => setPrefs({ ...prefs, preferredZipcode: e.target.value })}
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-1">Min Hours</label>
                                    <input
                                        type="number"
                                        min="1" max="24"
                                        className="w-full rounded-lg border border-gray-300 p-2.5"
                                        placeholder="e.g. 2"
                                        value={prefs.minHours}
                                        onChange={e => setPrefs({ ...prefs, minHours: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-1">Max Hours</label>
                                    <input
                                        type="number"
                                        min="1" max="24"
                                        className="w-full rounded-lg border border-gray-300 p-2.5"
                                        placeholder="e.g. 8"
                                        value={prefs.maxHours}
                                        onChange={e => setPrefs({ ...prefs, maxHours: e.target.value })}
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="flex justify-end gap-3 pt-1">
                            <button type="button" onClick={handleClose}
                                className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg">
                                Cancel
                            </button>
                            <button type="submit" disabled={loading || !selectedEmployeeId}
                                className="rounded-lg bg-violet-600 px-5 py-2 text-sm font-semibold text-white shadow-sm hover:bg-violet-500 disabled:opacity-50">
                                {loading ? 'Finding…' : 'Find Matches →'}
                            </button>
                        </div>
                    </form>
                )}

                {/* ── STEP 2: Ranked Match Results ── */}
                {step === 2 && (
                    <div className="space-y-3">
                        {matches.length === 0 ? (
                            <p className="text-center text-gray-500 py-8">No available shifts match this employee's capabilities.</p>
                        ) : (
                            <div className="max-h-96 overflow-y-auto space-y-2 pr-1">
                                {matches.map((m, i) => (
                                    <div key={m.shift.shiftId}
                                        className={`flex items-center justify-between rounded-lg border p-3 ${i === 0 ? 'border-violet-300 bg-violet-50' : 'border-gray-200 bg-white'}`}>
                                        <div className="flex items-start gap-3">
                                            <ScoreBadge score={m.score} />
                                            <div>
                                                <p className="text-sm font-semibold text-gray-900">
                                                    {m.shift.client.firstName} {m.shift.client.lastName}
                                                </p>
                                                <p className="text-xs text-gray-500">
                                                    {m.shift.service.serviceName} · {m.shift.totalHours}h · {m.shift.zipcode}
                                                    {m.shift.defaultStartTime && (
                                                        <> · <span className="text-indigo-600 font-medium">{m.shift.defaultStartTime.slice(0,5)}</span></>
                                                    )}
                                                </p>
                                                {(m.shift.client.hasPersonalCare || m.shift.client.hasLifting) && (
                                                    <p className="text-xs text-gray-400 mt-0.5">
                                                        {m.shift.client.hasPersonalCare && '🩺 Personal care '}
                                                        {m.shift.client.hasLifting && '🏋️ Lifting'}
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => handleAssign(m)}
                                            disabled={assigning === m.shift.shiftId}
                                            className="ml-3 rounded-lg bg-violet-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-violet-500 disabled:opacity-50 shrink-0">
                                            {assigning === m.shift.shiftId ? '…' : 'Assign'}
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}

                        <div className="flex justify-between pt-2">
                            <button onClick={() => setStep(1)}
                                className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg">
                                ← Back
                            </button>
                            <button onClick={handleClose}
                                className="px-4 py-2 text-sm font-medium text-gray-500 hover:bg-gray-100 rounded-lg">
                                Cancel
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
