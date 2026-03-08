import { useState, useEffect } from 'react';

export default function CreateEmployeeModal({ isOpen, onClose, onSave, initialData }) {
    const [formData, setFormData] = useState({
        firstName: '', lastName: '', phoneNumber: '', email: '',
    });

    useEffect(() => {
        if (initialData) {
            setFormData({
                firstName:   initialData.firstName   || '',
                lastName:    initialData.lastName    || '',
                phoneNumber: initialData.phoneNumber || '',
                email:       initialData.email       || '',
            });
        } else {
            setFormData({ firstName: '', lastName: '', phoneNumber: '', email: '' });
        }
    }, [initialData, isOpen]);

    if (!isOpen) return null;

    const handleSubmit = (e) => {
        e.preventDefault();
        onSave({
            firstName:   formData.firstName,
            lastName:    formData.lastName,
            phoneNumber: formData.phoneNumber,
            email:       formData.email || null,
        });
    };

    const inputCls = "w-full rounded-lg border border-[#cbd5e1] p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#0487D9] focus:border-transparent";
    const labelCls = "block text-sm font-semibold text-slate-700 mb-1";

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm">
            <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-2xl">
                <h2 className="text-xl font-bold text-slate-800 mb-1">
                    {initialData ? 'Edit Employee' : 'Add Employee'}
                </h2>
                <p className="text-sm text-[#64748b] mb-5">Enter the employee's details below.</p>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className={labelCls}>First Name</label>
                            <input
                                type="text" required
                                className={inputCls}
                                value={formData.firstName}
                                onChange={e => setFormData({ ...formData, firstName: e.target.value })}
                            />
                        </div>
                        <div>
                            <label className={labelCls}>Last Name</label>
                            <input
                                type="text" required
                                className={inputCls}
                                value={formData.lastName}
                                onChange={e => setFormData({ ...formData, lastName: e.target.value })}
                            />
                        </div>
                    </div>

                    <div>
                        <label className={labelCls}>Phone Number</label>
                        <input
                            type="tel" required
                            className={inputCls}
                            placeholder="555-000-0000"
                            value={formData.phoneNumber}
                            onChange={e => setFormData({ ...formData, phoneNumber: e.target.value })}
                        />
                    </div>

                    <div>
                        <label className={labelCls}>
                            Email <span className="text-[#64748b] font-normal">(optional)</span>
                        </label>
                        <input
                            type="email"
                            className={inputCls}
                            placeholder="employee@example.com"
                            value={formData.email}
                            onChange={e => setFormData({ ...formData, email: e.target.value })}
                        />
                    </div>

                    <div className="flex justify-end gap-3 pt-2">
                        <button
                            type="button" onClick={onClose}
                            className="px-4 py-2 text-sm font-medium text-[#64748b] hover:bg-[#F2F2F2] rounded-lg transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="rounded-lg bg-[#0487D9] px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-[#0363A0] transition-colors"
                        >
                            {initialData ? 'Save Changes' : 'Add Employee'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
