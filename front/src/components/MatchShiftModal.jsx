import { useState, useEffect } from 'react';
import { getPreferences, upsertPreferences, getMatches, anonymousMatch } from '../api/employeeApi';
import { assignShift } from '../api/shiftApi';
import { geocodeZipcode } from '../utils/geocode';

// ─── Constants ───────────────────────────────────────────────────────────────

const EMPTY_PREFS = {
    canDoPersonalCare: null,
    canDoLifting: null,
    homeZipcode: '',
    maxDistanceMiles: '',
    minHours: '',
    maxHours: '',
    availableDays: [],
};

const DAYS = [
    { key: 'MON', label: 'M',  full: 'Mon' },
    { key: 'TUE', label: 'T',  full: 'Tue' },
    { key: 'WED', label: 'W',  full: 'Wed' },
    { key: 'THU', label: 'Th', full: 'Thu' },
    { key: 'FRI', label: 'F',  full: 'Fri' },
    { key: 'SAT', label: 'Sa', full: 'Sat' },
    { key: 'SUN', label: 'Su', full: 'Sun' },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function parseShiftDays(rule) {
    if (!rule) return [];
    if (rule === 'DAILY') return DAYS.map(d => d.key);
    const m = rule.match(/^WEEKLY:(.+)$/);
    return m ? m[1].split(',').map(d => d.trim().toUpperCase()) : [];
}

/**
 * Returns an array of match criteria chips for a shift result card.
 * Each chip has { label, match: 'good' | 'conflict' | 'neutral' }.
 * Only chips where the user has actually set a preference are returned.
 */
function buildCriteria(shift, client, prefs, distanceMiles) {
    const chips = [];

    // Distance chip — replaces exact zipcode matching
    if (distanceMiles != null) {
        const dist = Math.round(distanceMiles);
        const max = prefs.maxDistanceMiles ? parseInt(prefs.maxDistanceMiles) : null;
        const isOver = max != null && distanceMiles > max;
        chips.push({
            label: isOver ? `${dist} mi — over limit` : `~${dist} mi`,
            match: isOver ? 'conflict' : distanceMiles < 5 ? 'good' : distanceMiles < 15 ? 'neutral' : 'neutral',
        });
    } else if (prefs.homeZipcode) {
        // Shift hasn't been geocoded yet — show zipcode as a soft hint
        chips.push({ label: `📍 ${shift.zipcode || '—'} (no distance data)`, match: 'neutral' });
    }

    // Hours — compare weekly total so min/max range is meaningful
    const min = prefs.minHours !== '' ? parseInt(prefs.minHours) : null;
    const max = prefs.maxHours !== '' ? parseInt(prefs.maxHours) : null;
    if (min !== null || max !== null) {
        const wkHours = weeklyHours(shift.totalHours, shift.recurrenceRule);
        const fits = (min === null || wkHours >= min) &&
                     (max === null || wkHours <= max);
        chips.push({
            label: `${wkHours}h/wk`,
            match: fits ? 'good' : 'conflict',
        });
    }

    // Personal care — only show chip if the shift requires it
    if (client.hasPersonalCare) {
        if (prefs.canDoPersonalCare === true)  chips.push({ label: 'Personal care ✓', match: 'good' });
        if (prefs.canDoPersonalCare === false) chips.push({ label: 'Personal care needed', match: 'conflict' });
    }

    // Lifting — only show chip if the shift requires it
    if (client.hasLifting) {
        if (prefs.canDoLifting === true)  chips.push({ label: 'Lifting ✓', match: 'good' });
        if (prefs.canDoLifting === false) chips.push({ label: 'Lifting needed', match: 'conflict' });
    }

    return chips;
}

const CHIP_CLASS = {
    good:     'bg-green-100 text-green-800',
    conflict: 'bg-amber-100 text-amber-700',
    neutral:  'bg-gray-100  text-gray-500',
};

// ─── Sub-components ───────────────────────────────────────────────────────────

function CapabilityToggle({ label, hint, value, onChange }) {
    const options = [
        { val: null,  text: 'Not set',  cls: value === null  ? 'bg-gray-200 text-gray-700 ring-2 ring-gray-400'   : 'bg-white text-gray-400 border border-gray-200' },
        { val: true,  text: 'Can do',   cls: value === true  ? 'bg-green-100 text-green-800 ring-2 ring-green-400' : 'bg-white text-gray-400 border border-gray-200' },
        { val: false, text: "Can't do", cls: value === false ? 'bg-red-100 text-red-700 ring-2 ring-red-400'       : 'bg-white text-gray-400 border border-gray-200' },
    ];
    return (
        <div>
            <p className="text-xs font-semibold text-gray-600 mb-0.5">{label}</p>
            {hint && <p className="text-xs text-gray-400 mb-1">{hint}</p>}
            <div className="flex gap-1">
                {options.map(opt => (
                    <button key={String(opt.val)} type="button" onClick={() => onChange(opt.val)}
                        className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all ${opt.cls}`}>
                        {opt.text}
                    </button>
                ))}
            </div>
        </div>
    );
}

function DayPicker({ value = [], onChange }) {
    const toggle = (key) => {
        const next = value.includes(key) ? value.filter(d => d !== key) : [...value, key];
        onChange(next);
    };
    return (
        <div>
            <p className="text-xs font-semibold text-gray-600 mb-1">
                Available Days <span className="font-normal text-gray-400">(leave blank for any day)</span>
            </p>
            <div className="flex gap-1.5">
                {DAYS.map(d => (
                    <button key={d.key} type="button" title={d.full} onClick={() => toggle(d.key)}
                        className={`w-8 h-8 rounded-full text-xs font-semibold transition-all
                            ${value.includes(d.key)
                                ? 'bg-violet-600 text-white ring-2 ring-violet-300'
                                : 'bg-white text-gray-400 border border-gray-200 hover:border-violet-300'}`}>
                        {d.label}
                    </button>
                ))}
            </div>
        </div>
    );
}

/** Hours per week = hours per shift × number of days in the recurrence. */
function weeklyHours(totalHours, recurrenceRule) {
    if (!recurrenceRule) return totalHours;
    if (recurrenceRule === 'DAILY') return totalHours * 7;
    const m = recurrenceRule.match(/^WEEKLY:(.+)$/);
    if (m) {
        const days = m[1].split(',').filter(Boolean).length;
        return totalHours * days;
    }
    return totalHours;
}

function MatchCard({ m, prefs, onAssign, assigning, anonymous }) {
    const shiftDays = parseShiftDays(m.shift.recurrenceRule);
    const availDays = prefs.availableDays ?? [];
    const isDaily = m.shift.recurrenceRule === 'DAILY';

    const chips = buildCriteria(m.shift, m.shift.client, prefs, m.distanceMiles);
    const hasConflict = chips.some(c => c.match === 'conflict');
    const hasGood     = chips.some(c => c.match === 'good');

    // Accent bar: green = at least one match, amber = any conflict, gray = neutral
    const accentBar = hasConflict
        ? 'border-l-amber-400'
        : hasGood ? 'border-l-green-400'
        : 'border-l-gray-200';

    return (
        <div className={`rounded-lg border border-gray-200 border-l-4 ${accentBar} bg-white p-3`}>
            <div className="flex items-start gap-3">
                <div className="flex-1 min-w-0">
                    {/* Title row */}
                    <div className="flex items-baseline gap-2 flex-wrap">
                        <span className="text-sm font-semibold text-gray-900">
                            {m.shift.client.firstName} {m.shift.client.lastName}
                        </span>
                        <span className="text-xs text-gray-400">{m.shift.service.serviceName}</span>
                        {m.shift.defaultStartTime && (
                            <span className="text-xs font-medium text-indigo-600 ml-auto">
                                Starts {m.shift.defaultStartTime.slice(0, 5)}
                            </span>
                        )}
                    </div>

                    {/* Meta row */}
                    <p className="text-xs text-gray-400 mt-0.5">
                        {weeklyHours(m.shift.totalHours, m.shift.recurrenceRule)}h/week
                        {m.shift.zipcode && <> · {m.shift.zipcode}</>}
                        {isDaily && <> · <span className="text-violet-600 font-medium">Daily</span></>}
                    </p>

                    {/* Day pills — only show for weekly schedules */}
                    {!isDaily && shiftDays.length > 0 && (
                        <div className="flex gap-1 mt-2">
                            {DAYS.filter(d => shiftDays.includes(d.key)).map(d => {
                                // Three states:
                                // no day pref set → neutral violet (all shift days look the same)
                                // pref set + this day matches → bright violet = confirmed overlap
                                // pref set + this day doesn't match → gray = not available
                                const noPrefs = availDays.length === 0;
                                const isMatch = !noPrefs && availDays.includes(d.key);
                                return (
                                    <span key={d.key} title={d.full}
                                        className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold
                                            ${noPrefs
                                                ? 'bg-violet-100 text-violet-600'
                                                : isMatch
                                                    ? 'bg-violet-600 text-white ring-2 ring-violet-300 ring-offset-1'
                                                    : 'bg-gray-100 text-gray-300'}`}>
                                        {d.label}
                                    </span>
                                );
                            })}
                            {availDays.length > 0 && (
                                <span className="self-center ml-1 text-xs text-gray-400">
                                    {shiftDays.filter(d => availDays.includes(d)).length} of {shiftDays.length} days match
                                </span>
                            )}
                        </div>
                    )}

                    {/* For daily shifts with day prefs set, show how many days overlap */}
                    {isDaily && availDays.length > 0 && (
                        <div className="flex gap-1 mt-2">
                            {availDays.map(key => {
                                const day = DAYS.find(d => d.key === key);
                                return day ? (
                                    <span key={key}
                                        className="inline-flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold bg-violet-600 text-white ring-2 ring-violet-300 ring-offset-1">
                                        {day.label}
                                    </span>
                                ) : null;
                            })}
                            <span className="self-center ml-1 text-xs text-gray-400">all available days covered</span>
                        </div>
                    )}

                    {/* Match criteria chips */}
                    {chips.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                            {chips.map((c, i) => (
                                <span key={i} className={`rounded-full px-2 py-0.5 text-xs font-medium ${CHIP_CLASS[c.match]}`}>
                                    {c.label}
                                </span>
                            ))}
                        </div>
                    )}
                </div>

                {/* Assign button — disabled for anonymous/new-candidate mode */}
                {anonymous ? (
                    <span className="shrink-0 rounded-lg bg-gray-100 px-3 py-1.5 text-xs font-medium text-gray-400 mt-0.5 whitespace-nowrap"
                        title="Add this person as an employee to assign">
                        Add employee first
                    </span>
                ) : (
                    <button onClick={() => onAssign(m)} disabled={assigning === m.shift.shiftId}
                        className="shrink-0 rounded-lg bg-violet-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-violet-500 disabled:opacity-50 mt-0.5">
                        {assigning === m.shift.shiftId ? '…' : 'Assign'}
                    </button>
                )}
            </div>
        </div>
    );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function MatchShiftModal({ isOpen, onClose, employees = [], onAssigned }) {
    const [step, setStep] = useState(1);
    const [isAnonymous, setIsAnonymous] = useState(false);
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
                    homeZipcode: p.homeZipcode ?? '',
                    maxDistanceMiles: p.maxDistanceMiles ?? '',
                    minHours: p.minHours ?? '',
                    maxHours: p.maxHours ?? '',
                    availableDays: p.availableDays ?? [],
                });
            })
            .catch(() => setPrefs(EMPTY_PREFS));
    }, [selectedEmployeeId]);

    const handleFindMatches = async (e) => {
        e.preventDefault();
        if (!isAnonymous && !selectedEmployeeId) return;
        setError('');
        setLoading(true);
        try {
            const coords = await geocodeZipcode(prefs.homeZipcode);
            const criteria = {
                canDoPersonalCare: prefs.canDoPersonalCare,
                canDoLifting: prefs.canDoLifting,
                homeZipcode: prefs.homeZipcode || null,
                homeLat: coords?.lat ?? null,
                homeLon: coords?.lon ?? null,
                maxDistanceMiles: prefs.maxDistanceMiles !== '' ? parseInt(prefs.maxDistanceMiles) : null,
                minHours: prefs.minHours !== '' ? parseInt(prefs.minHours) : null,
                maxHours: prefs.maxHours !== '' ? parseInt(prefs.maxHours) : null,
                availableDays: prefs.availableDays.length > 0 ? prefs.availableDays : null,
            };

            let res;
            if (isAnonymous) {
                // No employee record — post criteria directly, no preference save
                res = await anonymousMatch(criteria);
            } else {
                // Save preferences for this employee, then fetch matches
                await upsertPreferences(selectedEmployeeId, criteria);
                res = await getMatches(selectedEmployeeId);
            }
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
        setIsAnonymous(false);
        setSelectedEmployeeId('');
        setPrefs(EMPTY_PREFS);
        setMatches([]);
        setError('');
        onClose();
    };

    // Soft split: positive-score shifts first, then the rest — no hard exclusions
    const positiveMatches = matches.filter(m => m.score > 0);
    const otherMatches    = matches.filter(m => m.score <= 0);
    const prefsAreSet = prefs.canDoPersonalCare !== null || prefs.canDoLifting !== null ||
        prefs.homeZipcode || prefs.maxDistanceMiles !== '' ||
        prefs.minHours !== '' || prefs.maxHours !== '' ||
        prefs.availableDays.length > 0;

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm">
            <div className="w-full max-w-lg rounded-xl bg-white p-6 shadow-2xl">

                {/* Header */}
                <div className="flex items-center justify-between mb-5">
                    <div>
                        <h2 className="text-xl font-bold text-gray-900">Find Best Match</h2>
                        <p className="text-sm text-gray-500 mt-0.5">
                            {step === 1
                                ? isAnonymous
                                    ? 'Matching a new candidate — shifts ranked by criteria'
                                    : 'Set what this employee can do to rank shifts'
                                : `${matches.length} open shift${matches.length !== 1 ? 's' : ''} · sorted by best match`}
                        </p>
                    </div>
                    <span className="text-xs font-medium text-gray-400">Step {step} of 2</span>
                </div>

                {error && (
                    <div className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
                )}

                {/* ── STEP 1: Preferences ── */}
                {step === 1 && (
                    <form onSubmit={handleFindMatches} className="space-y-4">

                        {/* Mode toggle */}
                        <div className="flex rounded-lg border border-gray-200 overflow-hidden text-sm font-medium">
                            <button type="button"
                                onClick={() => { setIsAnonymous(false); setSelectedEmployeeId(''); setPrefs(EMPTY_PREFS); }}
                                className={`flex-1 py-2 transition-colors ${!isAnonymous
                                    ? 'bg-violet-600 text-white'
                                    : 'bg-white text-gray-500 hover:bg-gray-50'}`}>
                                Existing Employee
                            </button>
                            <button type="button"
                                onClick={() => { setIsAnonymous(true); setSelectedEmployeeId(''); setPrefs(EMPTY_PREFS); }}
                                className={`flex-1 py-2 transition-colors ${isAnonymous
                                    ? 'bg-violet-600 text-white'
                                    : 'bg-white text-gray-500 hover:bg-gray-50'}`}>
                                New Candidate
                            </button>
                        </div>

                        {/* Employee selector — only shown in Existing Employee mode */}
                        {!isAnonymous && (
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-1">Employee</label>
                                <select required
                                    className="w-full rounded-lg border border-gray-300 p-2.5 focus:ring-2 focus:ring-violet-500"
                                    value={selectedEmployeeId}
                                    onChange={e => setSelectedEmployeeId(e.target.value)}>
                                    <option value="">-- Select Employee --</option>
                                    {employees.map(emp => (
                                        <option key={emp.employeeId} value={emp.employeeId}>
                                            {emp.firstName} {emp.lastName}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        )}

                        {/* New candidate info banner */}
                        {isAnonymous && (
                            <div className="rounded-lg bg-violet-50 border border-violet-200 px-4 py-3 text-sm text-violet-700">
                                <span className="font-semibold">On the phone?</span> Enter what you know about the candidate below and we'll rank all open shifts. You can assign once they're added as an employee.
                            </div>
                        )}

                        <div className="rounded-lg border border-gray-100 bg-gray-50 p-4 space-y-4">
                            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                                Employee Capabilities
                                <span className="ml-1 font-normal normal-case text-gray-400">— leave anything blank to see all shifts</span>
                            </p>

                            <div className="flex gap-6 flex-wrap">
                                <CapabilityToggle label="Personal Care" hint="Not set = show all"
                                    value={prefs.canDoPersonalCare}
                                    onChange={val => setPrefs({ ...prefs, canDoPersonalCare: val })} />
                                <CapabilityToggle label="Lifting" hint="Not set = show all"
                                    value={prefs.canDoLifting}
                                    onChange={val => setPrefs({ ...prefs, canDoLifting: val })} />
                            </div>

                            <DayPicker value={prefs.availableDays}
                                onChange={days => setPrefs({ ...prefs, availableDays: days })} />

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-1">Home Zipcode</label>
                                    <input type="text"
                                        className="w-full rounded-lg border border-gray-300 p-2.5"
                                        placeholder="e.g. 30301"
                                        value={prefs.homeZipcode}
                                        onChange={e => setPrefs({ ...prefs, homeZipcode: e.target.value })}
                                    />
                                    <p className="text-xs text-gray-400 mt-0.5">Used to calculate travel distance</p>
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-1">Max Distance</label>
                                    <select
                                        className="w-full rounded-lg border border-gray-300 p-2.5"
                                        value={prefs.maxDistanceMiles}
                                        onChange={e => setPrefs({ ...prefs, maxDistanceMiles: e.target.value })}>
                                        <option value="">Any distance</option>
                                        <option value="5">Within 5 miles</option>
                                        <option value="10">Within 10 miles</option>
                                        <option value="20">Within 20 miles</option>
                                        <option value="30">Within 30 miles</option>
                                        <option value="50">Within 50 miles</option>
                                    </select>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-1">Min Hours / shift</label>
                                    <input type="number" min="1" max="24"
                                        className="w-full rounded-lg border border-gray-300 p-2.5"
                                        placeholder="e.g. 2" value={prefs.minHours}
                                        onChange={e => setPrefs({ ...prefs, minHours: e.target.value })} />
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-1">Max Hours / shift</label>
                                    <input type="number" min="1" max="24"
                                        className="w-full rounded-lg border border-gray-300 p-2.5"
                                        placeholder="e.g. 8" value={prefs.maxHours}
                                        onChange={e => setPrefs({ ...prefs, maxHours: e.target.value })} />
                                </div>
                            </div>
                        </div>

                        <div className="flex justify-end gap-3 pt-1">
                            <button type="button" onClick={handleClose}
                                className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg">
                                Cancel
                            </button>
                            <button type="submit" disabled={loading || (!isAnonymous && !selectedEmployeeId)}
                                className="rounded-lg bg-violet-600 px-5 py-2 text-sm font-semibold text-white shadow-sm hover:bg-violet-500 disabled:opacity-50">
                                {loading ? 'Finding…' : 'Find Matches →'}
                            </button>
                        </div>
                    </form>
                )}

                {/* ── STEP 2: Results ── */}
                {step === 2 && (
                    <div className="space-y-3">
                        {matches.length === 0 ? (
                            <div className="py-10 text-center space-y-2">
                                <p className="text-gray-700 font-medium">No open shifts available right now.</p>
                                <p className="text-sm text-gray-400">Mark shifts as open for matching to see them here.</p>
                            </div>
                        ) : (
                            <div className="max-h-[28rem] overflow-y-auto space-y-4 pr-1">

                                {/* Strong matches */}
                                {positiveMatches.length > 0 && (
                                    <section className="space-y-2">
                                        <p className="text-xs font-semibold text-green-700 uppercase tracking-wide">
                                            Best Matches ({positiveMatches.length})
                                        </p>
                                        {positiveMatches.map(m => (
                                            <MatchCard key={m.shift.shiftId} m={m} prefs={prefs}
                                                onAssign={handleAssign} assigning={assigning} anonymous={isAnonymous} />
                                        ))}
                                    </section>
                                )}

                                {/* Other shifts — always shown, never hidden */}
                                {otherMatches.length > 0 && (
                                    <section className="space-y-2">
                                        {positiveMatches.length > 0 && (
                                            <div className="flex items-center gap-2 pt-1">
                                                <div className="flex-1 h-px bg-gray-200" />
                                                <p className="text-xs font-medium text-gray-400 whitespace-nowrap">
                                                    Other open shifts ({otherMatches.length})
                                                </p>
                                                <div className="flex-1 h-px bg-gray-200" />
                                            </div>
                                        )}
                                        {positiveMatches.length === 0 && !prefsAreSet && (
                                            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                                                All Open Shifts ({otherMatches.length})
                                            </p>
                                        )}
                                        {positiveMatches.length === 0 && prefsAreSet && (
                                            <div className="rounded-lg bg-blue-50 border border-blue-100 px-3 py-2 text-xs text-blue-700 mb-1">
                                                No shifts fully match — all options shown below. Some may need a conversation first.
                                            </div>
                                        )}
                                        {otherMatches.map(m => (
                                            <MatchCard key={m.shift.shiftId} m={m} prefs={prefs}
                                                onAssign={handleAssign} assigning={assigning} anonymous={isAnonymous} />
                                        ))}
                                    </section>
                                )}
                            </div>
                        )}

                        <div className="flex justify-between pt-2 border-t border-gray-100">
                            <button onClick={() => setStep(1)}
                                className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg">
                                ← Back
                            </button>
                            <button onClick={handleClose}
                                className="px-4 py-2 text-sm font-medium text-gray-500 hover:bg-gray-100 rounded-lg">
                                Done
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
