import { useState, useEffect } from 'react';
import { router } from '@inertiajs/react';

export default function GracePeriodSettingsTab({ departments = [], settings = {} }) {
    const [selectedDepartmentId, setSelectedDepartmentId] = useState('');
    const [form, setForm] = useState({
        cumulative_tracking_enabled: false,
        grace_period_limit_minutes: 60,
        tracking_period: 'monthly',
        pay_period_start_day: 1,
        pay_period_frequency: 'bi-weekly',
    });
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState(null);

    // Load settings when department is selected
    useEffect(() => {
        if (selectedDepartmentId) {
            const deptSettings = settings[selectedDepartmentId];
            if (deptSettings) {
                setForm({
                    cumulative_tracking_enabled: deptSettings.cumulative_tracking_enabled || false,
                    grace_period_limit_minutes: deptSettings.grace_period_limit_minutes || 60,
                    tracking_period: deptSettings.tracking_period || 'monthly',
                    pay_period_start_day: deptSettings.pay_period_start_day || 1,
                    pay_period_frequency: deptSettings.pay_period_frequency || 'bi-weekly',
                });
            } else {
                // Reset to defaults
                setForm({
                    cumulative_tracking_enabled: false,
                    grace_period_limit_minutes: 60,
                    tracking_period: 'monthly',
                    pay_period_start_day: 1,
                    pay_period_frequency: 'bi-weekly',
                });
            }
        }
    }, [selectedDepartmentId, settings]);

    const handleSubmit = (e) => {
        e.preventDefault();
        
        if (!selectedDepartmentId) {
            setMessage({ type: 'error', text: 'Please select a department' });
            return;
        }

        // Validate grace period limit
        if (form.grace_period_limit_minutes < 1 || form.grace_period_limit_minutes > 480) {
            setMessage({ type: 'error', text: 'Grace period limit must be between 1 and 480 minutes' });
            return;
        }

        setLoading(true);
        router.put(
            route('admin.settings.grace-period.update', selectedDepartmentId),
            form,
            {
                preserveState: true,
                onSuccess: () => {
                    setMessage({ type: 'success', text: 'Grace period settings saved successfully' });
                    setLoading(false);
                },
                onError: (errors) => {
                    setMessage({ type: 'error', text: Object.values(errors).join(', ') });
                    setLoading(false);
                },
            }
        );
    };

    return (
        <div className="space-y-6">

            {/* Info Banner */}
            <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
                <div className="flex items-start gap-3">
                    <svg className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <div className="flex-1">
                        <h4 className="text-sm font-semibold text-blue-900">About Grace Period Tracking</h4>
                        <p className="mt-1 text-sm text-blue-800">
                            Grace period tracking is always calculated on a monthly basis (calendar month), regardless of pay period frequency. 
                            The default grace period is 60 minutes per month. When an employee exceeds this limit, all late minutes beyond 
                            the threshold are subject to salary deduction.
                        </p>
                        <p className="mt-2 text-sm text-blue-800">
                            Pay period configuration is for payroll calculation reference only and does not affect grace period tracking.
                        </p>
                    </div>
                </div>
            </div>

            {/* Success/Error Message */}
            {message && (
                <div className={`rounded-lg border p-4 ${
                    message.type === 'success' 
                        ? 'border-green-200 bg-green-50' 
                        : 'border-red-200 bg-red-50'
                }`}>
                    <div className="flex items-start gap-3">
                        {message.type === 'success' ? (
                            <svg className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                        ) : (
                            <svg className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                        )}
                        <p className={`text-sm ${message.type === 'success' ? 'text-green-800' : 'text-red-800'}`}>
                            {message.text}
                        </p>
                    </div>
                </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
                {/* Department Selector */}
                <div className="rounded-lg border border-slate-200 bg-white shadow-sm p-5">
                    <label className="block text-sm font-semibold text-slate-900 mb-3">
                        Select Department <span className="text-red-600">*</span>
                    </label>
                    <select
                        value={selectedDepartmentId}
                        onChange={(e) => setSelectedDepartmentId(e.target.value)}
                        className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-900 shadow-sm transition focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                        required
                    >
                        <option value="">Choose a department...</option>
                        {departments.map((dept) => (
                            <option key={dept.id} value={dept.id}>
                                {dept.name}
                            </option>
                        ))}
                    </select>
                    <p className="mt-2 text-xs text-slate-500">
                        Configure grace period settings for each department independently
                    </p>
                </div>

                {selectedDepartmentId && (
                    <>
                        {/* Cumulative Tracking Toggle */}
                        <div className="rounded-lg border border-slate-200 bg-white shadow-sm p-5">
                            <label className="flex items-center justify-between cursor-pointer">
                                <div>
                                    <span className="text-sm font-semibold text-slate-900">Enable Cumulative Tracking</span>
                                    <p className="mt-1 text-xs text-slate-500">
                                        Track total late minutes across the month and trigger violations when limit is exceeded
                                    </p>
                                </div>
                                <input
                                    type="checkbox"
                                    checked={form.cumulative_tracking_enabled}
                                    onChange={(e) => setForm({ ...form, cumulative_tracking_enabled: e.target.checked })}
                                    className="h-5 w-5 rounded border-slate-300 text-primary transition focus:ring-2 focus:ring-primary/20"
                                />
                            </label>
                        </div>

                        {/* Grace Period Limit */}
                        <div className="rounded-lg border border-slate-200 bg-white shadow-sm p-5">
                            <label className="block text-sm font-semibold text-slate-900 mb-3">
                                Grace Period Limit (Minutes) <span className="text-red-600">*</span>
                            </label>
                            <div className="flex items-center gap-3">
                                <input
                                    type="number"
                                    min="1"
                                    max="480"
                                    value={form.grace_period_limit_minutes}
                                    onChange={(e) => setForm({ ...form, grace_period_limit_minutes: parseInt(e.target.value) || 60 })}
                                    className="w-32 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-900 shadow-sm transition focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                                    required
                                />
                                <span className="text-sm text-slate-600">minutes per month</span>
                            </div>
                            <p className="mt-2 text-xs text-slate-500">
                                Total late minutes allowed per calendar month before triggering violations (1-480 minutes)
                            </p>
                        </div>

                        {/* Tracking Period */}
                        <div className="rounded-lg border border-slate-200 bg-white shadow-sm p-5">
                            <label className="block text-sm font-semibold text-slate-900 mb-3">
                                Tracking Period <span className="text-red-600">*</span>
                            </label>
                            <select
                                value={form.tracking_period}
                                onChange={(e) => setForm({ ...form, tracking_period: e.target.value })}
                                className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-900 shadow-sm transition focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                                required
                            >
                                <option value="monthly">Monthly (Calendar Month)</option>
                                <option value="pay_period">Pay Period</option>
                                <option value="rolling_30">Rolling 30 Days</option>
                            </select>
                            <p className="mt-2 text-xs text-slate-500">
                                Default is Monthly (calendar month). This determines how late minutes are accumulated.
                            </p>
                        </div>

                        {/* Pay Period Configuration (conditional) */}
                        {form.tracking_period === 'pay_period' && (
                            <div className="rounded-lg border border-amber-200 bg-amber-50 p-5 space-y-4">
                                <div className="flex items-start gap-3 mb-4">
                                    <svg className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                    <div>
                                        <h4 className="text-sm font-semibold text-amber-900">Pay Period Configuration</h4>
                                        <p className="mt-1 text-xs text-amber-800">
                                            These settings are for payroll calculation reference only. Grace period tracking remains monthly.
                                        </p>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-slate-900 mb-2">
                                        Pay Period Start Day
                                    </label>
                                    <input
                                        type="number"
                                        min="1"
                                        max="31"
                                        value={form.pay_period_start_day}
                                        onChange={(e) => setForm({ ...form, pay_period_start_day: parseInt(e.target.value) || 1 })}
                                        className="w-32 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-900 shadow-sm transition focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                                    />
                                    <p className="mt-1 text-xs text-slate-500">
                                        Day of the month when pay period starts (1-31)
                                    </p>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-slate-900 mb-2">
                                        Pay Period Frequency
                                    </label>
                                    <select
                                        value={form.pay_period_frequency}
                                        onChange={(e) => setForm({ ...form, pay_period_frequency: e.target.value })}
                                        className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-900 shadow-sm transition focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                                    >
                                        <option value="weekly">Weekly</option>
                                        <option value="bi-weekly">Bi-weekly</option>
                                        <option value="semi-monthly">Semi-monthly</option>
                                        <option value="monthly">Monthly</option>
                                    </select>
                                    <p className="mt-1 text-xs text-slate-500">
                                        How often salary is paid (affects payroll timing, not grace period calculation)
                                    </p>
                                </div>
                            </div>
                        )}

                        {/* Save Button */}
                        <div className="flex items-center justify-end">
                            <button
                                type="submit"
                                disabled={loading}
                                className="inline-flex items-center gap-2 rounded-lg bg-primary px-6 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {loading ? (
                                    <>
                                        <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                        </svg>
                                        Saving...
                                    </>
                                ) : (
                                    <>
                                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                        </svg>
                                        Save Settings
                                    </>
                                )}
                            </button>
                        </div>
                    </>
                )}
            </form>
        </div>
    );
}
