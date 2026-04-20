import AdminLayout from '@/Layouts/AdminLayout';
import { Head, router, usePage } from '@inertiajs/react';
import { useState, useRef, useEffect } from 'react';
import React from 'react';
import ViolationLetterModal from '@/Components/ViolationLetterModal';

// â”€â”€â”€ Helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

/** Minutes integer â†’ "HH:MM" (for Late AM/PM, UT, OT columns) */
function fmtTime(min) {
    if (min === null || min === undefined || min === 0) return '00:00';
    const abs = Math.abs(Math.round(min));
    const h = Math.floor(abs / 60);
    const m = abs % 60;
    return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}`;
}

/** Stored "HH:MM:SS" â†’ display "HH:MM:SS", or "â€”" if null/midnight */
function fmtClock(t) {
    if (!t || t === '00:00:00') return 'â€”';
    const parts = t.split(':');
    const hh = String(parseInt(parts[0] ?? 0, 10)).padStart(2, '0');
    const mm = String(parseInt(parts[1] ?? 0, 10)).padStart(2, '0');
    const ss = String(parseInt(parts[2] ?? 0, 10)).padStart(2, '0');
    return `${hh}:${mm}:${ss}`;
}

/** Normalise time input â†’ "HH:MM:SS" for API, or null if blank/midnight */
function toApiTime(val) {
    if (!val || val.trim() === '') return null;
    const parts = val.split(':');
    const hh = String(parseInt(parts[0] ?? 0, 10)).padStart(2, '0');
    const mm = String(parseInt(parts[1] ?? 0, 10)).padStart(2, '0');
    const ss = String(parseInt(parts[2] ?? 0, 10)).padStart(2, '0');
    const normalised = `${hh}:${mm}:${ss}`;
    return normalised === '00:00:00' ? null : normalised;
}

/** "YYYY-MM-DD" â†’ short day name e.g. "Sun" */
function dayName(dateStr) {
    return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short' });
}

/** Is this date a Sunday? */
function isSunday(dateStr) {
    return new Date(dateStr + 'T00:00:00').getDay() === 0;
}

/** Does the record have any edit history? (reviewed_at is set) */
function wasAdjusted(record) {
    return !!record.reviewed_at;
}

/** Classify a record for filtering */
function classifyRecord(r) {
    const s = (r.status || '').toLowerCase();
    const flags = [];
    if (s.includes('absent'))                          flags.push('absent');
    if (r.missed_logs_count > 0)                       flags.push('missing');
    if (r.total_late_minutes > 0 || s.includes('late')) flags.push('late');
    if (r.undertime_minutes > 0 || s.includes('undertime')) flags.push('undertime');
    if (isSunday(r.attendance_date)) {
        if (s.includes('unauthorized'))                flags.push('sunday-unauth');
        else if (s.includes('sunday work') || s.includes('sunday_work')) flags.push('sunday-auth');
        else if (r.time_in_am || r.time_in_pm)         flags.push('sunday-unauth');
    }
    return flags;
}

/** Row background based on record state */
function rowBg(record) {
    const s = (record.status || '').toLowerCase();
    if (s.includes('absent') && !s.includes('holiday')) return 'bg-red-50';
    if (record.missed_logs_count > 0)                   return 'bg-orange-50/60';
    if (record.total_late_minutes > 0 || record.undertime_minutes > 0) return 'bg-yellow-50/60';
    if (s.includes('sunday work'))                      return 'bg-indigo-50/60';
    return '';
}

/** Status badge map â€” ordered by priority (day type â†’ issues â†’ extra) */
const STATUS_BADGE_MAP = {
    // Day type / special condition
    'Present - Sunday Work':            'bg-indigo-100 text-indigo-700',
    'Sunday Work':                      'bg-indigo-100 text-indigo-700',
    'Present - Holiday':                'bg-blue-100 text-blue-700',
    'Present - Special Circumstances':  'bg-teal-100 text-teal-700',
    'Present - Unauthorized Work Day':  'bg-amber-100 text-amber-700',
    // No Work (company-declared)
    'No Work':                          'bg-slate-100 text-slate-600',
    // Issues
    'Missed Log':                       'bg-pink-100 text-pink-700',
    'Late':                             'bg-yellow-100 text-yellow-700',
    'Undertime':                        'bg-purple-100 text-purple-700',
    'Half Day':                         'bg-orange-100 text-orange-700',
    'Absent':                           'bg-red-100 text-red-700',
    'Absent - Holiday':                 'bg-slate-100 text-slate-600',
    'Absent - Holiday Pay':             'bg-slate-100 text-slate-600',
    'Absent - Excused':                 'bg-slate-100 text-slate-600',
    // Clean
    'Present':                          'bg-green-100 text-green-700',
};

function getStatusBadges(status) {
    if (!status) return null;
    // Sort tokens: day-type first, then issues, then present
    const ORDER = [
        'Sunday Work','Present - Sunday Work','Present - Holiday','Present - Special Circumstances',
        'Present - Unauthorized Work Day','Missed Log','Late','Undertime','Half Day',
        'Absent','Absent - Holiday','Absent - Holiday Pay','Absent - Excused','Present',
    ];
    const tokens = status.split(',').map(s => s.trim());
    tokens.sort((a, b) => {
        const ai = ORDER.indexOf(a), bi = ORDER.indexOf(b);
        return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
    });
    return tokens.map((s, i) => (
        <span key={i} className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${STATUS_BADGE_MAP[s] || 'bg-slate-100 text-slate-600'}`}>{s}</span>
    ));
}

