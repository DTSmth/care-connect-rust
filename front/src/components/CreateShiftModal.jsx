import { useState, useEffect } from 'react';

const DAYS = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];
const DAY_LABELS = { MON: 'Monday', TUE: 'Tuesday', WED: 'Wednesday', THU: 'Thursday', FRI: 'Friday', SAT: 'Saturday', SUN: 'Sunday' };

export default function CreateShiftModal({ isOpen, onClose, clients = [], services = [], onSave, initialData }) {
    const [formData, setFormData] = useState({
        clientId: '',
        serviceId: '',
        totalHours: '',
        zipcode: '',
        openForMatching: true,
        defaultStartTime: '',
        defaultDurationMinutes: '',
        recurrenceType: 'none',  // 'none' | 'DAILY' | 'WEEKLY'
        recurrenceDays: [],
        seriesStart: '',
        seriesEnd: '',
    });

    useEffect(() => {
        if (initialData) {
            const rule = initialData.recurrenceRule || '';
            let recurrenceType = 'none';
            let recurrenceDays = [];
            if (rule === 'DAILY') { recurrenceType = 'DAILY'; }
            else if (rule.startsWith('WEEKLY:')) {
                recurrenceType = 'WEEKLY';
                recurrenceDays = rule.replace('WEEKLY:', '').split(',');
            }
            setFormData({
                clientId: initialData.client?.clientId || '',
                serviceId: initialData.service?.serviceId || initialData.service?.servicesId || '',
                totalHours: initialData.totalHours || '',
                zipcode: initialData.zipcode || '',
                openForMatching: initialData.openForMatching ?? true,
                defaultStartTime: initialData.defaultStartTime ? initialData.defaultStartTime.slice(0, 5) : '',
                defaultDurationMinutes: initialData.defaultDurationMinutes || '',
                recurrenceType,
                recurrenceDays,
                seriesStart: initialData.seriesStart || '',
                seriesEnd: initialData.seriesEnd || '',
            });
        } else {
            setFormData({ clientId: '', serviceId: '', totalHours: '', zipcode: '', openForMatching: true, defaultStartTime: '', defaultDurationMinutes: '', recurrenceType: 'none', recurrenceDays: [], seriesStart: '', seriesEnd: '' });
        }
    }, [initialData, isOpen]);

    if (!isOpen) return null;

    const toggleDay = (day) => {
        setFormData(prev => ({
            ...prev,
            recurrenceDays: prev.recurrenceDays.includes(day)
                ? prev.recurrenceDays.filter(d => d !== day)
                : [...prev.recurrenceDays, day],
        }));
    };

    const buildRecurrenceRule = () => {
        if (formData.recurrenceType === 'DAILY') return 'DAILY';
        if (formData.recurrenceType === 'WEEKLY' && formData.recurrenceDays.length > 0) {
            return `WEEKLY:${formData.recurrenceDays.join(',')}`;
        }
        return null;
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        const recurrenceRule = buildRecurrenceRule();
        const payload = {
            client:   { clientId: parseInt(formData.clientId, 10) },
            service:  { servicesId: parseInt(formData.serviceId, 10) },
            totalHours: parseInt(formData.totalHours, 10),
            zipcode: formData.zipcode,
            openForMatching: formData.openForMatching,
            defaultStartTime: formData.defaultStartTime ? `${formData.defaultStartTime}:00` : null,
            defaultDurationMinutes: formData.defaultDurationMinutes ? parseInt(formData.defaultDurationMinutes, 10) : null,
            recurrenceRule,
            seriesStart: formData.seriesStart || null,
            seriesEnd:   formData.seriesEnd   || null,
        };
        onSave(payload);
    };

    const hasScheduling = !!formData.defaultStartTime;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm">
            <div className="w-full max-w-lg rounded-xl bg-white p-6 shadow-2xl overflow-y-auto max-h-[90vh]">
                <h2 className="text-xl font-bold mb-4">
                    {initialData ? 'Edit Shift' : 'Post New Shift'}
                </h2>

                <form onSubmit={handleSubmit} className="space-y-4">
                    {/* Client Selection */}
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1">Client</label>
                        <select required className="w-full rounded-lg border border-gray-300 p-2.5 focus:ring-2 focus:ring-indigo-500"
                            value={formData.clientId} onChange={e => setFormData({...formData, clientId: e.target.value})}>
                            <option value="">-- Select Client --</option>
                            {clients.map(c => <option key={c.clientId} value={c.clientId}>{c.firstName} {c.lastName}</option>)}
                        </select>
                    </div>

                    {/* Service Selection */}
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1">Service Type</label>
                        <select required className="w-full rounded-lg border border-gray-300 p-2.5 focus:ring-2 focus:ring-indigo-500"
                            value={formData.serviceId} onChange={e => setFormData({...formData, serviceId: e.target.value})}>
                            <option value="">-- Select Service --</option>
                            {services.map(s => {
                                const id = s.servicesId || s.serviceId || s.id;
                                return <option key={id} value={id}>{s.serviceName}</option>;
                            })}
                        </select>
                    </div>

                    {/* Duration and Zip */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-1">Total Hours</label>
                            <input type="number" required max="24" className="w-full rounded-lg border border-gray-300 p-2.5"
                                value={formData.totalHours} onChange={e => setFormData({...formData, totalHours: e.target.value})} />
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-1">Zipcode</label>
                            <input type="text" required className="w-full rounded-lg border border-gray-300 p-2.5"
                                value={formData.zipcode} onChange={e => setFormData({...formData, zipcode: e.target.value})} />
                        </div>
                    </div>

                    {/* Scheduling section */}
                    <div className="border-t border-gray-200 pt-4">
                        <p className="text-sm font-semibold text-gray-700 mb-3">Scheduling <span className="text-gray-400 font-normal">(optional — required for calendar)</span></p>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-medium text-gray-600 mb-1">Start Time</label>
                                <input type="time" className="w-full rounded-lg border border-gray-300 p-2.5 text-sm"
                                    value={formData.defaultStartTime} onChange={e => setFormData({...formData, defaultStartTime: e.target.value})} />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-600 mb-1">Duration (minutes)</label>
                                <input type="number" min="15" max="1440" step="15" placeholder="e.g. 240"
                                    className="w-full rounded-lg border border-gray-300 p-2.5 text-sm"
                                    value={formData.defaultDurationMinutes} onChange={e => setFormData({...formData, defaultDurationMinutes: e.target.value})} />
                            </div>
                        </div>
                    </div>

                    {/* Recurrence — only when start time is set */}
                    {hasScheduling && (
                        <div className="space-y-3">
                            <div>
                                <label className="block text-xs font-medium text-gray-600 mb-1">Repeat</label>
                                <select className="w-full rounded-lg border border-gray-300 p-2.5 text-sm"
                                    value={formData.recurrenceType} onChange={e => setFormData({...formData, recurrenceType: e.target.value, recurrenceDays: []})}>
                                    <option value="none">Does not repeat</option>
                                    <option value="DAILY">Daily</option>
                                    <option value="WEEKLY">Weekly on specific days</option>
                                </select>
                            </div>

                            {formData.recurrenceType === 'WEEKLY' && (
                                <div>
                                    <label className="block text-xs font-medium text-gray-600 mb-2">Repeat on</label>
                                    <div className="flex gap-1.5 flex-wrap">
                                        {DAYS.map(day => (
                                            <button key={day} type="button"
                                                onClick={() => toggleDay(day)}
                                                className={`px-2.5 py-1 rounded-full text-xs font-semibold transition-colors ${
                                                    formData.recurrenceDays.includes(day)
                                                        ? 'bg-indigo-600 text-white'
                                                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                                }`}
                                            >
                                                {day}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {formData.recurrenceType !== 'none' && (
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-medium text-gray-600 mb-1">Series Start</label>
                                        <input type="date" required className="w-full rounded-lg border border-gray-300 p-2.5 text-sm"
                                            value={formData.seriesStart} onChange={e => setFormData({...formData, seriesStart: e.target.value})} />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-gray-600 mb-1">Series End <span className="text-gray-400">(optional)</span></label>
                                        <input type="date" className="w-full rounded-lg border border-gray-300 p-2.5 text-sm"
                                            value={formData.seriesEnd} onChange={e => setFormData({...formData, seriesEnd: e.target.value})} />
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Availability toggle — only shown when editing */}
                    {initialData && (
                        <div className="flex items-center justify-between rounded-lg border border-gray-200 bg-gray-50 px-4 py-3">
                            <div>
                                <p className="text-sm font-semibold text-gray-700">Availability</p>
                                <p className="text-xs text-gray-400">Toggle whether this shift is open for matching</p>
                            </div>
                            <div className="flex items-center gap-3">
                                <span className={`text-sm font-semibold ${formData.openForMatching ? 'text-blue-600' : 'text-gray-400'}`}>
                                    {formData.openForMatching ? 'Matching on' : 'Matching off'}
                                </span>
                                <button type="button"
                                    onClick={() => setFormData({ ...formData, openForMatching: !formData.openForMatching })}
                                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ${formData.openForMatching ? 'bg-green-500' : 'bg-gray-300'}`}>
                                    <span className={`inline-block h-5 w-5 rounded-full bg-white shadow transform transition-transform duration-200 ${formData.openForMatching ? 'translate-x-5' : 'translate-x-0'}`} />
                                </button>
                            </div>
                        </div>
                    )}

                    <div className="mt-6 flex justify-end gap-3">
                        <button type="button" onClick={onClose}
                            className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg">
                            Cancel
                        </button>
                        <button type="submit"
                            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500">
                            {initialData ? 'Save Changes' : 'Create Shift'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
