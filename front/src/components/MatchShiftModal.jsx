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
 */
function buildCriteria(shift, client, prefs, distanceMiles) {
    const chips = [];

    if (distanceMiles != null) {
        const dist = Math.round(distanceMiles);
        const max = prefs.maxDistanceMiles ? parseInt(prefs.maxDistanceMiles) : null;
        const isOver = max != null && distanceMiles > max;
        chips.push({
            label: isOver ? `${dist} mi — over limit` : `~${dist} mi`,
            match: isOver ? 'conflict' : distanceMiles < 5 ? 'good' : distanceMiles < 15 ? 'neutral' : 'neutral',
        });
    } else if (prefs.homeZipcode) {
        chips.push({ label: `📍 ${shift.zipcode || '—'} (no distance data)`, match: 'neutral' });
    }

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

    if (client.hasPersonalCare) {
        if (prefs.canDoPersonalCare === true)  chips.push({ label: 'Personal care ✓', match: 'good' });
        if (prefs.canDoPersonalCare === false) chips.push({ label: 'Personal care needed', match: 'conflict' });
    }

    if (client.hasLifting) {
        if (prefs.canDoLifting === true)  chips.push({ label: 'Lifting ✓', match: 'good' });
        if (prefs.canDoLifting === false) chips.push({ label: 'Lifting needed', match: 'conflict' });
    }

    return chips;
}

const CHIP_CLASS = {
    good:     'bg-[#d1fae5] text-[#065f46]',
    conflict: 'bg-[#fef3c7] text-[#92400e]',
    neutral:  'bg-[#F2F2F2]  text-[#64748b]',
};

// ─── Sub-components ───────────────────────────────────────────────────────────