function getDetailRowBg(record) {
    return rowBg(record);
}

// â”€â”€â”€ Step indicator â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function StepIndicator({ currentStep }) {
    const steps = [
        { id: 1, label: 'Files' },
        { id: 2, label: 'Review' },
        { id: 3, label: 'Generate' },
        { id: 4, label: 'Payslip' },
    ];
    return (
        <div className="mb-6 flex items-center justify-between rounded-lg border border-slate-200 bg-white px-6 py-4 shadow-sm">
            {steps.map((step, idx) => (
                <div key={step.id} className="flex flex-1 items-center">
                    <div className="flex flex-col items-center">
                        <div className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold transition-colors ${
                            currentStep > step.id ? 'bg-green-500 text-white'
                            : currentStep === step.id ? 'bg-[#1E3A8A] text-white'
                            : 'bg-slate-200 text-slate-500'
                        }`}>
                            {currentStep > step.id
                                ? <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                                : step.id}
                        </div>
                        <span className={`mt-1 text-xs font-medium ${
                            currentStep === step.id ? 'text-[#1E3A8A]' : currentStep > step.id ? 'text-green-600' : 'text-slate-400'
                        }`}>{step.label}</span>
                    </div>
                    {idx < steps.length - 1 && (
                        <div className={`mx-2 h-0.5 flex-1 transition-colors ${currentStep > step.id ? 'bg-green-400' : 'bg-slate-200'}`} />
                    )}
                </div>
            ))}
        </div>
    );
}

// â”€â”€â”€ Sunday Authorize Modal (row-level + bulk per-employee) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function SundayAuthorizeModal({ records, employeeId, onClose, onAuthorized, isBulkMainPage = false }) {
    // records: array of record objects to authorize (1 = single, many = bulk)
    const isBulk = records.length > 1 || isBulkMainPage;
    const [reason, setReason] = useState('');
    const [useCustomHours, setUseCustomHours] = useState(false);
    const [openingTime, setOpeningTime] = useState('08:00');
    const [closingTime, setClosingTime] = useState('17:00');
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState(null);

    async function handleSubmit(e) {
        e.preventDefault();
        if (!reason.trim()) { setError('Reason is required.'); return; }
        setSaving(true);
        setError(null);

        const csrf = document.querySelector('meta[name="csrf-token"]')?.content;
        const headers = {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'X-CSRF-TOKEN': csrf,
        };
        const body = {
            reason: reason.trim(),
            opening_time: useCustomHours ? openingTime : null,
            closing_time: useCustomHours ? closingTime : null,
        };

        try {
            let res, data;
            if (isBulkMainPage) {
                // Main-page bulk endpoint â€” no specific employee
                res = await fetch(route('api.attendance.authorize-sundays'), {
                    method: 'POST', headers,
                    body: JSON.stringify({
                        ...body,
                        employee_ids: [...new Set(records.map(r => Number(r.employee_id)))].filter(n => Number.isInteger(n) && n > 0),
                    }),
                });
            } else if (isBulk) {
                // Bulk per-employee endpoint
                res = await fetch(route('api.attendance.employees.authorize-sundays', employeeId), {
                    method: 'POST', headers, body: JSON.stringify(body),
                });
            } else {
                // Single record endpoint
                res = await fetch(route('api.attendance.records.authorize-sunday', records[0].id), {
                    method: 'POST', headers, body: JSON.stringify(body),
                });
            }
            data = await res.json();
            if (!res.ok) throw new Error(data.error || data.message || 'Authorization failed');
            onAuthorized(data);
            onClose();
        } catch (err) {
            setError(err.message);
        } finally {
            setSaving(false);
        }
    }

    const dateLabels = records.map(r =>
        new Date(r.attendance_date + 'T00:00:00').toLocaleDateString('en-US', {
            weekday: 'short', month: 'short', day: 'numeric',
        })
    );

    return (
        <>
            <div className="fixed inset-0 z-[60] bg-black/50 backdrop-blur-sm" onClick={onClose} />
            <div className="fixed left-1/2 top-1/2 z-[70] w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-xl border border-slate-200 bg-white shadow-2xl">
                <div className="flex items-start gap-3 border-b border-slate-200 px-6 py-4">
                    <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-indigo-100">
                        <svg className="h-4 w-4 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                        </svg>
                    </div>
                    <div>
                        <h3 className="text-sm font-semibold text-slate-900">
                            {isBulk ? `Authorize ${records.length} Sunday Records` : 'Authorize Sunday Work'}
                        </h3>
                        <p className="mt-0.5 text-xs text-slate-500">
                            {isBulk
                                ? `${records.length} Sunday records will be authorized`
                                : dateLabels[0]}
                        </p>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="px-6 py-4 space-y-4">
                    {/* Affected dates (bulk) */}
                    {isBulk && (
                        <div className="rounded-lg border border-indigo-100 bg-indigo-50 px-3 py-2">
                            <p className="text-[10px] font-semibold uppercase tracking-wide text-indigo-500 mb-1.5">Affected Dates</p>
                            <div className="flex flex-wrap gap-1">
                                {dateLabels.map((d, i) => (
                                    <span key={i} className="rounded-full bg-indigo-100 px-2 py-0.5 text-xs font-medium text-indigo-700">{d}</span>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* What this does */}
                    <p className="text-xs text-slate-600">
                        A <strong>Sunday Work</strong> schedule override will be created. Attendance will be recomputed â€” late, undertime, and overtime will apply against the regular schedule.
                    </p>

                    {/* Reason */}
                    <div>
                        <label htmlFor="sunday-auth-reason" className="mb-1 block text-xs font-semibold text-slate-700">
                            Reason <span className="text-red-500">*</span>
                        </label>
                        <textarea
                            id="sunday-auth-reason"
                            name="sunday_auth_reason"
                            rows={2}
                            required
                            placeholder="e.g. Project deadline, client requirementâ€¦"
                            value={reason}
                            onChange={e => setReason(e.target.value)}
                            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-200 resize-none"
                        />
                    </div>

                    {/* Custom hours toggle */}
                    <div>
                        <label className="flex items-center gap-2 cursor-pointer select-none">
                            <input type="checkbox" checked={useCustomHours} onChange={e => setUseCustomHours(e.target.checked)}
                                className="h-3.5 w-3.5 rounded border-slate-300 text-indigo-600" />
                            <span className="text-xs font-medium text-slate-700">Use custom hours (optional)</span>
                        </label>
                        <p className="mt-0.5 ml-5 text-[10px] text-slate-400">Leave unchecked to use the department's default schedule</p>
                    </div>

                    {useCustomHours && (
                        <div className="grid grid-cols-2 gap-3 ml-5">
                            <div>
                                <label htmlFor="sunday-auth-start" className="mb-1 block text-[10px] font-medium text-slate-500 uppercase tracking-wide">Start Time</label>
                                <input id="sunday-auth-start" name="opening_time" type="time" value={openingTime} onChange={e => setOpeningTime(e.target.value)}
                                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs focus:border-indigo-500 focus:outline-none" />
                            </div>
                            <div>
                                <label htmlFor="sunday-auth-end" className="mb-1 block text-[10px] font-medium text-slate-500 uppercase tracking-wide">End Time</label>
                                <input id="sunday-auth-end" name="closing_time" type="time" value={closingTime} onChange={e => setClosingTime(e.target.value)}
                                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs focus:border-indigo-500 focus:outline-none" />
                            </div>
                        </div>
                    )}

                    {error && <p className="text-xs text-red-600">{error}</p>}

                    <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                        <button type="button" onClick={onClose}
                            className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 transition">
                            Cancel
                        </button>
                        <button type="submit" disabled={saving}
                            className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50 transition">
                            {saving
                                ? <><svg className="h-3.5 w-3.5 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>Authorizingâ€¦</>
                                : <><svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>Authorize</>}
                        </button>
                    </div>
                </form>
            </div>
        </>
    );
}

// â”€â”€â”€ Edit Modal â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function EditRecordModal({ record, employeeCode, employeeName, onClose, onSave }) {
    const [saving, setSaving] = useState(false);
    const [rawLogs, setRawLogs] = useState(null);
    const [loadingLogs, setLoadingLogs] = useState(false);
    const [form, setForm] = useState({
        time_in_am:        record.time_in_am     || '',
        time_out_lunch:    record.time_out_lunch  || '',
        time_in_pm:        record.time_in_pm      || '',
        time_out_pm:       record.time_out_pm     || '',
        notes:             record.notes           || '',
        adjustment_reason: '',
    });
    const [error, setError] = useState(null);
    const [isDirty, setIsDirty] = useState(false);

    useEffect(() => {
        if (employeeCode) {
            setLoadingLogs(true);
            fetch(route('api.attendance.logs.raw') + `?employee_code=${encodeURIComponent(employeeCode)}&date=${record.attendance_date}`)
                .then(r => r.json())
                .then(d => setRawLogs(d.logs || []))
                .catch(() => setRawLogs([]))
                .finally(() => setLoadingLogs(false));
        }
    }, [employeeCode, record.attendance_date]);

    function handleChange(field, value) {
        setForm(f => ({ ...f, [field]: value }));
        setIsDirty(true);
    }

    function handleClose() {
        if (isDirty) {
            if (!confirm('You have unsaved changes. Are you sure you want to close?')) {
                return;
            }
        }
        onClose();
    }

    async function handleSave() {
        if (!form.adjustment_reason.trim()) {
            setError('Adjustment reason is required.');
            return;
        }
        setSaving(true);
        setError(null);
        try {
            const payload = {
                time_in_am:        toApiTime(form.time_in_am),
                time_out_lunch:    toApiTime(form.time_out_lunch),
                time_in_pm:        toApiTime(form.time_in_pm),
                time_out_pm:       toApiTime(form.time_out_pm),
                notes:             form.notes || null,
                adjustment_reason: form.adjustment_reason.trim(),
            };
            const res = await fetch(route('api.attendance.records.update', record.id), {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.content,
                },
                body: JSON.stringify(payload),
            });
            const data = await res.json();
            if (data.success) {
                onSave(record.id, data.record ?? payload);
                onClose();
            } else {
                setError(data.error || 'Failed to save');
            }
        } catch {
            setError('Network error');
        } finally {
            setSaving(false);
        }
    }

    return (
        <>
            {/* Overlay */}
            <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm" onClick={handleClose} />
            
            {/* Modal */}
            <div className="fixed left-1/2 top-1/2 z-[60] w-full max-w-2xl -translate-x-1/2 -translate-y-1/2 rounded-lg border border-slate-200 bg-white shadow-2xl max-h-[90vh] overflow-hidden flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4 bg-gradient-to-r from-slate-50 to-white">
                    <div>
                        <h3 className="text-base font-semibold text-slate-900">Edit Attendance Record</h3>
                        <p className="text-sm text-slate-600 mt-0.5">
                            {employeeName} Â· {new Date(record.attendance_date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
                        </p>
                    </div>
                    <button onClick={handleClose} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition">
                        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/>
                        </svg>
                    </button>
                </div>

                {/* Content */}
                <div className="overflow-y-auto flex-1 px-5 py-4 space-y-4">
                    {/* Time Inputs */}
                    <div>
                        <label className="mb-2 block text-xs font-semibold text-slate-700 uppercase tracking-wide">Time Entries</label>
                        <div className="grid grid-cols-4 gap-3">
                            <div>
                                <label className="mb-1 block text-xs text-slate-600">In AM</label>
                                <input
                                    type="text"
                                    inputMode="numeric"
                                    placeholder="HH:MM:SS"
                                    value={form.time_in_am}
                                    onChange={e => handleChange('time_in_am', e.target.value)}
                                    className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm font-mono text-center focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                                />
                            </div>
                            <div>
                                <label className="mb-1 block text-xs text-slate-600">Out Lunch</label>
                                <input
                                    type="text"
                                    inputMode="numeric"
                                    placeholder="HH:MM:SS"
                                    value={form.time_out_lunch}
                                    onChange={e => handleChange('time_out_lunch', e.target.value)}
                                    className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm font-mono text-center focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                                />
                            </div>
                            <div>
                                <label className="mb-1 block text-xs text-slate-600">In PM</label>
                                <input
                                    type="text"
                                    inputMode="numeric"
                                    placeholder="HH:MM:SS"
                                    value={form.time_in_pm}
                                    onChange={e => handleChange('time_in_pm', e.target.value)}
                                    className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm font-mono text-center focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                                />
                            </div>
                            <div>
                                <label className="mb-1 block text-xs text-slate-600">Out PM</label>
                                <input
                                    type="text"
                                    inputMode="numeric"
                                    placeholder="HH:MM:SS"
                                    value={form.time_out_pm}
                                    onChange={e => handleChange('time_out_pm', e.target.value)}
                                    className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm font-mono text-center focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Status Badges */}
                    <div>
                        <label className="mb-2 block text-xs font-semibold text-slate-700 uppercase tracking-wide">Current Status</label>
                        <div className="flex flex-wrap gap-1.5">
                            {getStatusBadges(record.status)}
                        </div>
                    </div>

                    {/* Raw Logs */}
                    <div>
                        <label className="mb-2 block text-xs font-semibold text-slate-700 uppercase tracking-wide">Raw Biometric Logs</label>
                        <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                            {loadingLogs ? (
                                <div className="flex items-center gap-2 text-sm text-slate-400">
                                    <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
                                    </svg>
                                    Loading logs...
                                </div>
                            ) : !rawLogs || rawLogs.length === 0 ? (
                                <p className="text-sm text-slate-400 italic">No raw logs found for this date.</p>
                            ) : (
                                <div className="flex flex-wrap gap-2">
                                    {rawLogs.map((log, i) => (
                                        <span key={i} className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-mono font-semibold ${
                                            log.type === 'IN'
                                                ? 'bg-green-100 text-green-700 ring-1 ring-green-200'
                                                : 'bg-orange-100 text-orange-700 ring-1 ring-orange-200'
                                        }`}>
                                            <span className={`text-xs font-bold uppercase ${log.type === 'IN' ? 'text-green-600' : 'text-orange-600'}`}>{log.type}</span>
                                            {log.time}
                                        </span>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Adjustment Reason */}
                    <div>
                        <label className="mb-2 block text-xs font-semibold text-slate-700 uppercase tracking-wide">
                            Adjustment Reason <span className="text-red-500">*</span>
                        </label>
                        <textarea
                            rows={3}
                            required
                            placeholder="Explain why this attendance record is being modified (e.g., biometric malfunction, forgot to clock in, etc.)"
                            value={form.adjustment_reason}
                            onChange={e => handleChange('adjustment_reason', e.target.value)}
                            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 resize-none"
                        />
                        {error && (
                            <p className="flex items-center gap-1.5 text-sm text-red-600 mt-2">
                                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                                </svg>
                                {error}
                            </p>
                        )}
                    </div>
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between border-t border-slate-200 px-5 py-4 bg-slate-50">
                    <p className="text-xs text-slate-500 italic">
                        Late, undertime, and overtime will be recalculated automatically
                    </p>
                    <div className="flex items-center gap-2">
                        <button onClick={handleClose}
                            className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 transition">
                            Cancel
                        </button>
                        <button onClick={handleSave} disabled={saving}
                            className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 transition">
                            {saving ? (
                                <>
                                    <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
                                    </svg>
                                    Saving...
                                </>
                            ) : (
                                <>
                                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/>
                                    </svg>
                                    Save Changes
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </>
    );
}

// â”€â”€â”€ Inline record edit row â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function EditableRecordRow({ record, employeeCode, employeeName, onSave, onViewHistory, historyOpen, onAuthorizeSunday }) {
    const [editing, setEditing] = useState(false);
    const [rawLogs, setRawLogs] = useState(null);
    const [loadingLogs, setLoadingLogs] = useState(false);
    const [showingLogs, setShowingLogs] = useState(false);

    async function fetchRawLogs() {
        if (!employeeCode) return;
        setLoadingLogs(true);
        try {
            const res = await fetch(route('api.attendance.logs.raw') + `?employee_code=${encodeURIComponent(employeeCode)}&date=${record.attendance_date}`);
            const data = await res.json();
            setRawLogs(data.logs || []);
        } catch {
            setRawLogs([]);
        } finally {
            setLoadingLogs(false);
        }
    }

    function toggleLogs() {
        if (showingLogs) {
            setShowingLogs(false);
        } else {
            if (!rawLogs) fetchRawLogs();
            setShowingLogs(true);
        }
    }

    function handleSaveFromModal(recordId, updatedFields) {
        setEditing(false);
        onSave(recordId, updatedFields);
    }

    // Time input: accepts HH:MM:SS, shows placeholder when empty
    const timeInput = (field, label) => (
        <div className="flex flex-col gap-0.5">
            <label className="text-[10px] font-medium text-slate-600 uppercase tracking-wide">{label}</label>
            <input
                type="text"
                inputMode="numeric"
                placeholder="HH:MM:SS"
                value={form[field]}
                onChange={e => setForm(f => ({ ...f, [field]: e.target.value }))}
                className="w-24 rounded-md border border-slate-300 px-2 py-1.5 text-xs font-mono focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-200 transition"
            />
        </div>
    );

    const s = (record.status || '').toLowerCase();
    const isMissing   = record.missed_logs_count > 0;
    const isSun       = isSunday(record.attendance_date);
    const isSundayAuth= s.includes('sunday work');
    const hasLogs     = !!(record.time_in_am || record.time_in_pm);
    const adjusted    = wasAdjusted(record);
    const day         = dayName(record.attendance_date);

    return (
        <>
        <tr className={`${rowBg(record)} text-xs transition-colors hover:brightness-95`}>
            <td className="whitespace-nowrap px-3 py-2 text-center">
                <span className={`text-[10px] font-bold ${isSun ? 'text-indigo-500' : 'text-slate-400'}`}>{day}</span>
            </td>
            <td className="whitespace-nowrap px-3 py-2 font-medium text-slate-900">
                <span className="flex items-center gap-1">
                    {new Date(record.attendance_date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    {adjusted && (
                        <span title="Adjusted by HR" className="text-slate-400 cursor-help">
                            <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                        </span>
                    )}
                </span>
            </td>
            <td className="whitespace-nowrap px-3 py-2">
                <span className={record.late_minutes_am > 0 ? 'font-semibold text-orange-600' : 'text-slate-700'}>{fmtClock(record.time_in_am)}</span>
            </td>
            <td className="whitespace-nowrap px-3 py-2">
                <span className="text-slate-500">{fmtClock(record.time_out_lunch)}</span>
            </td>
            <td className="whitespace-nowrap px-3 py-2">
                <span className={record.late_minutes_pm > 0 ? 'font-semibold text-orange-600' : 'text-slate-700'}>{fmtClock(record.time_in_pm)}</span>
            </td>
            <td className="whitespace-nowrap px-3 py-2">
                <span className={record.undertime_minutes > 0 ? 'font-semibold text-purple-600' : 'text-slate-500'}>{fmtClock(record.time_out_pm)}</span>
            </td>
            <td className="whitespace-nowrap px-3 py-2 text-center" title="Late AM minutes">
                <span className={record.late_minutes_am > 0 ? 'font-semibold text-orange-600' : 'text-slate-300'}>{fmtTime(record.late_minutes_am)}</span>
            </td>
            <td className="whitespace-nowrap px-3 py-2 text-center" title="Late PM minutes">
                <span className={record.late_minutes_pm > 0 ? 'font-semibold text-orange-600' : 'text-slate-300'}>{fmtTime(record.late_minutes_pm)}</span>
            </td>
            <td className="whitespace-nowrap px-3 py-2 text-center" title="Total late minutes">
                <span className={record.total_late_minutes > 0 ? 'font-semibold text-orange-600' : 'text-slate-300'}>{fmtTime(record.total_late_minutes)}</span>
            </td>
            <td className="whitespace-nowrap px-3 py-2 text-center" title="Undertime minutes">
                <span className={record.undertime_minutes > 0 ? 'font-semibold text-purple-600' : 'text-slate-300'}>{fmtTime(record.undertime_minutes)}</span>
            </td>
            <td className="whitespace-nowrap px-3 py-2 text-center" title="Overtime minutes">
                <span className={record.overtime_minutes > 0 ? 'font-semibold text-green-600' : 'text-slate-300'}>{fmtTime(record.overtime_minutes)}</span>
            </td>
            <td className="whitespace-nowrap px-3 py-2 text-center" title="Number of missing attendance logs">
                <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${record.missed_logs_count > 0 ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                    {record.missed_logs_count}
                </span>
            </td>
            <td className="whitespace-nowrap px-3 py-2">
                <div className="flex flex-wrap items-center gap-1">
                    {getStatusBadges(record.status)}
                </div>
            </td>
            <td className="px-3 py-2 sticky right-0 bg-inherit">
                <div className="flex items-center gap-1 flex-wrap">
                    {isSun && hasLogs && !isSundayAuth && (
                        <button onClick={() => onAuthorizeSunday?.([record])}
                            className="inline-flex items-center gap-1 rounded-md border border-indigo-200 bg-indigo-50 px-2 py-1 text-xs font-medium text-indigo-700 hover:bg-indigo-100 transition"
                            title="Authorize this Sunday work">
                            <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                            Authorize
                        </button>
                    )}
                    {isSun && isSundayAuth && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-indigo-100 px-2 py-0.5 text-[10px] font-semibold text-indigo-700">
                            <svg className="h-2.5 w-2.5" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/></svg>
                            Authorized
                        </span>
                    )}
                    <button onClick={() => setEditing(true)}
                        className="inline-flex items-center gap-1 rounded-md border border-slate-200 px-2 py-1 text-xs text-slate-600 hover:border-[#1E3A8A] hover:text-[#1E3A8A] hover:bg-blue-50 transition"
                        title={isMissing ? 'Edit logs' : 'Edit record'}>
                        <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>
                        {isMissing ? 'Edit Logs' : 'Edit'}
                    </button>
                    <button onClick={toggleLogs}
                        className={`inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs transition ${showingLogs ? 'border-slate-400 bg-slate-100 text-slate-700' : 'border-slate-200 text-slate-400 hover:border-slate-400 hover:text-slate-600'}`}
                        title="View raw biometric logs">
                        <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"/></svg>
                    </button>
                    {onViewHistory && record.changes_count > 0 && (
                        <button onClick={() => onViewHistory(record.id)}
                            className={`inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs transition ${historyOpen ? 'border-slate-400 bg-slate-100 text-slate-700' : 'border-slate-200 text-slate-400 hover:border-slate-400 hover:text-slate-600'}`}
                            title="View change history">
                            <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                        </button>
                    )}
                </div>
            </td>
        </tr>
        {/* Raw logs row - shown when toggled */}
        {showingLogs && (
            <tr className="bg-slate-50 border-b border-slate-200">
                <td colSpan={14} className="px-4 py-3">
                    <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-500 mb-2 flex items-center gap-2">
                        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"/></svg>
                        Raw Biometric Logs â€” {record.attendance_date}
                    </div>
                    {loadingLogs ? (
                        <div className="flex items-center gap-2 text-xs text-slate-400">
                            <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
                            </svg>
                            Loading logsâ€¦
                        </div>
                    ) : !rawLogs || rawLogs.length === 0 ? (
                        <p className="text-xs text-slate-400 italic">No raw logs found for this date.</p>
                    ) : (
                        <div className="flex flex-wrap gap-2">
                            {rawLogs.map((log, i) => (
                                <span key={i} className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-mono font-semibold shadow-sm ${
                                    log.type === 'IN'
                                        ? 'bg-green-100 text-green-800 ring-1 ring-green-200'
                                        : 'bg-orange-100 text-orange-800 ring-1 ring-orange-200'
                                }`}>
                                    <span className={`inline-flex items-center justify-center rounded-md px-1.5 py-0.5 text-[9px] font-bold uppercase ${
                                        log.type === 'IN' ? 'bg-green-200 text-green-900' : 'bg-orange-200 text-orange-900'
                                    }`}>{log.type}</span>
                                    {log.time}
                                </span>
                            ))}
                        </div>
                    )}
                </td>
            </tr>
        )}
    </>
    );
}
