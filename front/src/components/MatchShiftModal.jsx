import { useState, useEffect } from 'react';
import { getPreferences, upsertPreferences, getMatches } from '../api/employeeApi';
import { assignShift } from '../api/shiftApi';

const EMPTY_PREFS = {
    canDoPersonalCare: null,
    canDoLifting: null,
    preferredZipcode: '',
    minHours: '',
    maxHours: '',
};

// 3-state toggle: null = no preference, true = can do, false = cannot
function CapabilityToggle({ label, hint, value, onChange }) {
    const options = [
        { val: null,  label: 'Not set',  style: value === null  ? 'bg-gray-200 text-gray-700 ring-2 ring-gray-400'   : 'bg-white text-gray-400 border border-gray-200' },
        { val: true,  label: 'Can do',   style: value === true  ? 'bg-green-100 text-green-800 ring-2 ring-green-400' : 'bg-white text-gray-400 border border-gray-200' },
        { val: false, label: "Can't do", style: value === false ? 'bg-red-100 text-red-700 ring-2 ring-red-400'       : 'bg-white text-gray-400 border border-gray-200' },
    ];
    return (
        <div>
            <p className="text-xs font-semibold text-gray-600 mb-0.5">{label}</p>
            {hint && <p className="text-xs text-gray-400 mb-1">{hint}</p>}
            <div className="flex gap-1">
                {options.map(opt => (
                    <button key={String(opt.val)} type="button"
                        onClick={() => onChange(opt.val)}
                        className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all ${opt.style}`}>
                        {opt.label}
                    </button>
                ))}
            </div>
        </div>
    );
}

function MatchCard({ m, prefs, onAssign, assigning }) {
    const warnings = [];
    if (m.shift.client.hasPersonalCare && prefs.canDoPersonalCare === false)
        warnings.push('Requires personal care');
    if (m.shift.client.hasLifting && prefs.canDoLifting === false)
        warnings.push('Requires lifting');

    const isConflict = warnings.length > 0;

    return (
        <div className={`flex items-start justify-between rounded-lg border p-3 gap-3
            ${isConflict ? 'border-amber-200 bg-amber-50' : 'border-gray-200 bg-white'}`}>
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-semibold text-gray-900">
                        {m.shift.client.firstName} {m.shift.client.lastName}
                    </p>
                    {isConflict && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">
                            ⚠ Needs discussion
                        </span>
                    )}
                </div>
                <p className="text-xs text-gray-500 mt-0.5">
                    {m.shift.service.serviceName} · {m.shift.totalHours}h
                    {m.shift.zipcode && <> · {m.shift.zipcode}</>}
                    {m.shift.defaultStartTime && (
                        <> · <span className="text-indigo-600 font-medium">{m.shift.defaultStartTime.slice(0, 5)}</span></>
                    )}
                </p>
                {warnings.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1.5">
                        {warnings.map(w => (
                            <span key={w} className="rounded bg-amber-100 px-1.5 py-0.5 text-xs text-amber-700">
                                {w}
                            </span>
                        ))}
                    </div>
                )}
            </div>
            <button
                onClick={() => onAssign(m)}
                disabled={assigning === m.shift.shiftId}
                className="shrink-0 rounded-lg bg-violet-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-violet-500 disabled:opacity-50">
                {assigning === m.shift.shiftId ? '…' : 'Assign'}
            </button>
        </div>
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

    useEffect(() => {
        if (!selectedEmployeeId) return;
        setPrefs(EMPTY_PREFS);
        getPreferences(selectedEmployeeId)
            .then(res => {
                const p = res.data;
                setPrefs({
                    canDoPersonalCare: p.canDoPersonalCare ?? null,
                    canDoLifting: p.canDoLifting ?? null,
                    preferredZipcode: p.preferredZipcode ?? '',
                    minHours: p.minHours ?? '',
                    maxHours: p.maxHours ?? '',
                });
            })
            .catch(() => setPrefs(EMPTY_PREFS));
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

    // Split results into tiers based on score and conflicts
    const goodMatches = matches.filter(m => {
        const hasConflict =
            (m.shift.client.hasPersonalCare && prefs.canDoPersonalCare === false) ||
            (m.shift.client.hasLifting && prefs.canDoLifting === false);
        return m.score > 0 && !hasConflict;
    });
    const otherMatches = matches.filter(m => !goodMatches.includes(m));

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm">
            <div className="w-full max-w-lg rounded-xl bg-white p-6 shadow-2xl">

                {/* Header */}
                <div className="flex items-center justify-between mb-5">
                    <div>
                        <h2 className="text-xl font-bold text-gray-900">Find Best Match</h2>
                        <p className="text-sm text-gray-500 mt-0.5">
                            {step === 1 ? 'Set employee capabilities to rank available shifts' : 'All open shifts — best fits first'}
                        </p>
                    </div>
                    <span className="text-xs font-medium text-gray-400">Step {step} of 2</span>
                </div>

                {error && (
                    <div className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
                )}

                {/* ── STEP 1 ── */}
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
                            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Employee Capabilities</p>

                            <div className="flex gap-6 flex-wrap">
                                <CapabilityToggle
                                    label="Personal Care"
                                    hint="Not set = show all shifts"
                                    value={prefs.canDoPersonalCare}
                                    onChange={val => setPrefs({ ...prefs, canDoPersonalCare: val })}
                                />
                                <CapabilityToggle
                                    label="Lifting"
                                    hint="Not set = show all shifts"
                                    value={prefs.canDoLifting}
                                    onChange={val => setPrefs({ ...prefs, canDoLifting: val })}
                                />
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
                                    <label className="block text-sm font-semibold text-gray-700 mb-1">Min Hours / shift</label>
                                    <input type="number" min="1" max="24"
                                        className="w-full rounded-lg border border-gray-300 p-2.5"
                                        placeholder="e.g. 2"
                                        value={prefs.minHours}
                                        onChange={e => setPrefs({ ...prefs, minHours: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-1">Max Hours / shift</label>
                                    <input type="number" min="1" max="24"
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

                {/* ── STEP 2: Tiered results ── */}
                {step === 2 && (
                    <div className="space-y-3">
                        {matches.length === 0 ? (
                            <div className="py-10 text-center space-y-2">
                                <p className="text-gray-700 font-medium">No open shifts available right now.</p>
                                <p className="text-sm text-gray-400">Check back after marking more shifts as open for matching.</p>
                            </div>
                        ) : (
                            <div className="max-h-[26rem] overflow-y-auto space-y-4 pr-1">

                                {/* Tier 1: Great fits */}
                                {goodMatches.length > 0 && (
                                    <div className="space-y-2">
                                        <p className="text-xs font-semibold text-green-700 uppercase tracking-wide flex items-center gap-1">
                                            <span>✓</span> Great Fits ({goodMatches.length})
                                        </p>
                                        {goodMatches.map(m => (
                                            <MatchCard key={m.shift.shiftId} m={m} prefs={prefs} onAssign={handleAssign} assigning={assigning} />
                                        ))}
                                    </div>
                                )}

                                {/* Empty great-fits with fallback guidance */}
                                {goodMatches.length === 0 && (
                                    <div className="rounded-lg bg-blue-50 border border-blue-100 px-4 py-3 text-sm text-blue-700">
                                        No perfect matches found — review the options below. These may need a quick conversation with the employee first.
                                    </div>
                                )}

                                {/* Tier 2: Other / conflict shifts */}
                                {otherMatches.length > 0 && (
                                    <div className="space-y-2">
                                        <p className="text-xs font-semibold text-amber-600 uppercase tracking-wide">
                                            {goodMatches.length > 0 ? `Other Open Shifts (${otherMatches.length})` : `All Open Shifts (${otherMatches.length})`}
                                        </p>
                                        {otherMatches.map(m => (
                                            <MatchCard key={m.shift.shiftId} m={m} prefs={prefs} onAssign={handleAssign} assigning={assigning} />
                                        ))}
                                    </div>
                                )}
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
