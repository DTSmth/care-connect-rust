import { useState, useEffect } from 'react';
import { geocodeZipcode } from '../utils/geocode';

const DAYS = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];

export default function CreateShiftModal({ isOpen, onClose, clients = [], services = [], onSave, initialData }) {
    const [formData, setFormData] = useState({
        clientId: '',
        serviceId: '',
        totalHours: '',
        zipcode: '',
        openForMatching: true,
        defaultStartTime: '',
        defaultDurationMinutes: '',
        recurrenceType: 'none',
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

    const handleSubmit = async (e) => {
        e.preventDefault();
        const recurrenceRule = buildRecurrenceRule();
        const coords = await geocodeZipcode(formData.zipcode);

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
            locationLat: coords?.lat ?? null,
            locationLon: coords?.lon ?? null,
        };
        onSave(payload);
    };

    const hasScheduling = !!formData.defaultStartTime;
    const inputCls = "w-full rounded-lg border border-[#cbd5e1] p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#0487D9] focus:border-transparent";
    const labelCls = "block text-sm font-semibold text-slate-700 mb-1";

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm">
            <div className="w-full max-w-lg rounded-xl bg-white p-6 shadow-2xl overflow-y-auto max-h-[90vh]">
                <h2 className="text-xl font-bold text-slate-800 mb-1">
                    {initialData ? 'Edit Shift' : 'Post New Shift'}
                </h2>
                <p className="text-sm text-[#64748b] mb-5">Fill in the shift details below.</p>

                <form onSubmit={handleSubmit} className="space-y-4">
                    {/* Client Selection */}
                    <div>
                        <label className={labelCls}>Client</label>
                        <select required className={inputCls}
                            value={formData.clientId} onChange={e => setFormData({...formData, clientId: e.target.value})}>
                            <option value="">-- Select Client --</option>
                            {clients.map(c => <option key={c.clientId} value={c.clientId}>{c.firstName} {c.lastName}</option>)}
                        </select>
                    </div>

                    {/* Service Selection */}
                    <div>
                        <label className={labelCls}>Service Type</label>
                        <select required className={inputCls}
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
                            <label className={labelCls}>Total Hours</label>
                            <input type="number" required max="24" className={inputCls}
                                value={formData.totalHours} onChange={e => setFormData({...formData, totalHours: e.target.value})} />
                        </div>
                        <div>
                            <label className={labelCls}>Zipcode</label>
                            <input type="text" required className={inputCls}
                                value={formData.zipcode} onChange={e => setFormData({...formData, zipcode: e.target.value})} />
                        </div>
                    </div>

                    {/* Scheduling section */}
                    <div className="border-t border-[#e2e8f0] pt-4">
                        <p className="text-sm font-semibold text-slate-700 mb-3">
                            Scheduling <span className="text-[#64748b] font-normal">(optional — required for calendar)</span>
                        </p>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-medium text-slate-600 mb-1">Start Time</label>
                                <input type="time" className={inputCls}
                                    value={formData.defaultStartTime} onChange={e => setFormData({...formData, defaultStartTime: e.target.value})} />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-slate-600 mb-1">Duration (minutes)</label>
                                <input type="number" min="15" max="1440" step="15" placeholder="e.g. 240"
                                    className={inputCls}
                                    value={formData.defaultDurationMinutes} onChange={e => setFormData({...formData, defaultDurationMinutes: e.target.value})} />
                            </div>
                        </div>
                    </div>

                    {/* Recurrence */}
                    {hasScheduling && (
                        <div className="space-y-3">
                            <div>
                                <label className="block text-xs font-medium text-slate-600 mb-1">Repeat</label>
                                <select className={inputCls}
                                    value={formData.recurrenceType} onChange={e => setFormData({...formData, recurrenceType: e.target.value, recurrenceDays: []})}>
                                    <option value="none">Does not repeat</option>
                                    <option value="DAILY">Daily</option>
                                    <option value="WEEKLY">Weekly on specific days</option>
                                </select>
                            </div>

                            {formData.recurrenceType === 'WEEKLY' && (
                                <div>
                                    <label className="block text-xs font-medium text-slate-600 mb-2">Repeat on</label>
                                    <div className="flex gap-1.5 flex-wrap">
                                        {DAYS.map(day => (
                                            <button key={day} type="button"
                                                onClick={() => toggleDay(day)}
                                                className={`px-2.5 py-1 rounded-full text-xs font-semibold transition-colors ${
                                                    formData.recurrenceDays.includes(day)
                                                        ? 'bg-[#0487D9] text-white'
                                                        : 'bg-[#F2F2F2] text-slate-600 hover:bg-[#e2e8f0]'
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
                                        <label className="block text-xs font-medium text-slate-600 mb-1">Series Start</label>
                                        <input type="date" required className={inputCls}
                                            value={formData.seriesStart} onChange={e => setFormData({...formData, seriesStart: e.target.value})} />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-slate-600 mb-1">Series End <span className="text-[#64748b]">(optional)</span></label>
                                        <input type="date" className={inputCls}
                                            value={formData.seriesEnd} onChange={e => setFormData({...formData, seriesEnd: e.target.value})} />
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Availability toggle — only shown when editing */}
                    {initialData && (
                        <div className="flex items-center justify-between rounded-lg border border-[#e2e8f0] bg-[#F2F2F2] px-4 py-3">
                            <div>
                                <p className="text-sm font-semibold text-slate-700">Availability</p>
                                <p className="text-xs text-[#64748b]">Toggle whether this shift is open for matching</p>
                            </div>
                            <div className="flex items-center gap-3">
                                <span className={`text-sm font-semibold ${formData.openForMatching ? 'text-[#0487D9]' : 'text-[#64748b]'}`}>
                                    {formData.openForMatching ? 'Matching on' : 'Matching off'}
                                </span>
                                <button type="button"
                                    onClick={() => setFormData({ ...formData, openForMatching: !formData.openForMatching })}
                                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ${formData.openForMatching ? 'bg-[#10b981]' : 'bg-[#e2e8f0]'}`}>
                                    <span className={`inline-block h-5 w-5 rounded-full bg-white shadow transform transition-transform duration-200 ${formData.openForMatching ? 'translate-x-5' : 'translate-x-0'}`} />
                                </button>
                            </div>
                        </div>
                    )}

                    <div className="mt-6 flex justify-end gap-3">
                        <button type="button" onClick={onClose}
                            className="px-4 py-2 text-sm font-medium text-[#64748b] hover:bg-[#F2F2F2] rounded-lg transition-colors">
                            Cancel
                        </button>
                        <button type="submit"
                            className="rounded-lg bg-[#0487D9] px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-[#0363A0] transition-colors">
                            {initialData ? 'Save Changes' : 'Create Shift'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