function CapabilityToggle({ label, hint, value, onChange }) {
    const options = [
        { val: null,  text: 'Not set',  cls: value === null  ? 'bg-[#e2e8f0] text-slate-700 ring-2 ring-slate-400'   : 'bg-white text-[#64748b] border border-[#e2e8f0]' },
        { val: true,  text: 'Can do',   cls: value === true  ? 'bg-[#d1fae5] text-[#065f46] ring-2 ring-[#10b981]' : 'bg-white text-[#64748b] border border-[#e2e8f0]' },
        { val: false, text: "Can't do", cls: value === false ? 'bg-[#fee2e2] text-[#991b1b] ring-2 ring-[#ef4444]'  : 'bg-white text-[#64748b] border border-[#e2e8f0]' },
    ];
    return (
        <div>
            <p className="text-xs font-semibold text-slate-600 mb-0.5">{label}</p>
            {hint && <p className="text-xs text-[#64748b] mb-1">{hint}</p>}
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
            <p className="text-xs font-semibold text-slate-600 mb-1">
                Available Days <span className="font-normal text-[#64748b]">(leave blank for any day)</span>
            </p>
            <div className="flex gap-1.5">
                {DAYS.map(d => (
                    <button key={d.key} type="button" title={d.full} onClick={() => toggle(d.key)}
                        className={`w-8 h-8 rounded-full text-xs font-semibold transition-all
                            ${value.includes(d.key)
                                ? 'bg-[#0487D9] text-white ring-2 ring-[#99E2F2]'
                                : 'bg-white text-[#64748b] border border-[#e2e8f0] hover:border-[#0487D9]'}`}>
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

    const accentBar = hasConflict
        ? 'border-l-[#f59e0b]'
        : hasGood ? 'border-l-[#10b981]'
        : 'border-l-[#e2e8f0]';

    return (
        <div className={`rounded-lg border border-[#e2e8f0] border-l-4 ${accentBar} bg-white p-3`}>
            <div className="flex items-start gap-3">
                <div className="flex-1 min-w-0">
                    {/* Title row */}
                    <div className="flex items-baseline gap-2 flex-wrap">
                        <span className="text-sm font-semibold text-slate-800">
                            {m.shift.client.firstName} {m.shift.client.lastName}
                        </span>
                        <span className="text-xs text-[#64748b]">{m.shift.service.serviceName}</span>
                        {m.shift.defaultStartTime && (
                            <span className="text-xs font-medium text-[#0487D9] ml-auto">
                                Starts {m.shift.defaultStartTime.slice(0, 5)}
                            </span>
                        )}
                    </div>

                    {/* Meta row */}
                    <p className="text-xs text-[#64748b] mt-0.5">
                        {weeklyHours(m.shift.totalHours, m.shift.recurrenceRule)}h/week
                        {m.shift.zipcode && <> · {m.shift.zipcode}</>}
                        {isDaily && <> · <span className="text-[#0487D9] font-medium">Daily</span></>}
                    </p>

                    {/* Day pills — only show for weekly schedules */}
                    {!isDaily && shiftDays.length > 0 && (
                        <div className="flex gap-1 mt-2">
                            {DAYS.filter(d => shiftDays.includes(d.key)).map(d => {
                                const noPrefs = availDays.length === 0;
                                const isMatch = !noPrefs && availDays.includes(d.key);
                                return (
                                    <span key={d.key} title={d.full}
                                        className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold
                                            ${noPrefs
                                                ? 'bg-[#99E2F2]/50 text-[#0487D9]'
                                                : isMatch
                                                    ? 'bg-[#0487D9] text-white ring-2 ring-[#99E2F2] ring-offset-1'
                                                    : 'bg-[#F2F2F2] text-slate-300'}`}>
                                        {d.label}
                                    </span>
                                );
                            })}
                            {availDays.length > 0 && (
                                <span className="self-center ml-1 text-xs text-[#64748b]">
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
                                        className="inline-flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold bg-[#0487D9] text-white ring-2 ring-[#99E2F2] ring-offset-1">
                                        {day.label}
                                    </span>
                                ) : null;
                            })}
                            <span className="self-center ml-1 text-xs text-[#64748b]">all available days covered</span>
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

                {/* Assign button */}
                {anonymous ? (
                    <span className="shrink-0 rounded-lg bg-[#F2F2F2] px-3 py-1.5 text-xs font-medium text-[#64748b] mt-0.5 whitespace-nowrap"
                        title="Add this person as an employee to assign">
                        Add employee first
                    </span>
                ) : (
                    <button onClick={() => onAssign(m)} disabled={assigning === m.shift.shiftId}
                        className="shrink-0 rounded-lg bg-[#0487D9] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#0363A0] disabled:opacity-50 mt-0.5 transition-colors">
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
                res = await anonymousMatch(criteria);
            } else {
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
                        <h2 className="text-xl font-bold text-slate-800">Find Best Match</h2>
                        <p className="text-sm text-[#64748b] mt-0.5">
                            {step === 1
                                ? isAnonymous
                                    ? 'Matching a new candidate — schedules ranked by criteria'
                                    : 'Set what this employee can do to rank schedules'
                                : `${matches.length} open schedule${matches.length !== 1 ? 's' : ''} · sorted by best match`}
                        </p>
                    </div>
                    <span className="text-xs font-medium text-[#64748b] bg-[#F2F2F2] px-2.5 py-1 rounded-full">Step {step} of 2</span>
                </div>

                {error && (
                    <div className="mb-4 rounded-lg bg-[#fee2e2] px-4 py-3 text-sm text-red-700">{error}</div>
                )}

                {/* ── STEP 1: Preferences ── */}
                {step === 1 && (
                    <form onSubmit={handleFindMatches} className="space-y-4">

                        {/* Mode toggle */}
                        <div className="flex rounded-lg border border-[#e2e8f0] overflow-hidden text-sm font-medium">
                            <button type="button"
                                onClick={() => { setIsAnonymous(false); setSelectedEmployeeId(''); setPrefs(EMPTY_PREFS); }}
                                className={`flex-1 py-2 transition-colors ${!isAnonymous
                                    ? 'bg-[#0487D9] text-white'
                                    : 'bg-white text-[#64748b] hover:bg-[#F2F2F2]'}`}>
                                Existing Employee
                            </button>
                            <button type="button"
                                onClick={() => { setIsAnonymous(true); setSelectedEmployeeId(''); setPrefs(EMPTY_PREFS); }}
                                className={`flex-1 py-2 transition-colors ${isAnonymous
                                    ? 'bg-[#0487D9] text-white'
                                    : 'bg-white text-[#64748b] hover:bg-[#F2F2F2]'}`}>
                                New Candidate
                            </button>
                        </div>

                        {/* Employee selector */}
                        {!isAnonymous && (
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-1">Employee</label>
                                <select required
                                    className="w-full rounded-lg border border-[#cbd5e1] p-2.5 focus:outline-none focus:ring-2 focus:ring-[#0487D9] focus:border-transparent text-sm"
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
                            <div className="rounded-lg bg-[#99E2F2]/30 border border-[#0CB1F2]/30 px-4 py-3 text-sm text-[#0487D9]">
                                <span className="font-semibold">On the phone?</span> Enter what you know about the candidate below and we'll rank all open shifts. You can assign once they're added as an employee.
                            </div>
                        )}

                        <div className="rounded-lg border border-[#e2e8f0] bg-[#F2F2F2] p-4 space-y-4">
                            <p className="text-xs font-semibold text-[#64748b] uppercase tracking-wide">
                                Employee Capabilities
                                <span className="ml-1 font-normal normal-case text-slate-400">— leave anything blank to see all shifts</span>
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
                                    <label className="block text-sm font-semibold text-slate-700 mb-1">Home Zipcode</label>
                                    <input type="text"
                                        className="w-full rounded-lg border border-[#cbd5e1] p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#0487D9] focus:border-transparent"
                                        placeholder="e.g. 30301"
                                        value={prefs.homeZipcode}
                                        onChange={e => setPrefs({ ...prefs, homeZipcode: e.target.value })}
                                    />
                                    <p className="text-xs text-[#64748b] mt-0.5">Used to calculate travel distance</p>
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 mb-1">Max Distance</label>
                                    <select
                                        className="w-full rounded-lg border border-[#cbd5e1] p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#0487D9] focus:border-transparent"
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
                                    <label className="block text-sm font-semibold text-slate-700 mb-1">Min Hours / week</label>
                                    <input type="number" min="1"
                                        className="w-full rounded-lg border border-[#cbd5e1] p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#0487D9] focus:border-transparent"
                                        placeholder="e.g. 10" value={prefs.minHours}
                                        onChange={e => setPrefs({ ...prefs, minHours: e.target.value })} />
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 mb-1">Max Hours / week</label>
                                    <input type="number" min="1"
                                        className="w-full rounded-lg border border-[#cbd5e1] p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#0487D9] focus:border-transparent"
                                        placeholder="e.g. 40" value={prefs.maxHours}
                                        onChange={e => setPrefs({ ...prefs, maxHours: e.target.value })} />
                                </div>
                            </div>
                        </div>

                        <div className="flex justify-end gap-3 pt-1">
                            <button type="button" onClick={handleClose}
                                className="px-4 py-2 text-sm font-medium text-[#64748b] hover:bg-[#F2F2F2] rounded-lg transition-colors">
                                Cancel
                            </button>
                            <button type="submit" disabled={loading || (!isAnonymous && !selectedEmployeeId)}
                                className="rounded-lg bg-[#0487D9] px-5 py-2 text-sm font-semibold text-white shadow-sm hover:bg-[#0363A0] disabled:opacity-50 transition-colors">
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
                                <p className="text-slate-700 font-medium">No open schedules available right now.</p>
                                <p className="text-sm text-[#64748b]">Mark shift schedules as open for matching to see them here.</p>
                            </div>
                        ) : (
                            <div className="max-h-[28rem] overflow-y-auto space-y-4 pr-1">

                                {/* Strong matches */}
                                {positiveMatches.length > 0 && (
                                    <section className="space-y-2">
                                        <p className="text-xs font-semibold text-[#10b981] uppercase tracking-wide">
                                            Best Matches ({positiveMatches.length})
                                        </p>
                                        {positiveMatches.map(m => (
                                            <MatchCard key={m.shift.shiftId} m={m} prefs={prefs}
                                                onAssign={handleAssign} assigning={assigning} anonymous={isAnonymous} />
                                        ))}
                                    </section>
                                )}

                                {/* Other shifts */}
                                {otherMatches.length > 0 && (
                                    <section className="space-y-2">
                                        {positiveMatches.length > 0 && (
                                            <div className="flex items-center gap-2 pt-1">
                                                <div className="flex-1 h-px bg-[#e2e8f0]" />
                                                <p className="text-xs font-medium text-[#64748b] whitespace-nowrap">
                                                    Other open schedules ({otherMatches.length})
                                                </p>
                                                <div className="flex-1 h-px bg-[#e2e8f0]" />
                                            </div>
                                        )}
                                        {positiveMatches.length === 0 && !prefsAreSet && (
                                            <p className="text-xs font-semibold text-[#64748b] uppercase tracking-wide">
                                                All Open Schedules ({otherMatches.length})
                                            </p>
                                        )}
                                        {positiveMatches.length === 0 && prefsAreSet && (
                                            <div className="rounded-lg bg-[#99E2F2]/30 border border-[#0CB1F2]/30 px-3 py-2 text-xs text-[#0487D9] mb-1">
                                                No schedules fully match — all options shown below. Some may need a conversation first.
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

                        <div className="flex justify-between pt-2 border-t border-[#e2e8f0]">
                            <button onClick={() => setStep(1)}
                                className="px-4 py-2 text-sm font-medium text-[#64748b] hover:bg-[#F2F2F2] rounded-lg transition-colors">
                                ← Back
                            </button>
                            <button onClick={handleClose}
                                className="px-4 py-2 text-sm font-medium text-[#64748b] hover:bg-[#F2F2F2] rounded-lg transition-colors">
                                Done
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
