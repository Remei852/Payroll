import AdminLayout from '@/Layouts/AdminLayout';
import { Head, router, usePage } from '@inertiajs/react';
import { useState, useRef, useEffect } from 'react';
import React from 'react';
import ViolationLetterModal from '@/Components/ViolationLetterModal';

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Minutes integer → "HH:MM" (for Late AM/PM, UT, OT columns) */
function fmtTime(min) {
    if (min === null || min === undefined || min === 0) return '00:00';
    const abs = Math.abs(Math.round(min));
    const h = Math.floor(abs / 60);
    const m = abs % 60;
    return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}`;
}

/** Stored "HH:MM:SS" → display "HH:MM:SS", or "—" if null/midnight */
function fmtClock(t) {
    if (!t || t === '00:00:00') return '—';
    const parts = t.split(':');
    const hh = String(parseInt(parts[0] ?? 0, 10)).padStart(2, '0');
    const mm = String(parseInt(parts[1] ?? 0, 10)).padStart(2, '0');
    const ss = String(parseInt(parts[2] ?? 0, 10)).padStart(2, '0');
    return `${hh}:${mm}:${ss}`;
}

/** Normalise time input → "HH:MM:SS" for API, or null if blank/midnight */
function toApiTime(val) {
    if (!val || val.trim() === '') return null;
    const parts = val.split(':');
    const hh = String(parseInt(parts[0] ?? 0, 10)).padStart(2, '0');
    const mm = String(parseInt(parts[1] ?? 0, 10)).padStart(2, '0');
    const ss = String(parseInt(parts[2] ?? 0, 10)).padStart(2, '0');
    const normalised = `${hh}:${mm}:${ss}`;
    return normalised === '00:00:00' ? null : normalised;
}

/** "YYYY-MM-DD" → short day name e.g. "Sun" */
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

/** Status badge map — ordered by priority (day type → issues → extra) */
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

// ─── Step indicator ───────────────────────────────────────────────────────────
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

// ─── Sunday Authorize Modal (row-level + bulk per-employee) ──────────────────
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
                // Main-page bulk endpoint — no specific employee
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
                        A <strong>Sunday Work</strong> schedule override will be created. Attendance will be recomputed — late, undertime, and overtime will apply against the regular schedule.
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
                            placeholder="e.g. Project deadline, client requirement…"
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
                                ? <><svg className="h-3.5 w-3.5 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>Authorizing…</>
                                : <><svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>Authorize</>}
                        </button>
                    </div>
                </form>
            </div>
        </>
    );
}

// ─── Inline record edit row ───────────────────────────────────────────────────
function EditableRecordRow({ record, employeeCode, onSave, onViewHistory, historyOpen, onAuthorizeSunday }) {
    const [editing, setEditing] = useState(false);
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

    function resetForm() {
        setForm({
            time_in_am:        record.time_in_am     || '',
            time_out_lunch:    record.time_out_lunch  || '',
            time_in_pm:        record.time_in_pm      || '',
            time_out_pm:       record.time_out_pm     || '',
            notes:             record.notes           || '',
            adjustment_reason: '',
        });
        setError(null);
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
                setEditing(false);
                // Pass back the full fresh record so the row re-renders with recalculated values
                onSave(record.id, data.record ?? payload);
            } else {
                setError(data.error || 'Failed to save');
            }
        } catch {
            setError('Network error');
        } finally {
            setSaving(false);
        }
    }

    // Time input: accepts HH:MM:SS, shows placeholder when empty
    const timeInput = (field, label) => (
        <div className="flex flex-col gap-0.5">
            <label className="text-[10px] font-medium text-slate-500 uppercase tracking-wide">{label}</label>
            <input
                type="text"
                inputMode="numeric"
                placeholder="HH:MM:SS"
                value={form[field]}
                onChange={e => setForm(f => ({ ...f, [field]: e.target.value }))}
                className="w-24 rounded border border-slate-300 px-2 py-1 text-xs font-mono focus:border-[#1E3A8A] focus:outline-none focus:ring-1 focus:ring-[#1E3A8A]/20"
            />
        </div>
    );

    if (editing) {
        return (
            <>
                <tr className="bg-blue-50 text-xs border-b border-blue-100">
                    <td className="whitespace-nowrap px-3 py-2 font-medium text-slate-800">
                        {new Date(record.attendance_date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </td>
                    {/* Time inputs */}
                    <td className="px-2 py-2">{timeInput('time_in_am', 'In AM')}</td>
                    <td className="px-2 py-2">{timeInput('time_out_lunch', 'Out Lunch')}</td>
                    <td className="px-2 py-2">{timeInput('time_in_pm', 'In PM')}</td>
                    <td className="px-2 py-2">{timeInput('time_out_pm', 'Out PM')}</td>
                    {/* Computed columns — read-only while editing */}
                    <td className="px-2 py-2 text-center text-slate-400 text-xs italic" colSpan={7}>
                        Recalculated on save
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                            <button onClick={handleSave} disabled={saving}
                                className="inline-flex items-center gap-1 rounded-md bg-[#1E3A8A] px-2.5 py-1 text-xs font-medium text-white hover:bg-[#1E3A8A]/90 disabled:opacity-50 transition">
                                {saving
                                    ? <><svg className="h-3 w-3 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/></svg>Saving</>
                                    : <><svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/></svg>Save</>}
                            </button>
                            <button onClick={() => { setEditing(false); resetForm(); }}
                                className="rounded-md border border-slate-300 px-2.5 py-1 text-xs font-medium text-slate-600 hover:bg-slate-100 transition">
                                Cancel
                            </button>
                        </div>
                    </td>
                </tr>
                {/* Reason row */}
                <tr className="bg-blue-50 border-b border-blue-200">
                    <td colSpan={14} className="px-3 pb-3 pt-0">
                        <div className="flex flex-col gap-1">
                            <label className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                                Adjustment Reason <span className="text-red-500">*</span>
                            </label>
                            <textarea
                                rows={2}
                                required
                                placeholder="Describe why this record is being corrected…"
                                value={form.adjustment_reason}
                                onChange={e => setForm(f => ({ ...f, adjustment_reason: e.target.value }))}
                                className="w-full rounded border border-slate-300 px-2 py-1.5 text-xs focus:border-[#1E3A8A] focus:outline-none focus:ring-1 focus:ring-[#1E3A8A]/20 resize-none"
                            />
                            {error && <p className="text-xs text-red-600">{error}</p>}
                        </div>
                    </td>
                </tr>
                {/* Raw logs panel */}
                <tr className="bg-slate-50 border-b border-blue-200">
                    <td colSpan={14} className="px-3 pb-3 pt-1">
                        <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-500 mb-1.5">
                            Raw Biometric Logs — {record.attendance_date}
                        </div>
                        {loadingLogs ? (
                            <p className="text-xs text-slate-400">Loading logs…</p>
                        ) : !rawLogs || rawLogs.length === 0 ? (
                            <p className="text-xs text-slate-400 italic">No raw logs found for this date.</p>
                        ) : (
                            <div className="flex flex-wrap gap-1.5">
                                {rawLogs.map((log, i) => (
                                    <span key={i} className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-mono font-semibold ${
                                        log.type === 'IN'
                                            ? 'bg-green-100 text-green-800'
                                            : 'bg-orange-100 text-orange-800'
                                    }`}>
                                        <span className="text-[9px] font-bold opacity-60">{log.type}</span>
                                        {log.time}
                                    </span>
                                ))}
                            </div>
                        )}
                    </td>
                </tr>
            </>
        );
    }

    const s = (record.status || '').toLowerCase();
    const isMissing   = record.missed_logs_count > 0;
    const isSun       = isSunday(record.attendance_date);
    const isSundayAuth= s.includes('sunday work');
    const hasLogs     = !!(record.time_in_am || record.time_in_pm);
    const adjusted    = wasAdjusted(record);
    const day         = dayName(record.attendance_date);

    return (
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
            <td className="px-3 py-2">
                <div className="flex flex-wrap gap-1">{getStatusBadges(record.status)}</div>
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
                    <button onClick={() => {
                            setEditing(true);
                            // Fetch raw logs for this date
                            if (employeeCode && !rawLogs) {
                                setLoadingLogs(true);
                                fetch(route('api.attendance.logs.raw') + `?employee_code=${encodeURIComponent(employeeCode)}&date=${record.attendance_date}`)
                                    .then(r => r.json())
                                    .then(d => setRawLogs(d.logs || []))
                                    .catch(() => setRawLogs([]))
                                    .finally(() => setLoadingLogs(false));
                            }
                        }}
                        className="inline-flex items-center gap-1 rounded-md border border-slate-200 px-2 py-1 text-xs text-slate-600 hover:border-[#1E3A8A] hover:text-[#1E3A8A] hover:bg-blue-50 transition"
                        title={isMissing ? 'Edit logs' : 'Edit record'}>
                        <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>
                        {isMissing ? 'Edit Logs' : 'Edit'}
                    </button>
                    {onViewHistory && (
                        <button onClick={() => onViewHistory(record.id)}
                            className={`inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs transition ${historyOpen ? 'border-slate-400 bg-slate-100 text-slate-700' : 'border-slate-200 text-slate-400 hover:border-slate-400 hover:text-slate-600'}`}
                            title="View change history">
                            <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                        </button>
                    )}
                </div>
            </td>
        </tr>
    );
}

// ─── Detail modal ─────────────────────────────────────────────────────────────
function DetailModal({ employee, onClose, onRecordSave }) {
    const allRecords = [...employee.records].sort((a, b) => new Date(a.attendance_date) - new Date(b.attendance_date));
    const [records, setRecords] = useState(allRecords);
    const [historyRecordId, setHistoryRecordId] = useState(null);
    const [history, setHistory] = useState([]);
    const [loadingHistory, setLoadingHistory] = useState(false);
    // authorizeTarget: { records: [], employeeId } — null = modal closed
    const [authorizeTarget, setAuthorizeTarget] = useState(null);

    // Sunday records pending authorization
    const pendingSundays = records.filter(r => {
        const s = (r.status || '').toLowerCase();
        return isSunday(r.attendance_date)
            && (r.time_in_am || r.time_in_pm)
            && s.includes('unauthorized');
    });

    function handleRecordSave(recordId, updatedFields) {
        setRecords(prev => prev.map(r => r.id !== recordId ? r : { ...r, ...updatedFields }));
        onRecordSave?.();
    }

    function handleAuthorized(data) {
        // data.record (single) or data.records (bulk)
        const updated = data.records ?? (data.record ? [data.record] : []);
        if (updated.length > 0) {
            setRecords(prev => prev.map(r => {
                const fresh = updated.find(u => u.id === r.id);
                return fresh ? { ...r, ...fresh } : r;
            }));
        }
        onRecordSave?.();
    }

    async function viewHistory(recordId) {
        if (historyRecordId === recordId) { setHistoryRecordId(null); return; }
        setHistoryRecordId(recordId);
        setLoadingHistory(true);
        try {
            const res = await fetch(route('api.attendance.records.changes', recordId));
            const data = await res.json();
            setHistory(data.changes ?? []);
        } finally { setLoadingHistory(false); }
    }

    const TOTAL_COLS = 14;

    return (
        <>
            <div className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm" onClick={onClose} />
            <div className="fixed left-1/2 top-1/2 z-50 w-full max-w-[96vw] -translate-x-1/2 -translate-y-1/2 rounded-xl border border-slate-200 bg-white shadow-2xl flex flex-col" style={{ maxHeight: '92vh' }}>

                {/* 1. Employee header */}
                <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4 flex-shrink-0">
                    <div>
                        <h3 className="text-base font-semibold text-slate-900">{employee.employee_name}</h3>
                        <p className="mt-0.5 text-xs text-slate-500">{employee.employee_code} · {employee.department}</p>
                    </div>
                    <button onClick={onClose} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition">
                        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>
                    </button>
                </div>

                {/* 2. Sunday pending authorization strip — only shown when applicable */}
                {pendingSundays.length > 0 && (
                    <div className="flex-shrink-0 flex items-center justify-between border-b border-indigo-200 bg-indigo-50 px-6 py-2.5">
                        <div className="flex items-center gap-2 text-xs text-indigo-700">
                            <svg className="h-4 w-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
                            </svg>
                            <span>
                                <strong>{pendingSundays.length}</strong> Sunday record{pendingSundays.length !== 1 ? 's' : ''} pending authorization
                            </span>
                        </div>
                        <button
                            onClick={() => setAuthorizeTarget({ records: pendingSundays, employeeId: employee.employee_id })}
                            className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-indigo-700 transition">
                            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                            </svg>
                            Authorize All Sunday Work
                        </button>
                    </div>
                )}

                {/* 3. Table */}
                <div className="overflow-auto flex-1">
                    <table className="min-w-full text-left text-sm">
                        <thead className="bg-[#1E3A8A] text-xs uppercase text-white sticky top-0 z-10">
                            <tr>
                                <th className="px-3 py-2.5 font-medium text-center">Day</th>
                                <th className="px-3 py-2.5 font-medium">Date</th>
                                <th className="px-3 py-2.5 font-medium">In AM</th>
                                <th className="px-3 py-2.5 font-medium">Out Lunch</th>
                                <th className="px-3 py-2.5 font-medium">In PM</th>
                                <th className="px-3 py-2.5 font-medium">Out PM</th>
                                <th className="px-3 py-2.5 font-medium text-center" title="Late AM minutes">Late AM</th>
                                <th className="px-3 py-2.5 font-medium text-center" title="Late PM minutes">Late PM</th>
                                <th className="px-3 py-2.5 font-medium text-center" title="Total late minutes">Total Late</th>
                                <th className="px-3 py-2.5 font-medium text-center" title="Undertime minutes">UT</th>
                                <th className="px-3 py-2.5 font-medium text-center" title="Overtime minutes">OT</th>
                                <th className="px-3 py-2.5 font-medium text-center" title="Number of missing attendance logs">Logs</th>
                                <th className="px-3 py-2.5 font-medium">Status</th>
                                <th className="px-3 py-2.5 font-medium sticky right-0 bg-[#1E3A8A]">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {records.map(r => (
                                <React.Fragment key={r.id}>
                                    <EditableRecordRow
                                        record={r}
                                        employeeCode={employee.employee_code}
                                        onSave={handleRecordSave}
                                        onViewHistory={viewHistory}
                                        historyOpen={historyRecordId === r.id}
                                        onAuthorizeSunday={recs => setAuthorizeTarget({ records: recs, employeeId: employee.employee_id })}
                                    />
                                    {historyRecordId === r.id && (
                                        <tr>
                                            <td colSpan={TOTAL_COLS} className="bg-slate-50 px-4 py-3">
                                                {loadingHistory ? (
                                                    <p className="text-xs text-slate-400">Loading history…</p>
                                                ) : history.length === 0 ? (
                                                    <p className="text-xs text-slate-400">No changes recorded for this entry.</p>
                                                ) : (
                                                    <div className="space-y-1.5">
                                                        <p className="text-xs font-semibold text-slate-600 mb-2">Change History</p>
                                                        {history.map(h => (
                                                            <div key={h.id} className="flex flex-wrap items-center gap-2 text-xs text-slate-600">
                                                                <span className="text-slate-400">{h.created_at_formatted}</span>
                                                                <span className="font-medium text-slate-700">{h.changed_by?.name ?? 'System'}</span>
                                                                <span>changed <span className="font-mono bg-slate-100 px-1 rounded">{h.field_name}</span> from <span className="text-red-600">{h.old_value ?? '—'}</span> → <span className="text-green-600">{h.new_value ?? '—'}</span></span>
                                                                {h.reason && <span className="text-slate-400 italic">"{h.reason}"</span>}
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </td>
                                        </tr>
                                    )}
                                </React.Fragment>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* 4. Footer */}
                <div className="border-t border-slate-200 px-6 py-3 flex items-center justify-between flex-shrink-0">
                    <p className="text-xs text-slate-400">{records.length} record{records.length !== 1 ? 's' : ''}</p>
                    <button onClick={onClose}
                        className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 transition">
                        Close
                    </button>
                </div>
            </div>

            {/* Sunday authorize modal */}
            {authorizeTarget && (
                <SundayAuthorizeModal
                    records={authorizeTarget.records}
                    employeeId={authorizeTarget.employeeId}
                    onClose={() => setAuthorizeTarget(null)}
                    onAuthorized={handleAuthorized}
                />
            )}
        </>
    );
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function AttendanceRecords() {
    const { flash, attendanceSummary, uploadedFiles = [], departments = [] } = usePage().props;

    const [processing, setProcessing] = useState(null);
    const [confirmDelete, setConfirmDelete] = useState(null);
    const [deleting, setDeleting] = useState(null);
    const [deleteImpact, setDeleteImpact] = useState(null); // { sourceFile, periods[] }
    const [processResults, setProcessResults] = useState({});
    const fileInputRef = useRef(null);
    const [uploading, setUploading] = useState(false);
    const [toast, setToast] = useState(null);
    const [showGapWarningModal, setShowGapWarningModal] = useState(false);
    const [gapWarningData, setGapWarningData] = useState(null);
    const [showLetterModal, setShowLetterModal] = useState(false);
    const [selectedEmployeeForLetter, setSelectedEmployeeForLetter] = useState(null);
    const [selectedEmployee, setSelectedEmployee] = useState(null);
    const [showDetailModal, setShowDetailModal] = useState(false);

    const [reviewConfirmed, setReviewConfirmed] = useState(false);
    const [activeFile, setActiveFile] = useState(uploadedFiles[0] ?? null);
    const [filters, setFilters] = useState({ search: '', department: '', dateFrom: '', dateTo: '', status: '' });

    const [payrollForm, setPayrollForm] = useState({
        department_id: departments.length === 1 ? String(departments[0].id) : '',
        start_date: uploadedFiles[0]?.date_from || '',
        end_date: uploadedFiles[0]?.date_to || '',
        payroll_date: uploadedFiles[0]?.date_to || '',
    });
    const [generatingPayroll, setGeneratingPayroll] = useState(false);
    const [generatedPeriodId, setGeneratedPeriodId] = useState(null);

    const [showBulkSundayModal, setShowBulkSundayModal] = useState(false);
    const [bulkPrintFormat, setBulkPrintFormat] = useState('pdf');
    const [bulkPaperSize, setBulkPaperSize]     = useState('A4');

    function selectFile(file) {
        setActiveFile(file);
        setReviewConfirmed(false);
        setGeneratedPeriodId(null);
        setPayrollForm(f => ({
            ...f,
            start_date: file?.date_from || '',
            end_date: file?.date_to || '',
            payroll_date: file?.date_to || '',
        }));
    }

    const hasUploaded = uploadedFiles.length > 0;
    // A file is considered processed if attendance_records already exist for its date range.
    // We check this against attendanceSummary (server data) so it survives page reloads and Back navigation.
    const activeFileProcessed = activeFile && (
        processResults[activeFile.source_file] ||
        (attendanceSummary && attendanceSummary.length > 0 && activeFile.date_from &&
            attendanceSummary.some(e => e.records?.some(r =>
                r.attendance_date >= activeFile.date_from && r.attendance_date <= activeFile.date_to
            ))
        )
    );
    const hasProcessed = !!activeFileProcessed;

    const currentStep = generatedPeriodId ? 4
        : reviewConfirmed ? 3
        : hasProcessed ? 2
        : 1;

    useEffect(() => {
        if (flash?.success && flash?.gapInfo && flash.gapInfo.has_gaps) {
            setGapWarningData(flash.gapInfo);
            setShowGapWarningModal(true);
        }
    }, [flash]);

    useEffect(() => {
        if (flash?.success) showToast('success', flash.success.message,
            flash.success.uploadResults
                ? `${flash.success.uploadResults.success} logs imported${flash.success.uploadResults.errors > 0 ? `, ${flash.success.uploadResults.errors} errors` : ''}`
                : null);
        if (flash?.errors?.file) showToast('error', flash.errors.file);
    }, [flash]);

    function showToast(type, message, detail = null) {
        setToast({ type, message, detail });
        setTimeout(() => setToast(null), type === 'error' ? 8000 : 4000);
    }

    function handleDeleteFile(sourceFile) {
        setDeleting(sourceFile);
        router.delete(route('admin.attendance.uploads.destroy', encodeURIComponent(sourceFile)), {
            onFinish: () => {
                setDeleting(null);
                setConfirmDelete(null);
                setDeleteImpact(null);
                if (activeFile?.source_file === sourceFile) setActiveFile(null);
            },
        });
    }

    async function initiateDelete(sourceFile) {
        // Check if a payroll has already been generated for this file's date range
        try {
            const res = await fetch(route('admin.attendance.uploads.impact', encodeURIComponent(sourceFile)));
            const data = await res.json();
            if (data.has_payroll) {
                setDeleteImpact({ sourceFile, periods: data.periods });
            } else {
                setConfirmDelete(sourceFile);
            }
        } catch {
            // If check fails, fall back to normal confirm
            setConfirmDelete(sourceFile);
        }
    }

    async function handleProcessFile(sourceFile) {
        setProcessing(sourceFile);
        try {
            const res = await fetch(route('admin.attendance.process-file'), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.content },
                body: JSON.stringify({ source_file: sourceFile }),
            });
            const data = await res.json();
            if (data.success) {
                setProcessResults(prev => ({ ...prev, [sourceFile]: data.message }));
                if (data.date_from && data.date_to) {
                    setPayrollForm(f => ({ ...f, start_date: data.date_from, end_date: data.date_to, payroll_date: f.payroll_date || data.date_to }));
                }
                // Ensure the processed file stays active so hasProcessed becomes true after reload
                const processedFile = uploadedFiles.find(f => f.source_file === sourceFile);
                if (processedFile) setActiveFile(processedFile);
                router.reload({ only: ['attendanceSummary', 'dateRange', 'gapInfo'] });
            } else {
                const errMsg = data.error || data.message || 'Failed to process file';
                showToast('error', 'Processing failed', errMsg);
                setProcessResults(prev => ({ ...prev, [sourceFile]: errMsg }));
            }
        } catch (err) {
            const msg = err?.message || 'Network error — check your server is running';
            showToast('error', 'Error processing file', msg);
            setProcessResults(prev => ({ ...prev, [sourceFile]: msg }));
        } finally {
            setProcessing(null);
        }
    }

    function handleFileChange(e) {
        const file = e.target.files[0];
        if (!file) return;
        if (!file.name.endsWith('.csv')) { alert('Please select a CSV file'); return; }
        const formData = new FormData();
        formData.append('file', file);
        setUploading(true);
        router.post(route('admin.attendance.store-upload'), formData, {
            onFinish: () => { setUploading(false); if (fileInputRef.current) fileInputRef.current.value = ''; },
        });
    }

    async function handleGeneratePayroll(e) {
        e.preventDefault();
        setGeneratingPayroll(true);
        try {
            const res = await fetch(route('admin.payroll.process-generation'), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Accept': 'application/json', 'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.content, 'X-Inertia': 'true' },
                body: JSON.stringify(payrollForm),
            });
            const data = await res.json();
            if (data.success) { setGeneratedPeriodId(data.period_id); showToast('success', data.message || 'Payroll generated'); }
            else showToast('error', data.message || 'Failed to generate payroll');
        } catch { showToast('error', 'Failed to generate payroll'); }
        finally { setGeneratingPayroll(false); }
    }

    // Scope summary to the active file's date range so Review only shows the current period
    const scopedSummary = (attendanceSummary && activeFile?.date_from)
        ? attendanceSummary
            .map(e => {
                const recs = e.records.filter(r =>
                    r.attendance_date >= activeFile.date_from &&
                    r.attendance_date <= activeFile.date_to
                );
                if (recs.length === 0) return null;
                return {
                    ...e,
                    records: recs,
                    total_workdays: recs.reduce((s, r) => s + (parseFloat(r.rendered) || 0), 0).toFixed(2),
                    total_absences: recs.filter(r => r.status === 'Absent').length +
                        recs.filter(r => r.status?.includes('Half Day')).length * 0.5,
                    total_late_minutes: recs.reduce((s, r) => s + (r.total_late_minutes || 0), 0),
                    total_undertime_minutes: recs.reduce((s, r) => s + (r.undertime_minutes || 0), 0),
                    total_overtime_minutes: recs.reduce((s, r) => s + (r.overtime_minutes || 0), 0),
                    total_missed_logs: recs.filter(r => r.missed_logs_count > 0 && r.status !== 'Absent').length,
                    late_frequency: recs.filter(r => r.total_late_minutes > 0).length,
                };
            })
            .filter(Boolean)
        : (attendanceSummary ?? []);

    const deptOptions = scopedSummary.length > 0
        ? [...new Set(scopedSummary.map(e => e.department))].sort()
        : [];

    const employeesWithIssues = scopedSummary.filter(e =>
        e.total_missed_logs > 0 || e.total_late_minutes > 0 || e.total_absences > 0
    );

    const baseList = scopedSummary;
    const reviewList = baseList.filter(e => {
        if (filters.search) {
            const s = filters.search.toLowerCase();
            if (!e.employee_name.toLowerCase().includes(s) && !e.employee_code.toLowerCase().includes(s)) return false;
        }
        if (filters.department && e.department !== filters.department) return false;
        if (filters.dateFrom || filters.dateTo) {
            const inRange = e.records.some(r => {
                const d = new Date(r.attendance_date);
                if (filters.dateFrom && d < new Date(filters.dateFrom)) return false;
                if (filters.dateTo && d > new Date(filters.dateTo)) return false;
                return true;
            });
            if (!inRange) return false;
        }
        if (filters.status) {
            const hasStatus = e.records.some(r => (r.status || '').toLowerCase().includes(filters.status.toLowerCase()));
            if (!hasStatus) return false;
        }
        return true;
    });

    function getRowColorClass(emp) {
        if (emp.total_missed_logs > 0) return 'bg-red-50 hover:bg-red-100';
        if (emp.late_frequency > 0 || emp.total_late_minutes > 0) return 'bg-orange-50 hover:bg-orange-100';
        return 'hover:bg-slate-50';
    }

    function viewDetails(emp) { setSelectedEmployee(emp); setShowDetailModal(true); }
    function clearFilters() { setFilters({ search: '', department: '', dateFrom: '', dateTo: '', status: '' }); }

    // ── Spinner SVG ──────────────────────────────────────────────────────────
    const Spinner = ({ cls = 'h-4 w-4' }) => (
        <svg className={`${cls} animate-spin`} fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
        </svg>
    );

    return (
        <AdminLayout title="Attendance Records">
            <Head title="Attendance Records" />
            <input ref={fileInputRef} type="file" accept=".csv" onChange={handleFileChange} className="hidden" />

            {/* Toast */}
            {toast && (
                <div className={`fixed top-5 right-5 z-50 flex items-start gap-3 rounded-xl shadow-xl px-4 py-3 text-sm max-w-sm ${toast.type === 'success' ? 'bg-green-600 text-white' : 'bg-red-600 text-white'}`}>
                    <div className="flex-shrink-0 mt-0.5">
                        {toast.type === 'success'
                            ? <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                            : <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>}
                    </div>
                    <div><p className="font-medium">{toast.message}</p>{toast.detail && <p className="mt-0.5 text-xs opacity-90">{toast.detail}</p>}</div>
                    <button onClick={() => setToast(null)} className="ml-2 flex-shrink-0 opacity-75 hover:opacity-100">
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                </div>
            )}

            <StepIndicator currentStep={currentStep} />

            {/* ── STEP 1: Files ── */}
            {currentStep === 1 && (
                <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
                    {/* Header */}
                    <div className="border-b border-slate-100 px-5 py-3.5 flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#1E3A8A] text-xs font-bold text-white">1</span>
                            <h3 className="text-sm font-semibold text-slate-800">File Management</h3>
                            {uploadedFiles.length > 0 && (
                                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-500">
                                    {uploadedFiles.length} file{uploadedFiles.length !== 1 ? 's' : ''}
                                </span>
                            )}
                        </div>
                        <button onClick={() => fileInputRef.current?.click()} disabled={uploading}
                            className="inline-flex items-center gap-1.5 rounded-lg bg-[#1E3A8A] px-3 py-1.5 text-xs font-medium text-white hover:bg-[#1E3A8A]/90 disabled:opacity-50 transition shadow-sm">
                            {uploading
                                ? <><Spinner cls="h-3.5 w-3.5" />Uploading…</>
                                : <><svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"/></svg>Upload CSV</>}
                        </button>
                    </div>

                    {/* Upload drop zone — shown when no files yet */}
                    {uploadedFiles.length === 0 && (
                        <div className="flex flex-col items-center justify-center py-20 px-8 text-center">
                            <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100">
                                <svg className="h-8 w-8 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"/></svg>
                            </div>
                            <p className="mb-1 text-sm font-semibold text-slate-700">No files uploaded yet</p>
                            <p className="mb-7 text-xs text-slate-400">Upload a CSV file containing raw biometric attendance logs</p>
                            <button onClick={() => fileInputRef.current?.click()} disabled={uploading}
                                className="inline-flex items-center gap-2 rounded-lg bg-[#1E3A8A] px-6 py-2.5 text-sm font-medium text-white hover:bg-[#1E3A8A]/90 disabled:opacity-50 transition shadow-sm">
                                {uploading
                                    ? <><Spinner cls="h-4 w-4" />Uploading…</>
                                    : <><svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"/></svg>Choose CSV File</>}
                            </button>
                        </div>
                    )}

                    {/* File list */}
                    {uploadedFiles.length > 0 && (
                        <div className="divide-y divide-slate-100">
                            {uploadedFiles.map(f => {
                                const isActive = activeFile?.source_file === f.source_file;
                                const isProcessing = processing === f.source_file;
                                const isDeleting = deleting === f.source_file;
                                const isDone = !!processResults[f.source_file] || (
                                    attendanceSummary && attendanceSummary.length > 0 && f.date_from &&
                                    attendanceSummary.some(e => e.records?.some(r =>
                                        r.attendance_date >= f.date_from && r.attendance_date <= f.date_to
                                    ))
                                );
                                const confirmingDelete = confirmDelete === f.source_file;

                                return (
                                    <div key={f.source_file}
                                        onClick={() => !confirmingDelete && selectFile(f)}
                                        className={`flex items-center gap-4 px-5 py-4 cursor-pointer transition-colors ${isActive ? 'bg-blue-50 border-l-[3px] border-[#1E3A8A]' : 'hover:bg-slate-50 border-l-[3px] border-transparent'}`}>

                                        {/* Status icon */}
                                        <div className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl ${isDone ? 'bg-green-100' : isActive ? 'bg-[#1E3A8A]/10' : 'bg-slate-100'}`}>
                                            {isProcessing
                                                ? <Spinner cls={`h-4 w-4 ${isActive ? 'text-[#1E3A8A]' : 'text-slate-400'}`} />
                                                : isDone
                                                    ? <svg className="h-5 w-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/></svg>
                                                    : <svg className="h-5 w-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>}
                                        </div>

                                        {/* File info */}
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2">
                                                <p className={`truncate text-sm font-medium ${isActive ? 'text-[#1E3A8A]' : 'text-slate-800'}`}>{f.source_file}</p>
                                                {isDone && <span className="flex-shrink-0 rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">Processed</span>}
                                                {!isDone && !isProcessing && <span className="flex-shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-500">Pending</span>}
                                                {isProcessing && <span className="flex-shrink-0 rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700">Processing…</span>}
                                            </div>
                                            <p className="mt-0.5 text-xs text-slate-400">
                                                {f.log_count.toLocaleString()} logs
                                                {f.date_from ? ` · ${f.date_from} → ${f.date_to}` : ''}
                                            </p>
                                            {isDone && <p className="mt-0.5 text-xs text-green-600">{processResults[f.source_file] || 'Ready for review — click to proceed'}</p>}
                                            {!isDone && !isProcessing && <p className="mt-0.5 text-xs text-slate-400">Select and click Process to generate attendance records</p>}
                                        </div>

                                        {/* Actions */}
                                        <div className="flex items-center gap-2 flex-shrink-0" onClick={e => e.stopPropagation()}>
                                            {confirmingDelete ? (
                                                <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2">
                                                    <svg className="h-4 w-4 text-red-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>
                                                    <span className="text-xs font-medium text-red-700">Delete this file?</span>
                                                    <button onClick={() => handleDeleteFile(f.source_file)} disabled={isDeleting}
                                                        className="rounded-md bg-red-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-red-700 disabled:opacity-50 transition">
                                                        {isDeleting ? <Spinner cls="h-3 w-3" /> : 'Yes, delete'}
                                                    </button>
                                                    <button onClick={() => setConfirmDelete(null)}
                                                        className="rounded-md border border-slate-300 bg-white px-2.5 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50 transition">
                                                        Cancel
                                                    </button>
                                                </div>
                                            ) : (
                                                <div className="flex items-center gap-1.5">
                                                    {!isProcessing && (
                                                        <button onClick={() => handleProcessFile(f.source_file)} disabled={!!processing}
                                                            className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition disabled:opacity-50 ${isDone ? 'border border-slate-300 bg-white text-slate-600 hover:bg-slate-50' : 'bg-[#1E3A8A] text-white hover:bg-[#1E3A8A]/90 shadow-sm'}`}>
                                                            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"/><path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                                                            {isDone ? 'Re-process' : 'Process'}
                                                        </button>
                                                    )}
                                                    <button onClick={() => initiateDelete(f.source_file)}
                                                        className="rounded-lg border border-slate-200 bg-white p-1.5 text-slate-400 hover:border-red-200 hover:bg-red-50 hover:text-red-500 transition" title="Delete file">
                                                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            )}

            {/* ── STEP 2: Review ── */}
            {currentStep === 2 && (
                <div>
                    {/* Toolbar */}
                    <div className="mb-4 rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
                        {/* Top bar */}
                        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100">
                            <div className="flex items-center gap-3">
                                <button onClick={() => setActiveFile(null)}
                                    className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 transition">
                                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7"/></svg>
                                    Back
                                </button>
                                <div className="flex items-center gap-2">
                                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#1E3A8A] text-xs font-bold text-white">2</span>
                                    <h3 className="text-sm font-semibold text-slate-800">Review Attendance Data</h3>
                                    {activeFile && <span className="text-xs text-slate-400">{activeFile.source_file}</span>}
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <button onClick={clearFilters} className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-500 hover:bg-slate-50 transition">
                                    Clear Filters
                                </button>
                                {/* Bulk Sunday authorization — shown when there are pending Sunday records */}
                                {scopedSummary.some(e => e.records?.some(r => {
                                    const s = (r.status || '').toLowerCase();
                                    return isSunday(r.attendance_date) && (r.time_in_am || r.time_in_pm) && s.includes('unauthorized');
                                })) && (
                                    <button onClick={() => setShowBulkSundayModal(true)}
                                        className="inline-flex items-center gap-1.5 rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-1.5 text-xs font-medium text-indigo-700 hover:bg-indigo-100 transition">
                                        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                                        Authorize Sunday Logs
                                    </button>
                                )}
                                <button onClick={() => setReviewConfirmed(true)}
                                    className="inline-flex items-center gap-1.5 rounded-lg bg-[#1E3A8A] px-4 py-1.5 text-xs font-medium text-white hover:bg-[#1E3A8A]/90 transition shadow-sm">
                                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/></svg>
                                    Mark as Reviewed
                                </button>
                            </div>
                        </div>

                        {/* Filters */}
                        <div className="px-5 py-3.5 flex items-end gap-3">
                            <div className="flex-1">
                                <label className="mb-1 block text-xs font-medium text-slate-500">Search Employee</label>
                                <input type="text" placeholder="Name or Code" value={filters.search}
                                    onChange={e => setFilters(f => ({ ...f, search: e.target.value }))}
                                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-[#1E3A8A] focus:outline-none focus:ring-1 focus:ring-[#1E3A8A]" />
                            </div>
                            <div className="flex-1">
                                <label className="mb-1 block text-xs font-medium text-slate-500">Department</label>
                                <select value={filters.department} onChange={e => setFilters(f => ({ ...f, department: e.target.value }))}
                                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-[#1E3A8A] focus:outline-none focus:ring-1 focus:ring-[#1E3A8A]">
                                    <option value="">All Departments</option>
                                    {deptOptions.map(d => <option key={d} value={d}>{d}</option>)}
                                </select>
                            </div>
                            <div className="flex-1">
                                <label className="mb-1 block text-xs font-medium text-slate-500">Status</label>
                                <select value={filters.status} onChange={e => setFilters(f => ({ ...f, status: e.target.value }))}
                                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-[#1E3A8A] focus:outline-none focus:ring-1 focus:ring-[#1E3A8A]">
                                    <option value="">All Statuses</option>
                                    <option value="Present">Present</option>
                                    <option value="Absent">Absent</option>
                                    <option value="Late">Late</option>
                                    <option value="Undertime">Undertime</option>
                                    <option value="Missed Log">Missed Log</option>
                                    <option value="Half Day">Half Day</option>
                                    <option value="No Work">No Work</option>
                                    <option value="Sunday Work">Sunday Work</option>
                                    <option value="Unauthorized Work">Unauthorized Work</option>
                                    <option value="Holiday">Holiday</option>
                                    <option value="Holiday Work">Holiday Work</option>
                                </select>
                            </div>
                            <div className="flex-1">
                                <label className="mb-1 block text-xs font-medium text-slate-500">Date From</label>
                                <input type="date" value={filters.dateFrom} onChange={e => setFilters(f => ({ ...f, dateFrom: e.target.value }))}
                                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-[#1E3A8A] focus:outline-none focus:ring-1 focus:ring-[#1E3A8A]" />
                            </div>
                            <div className="flex-1">
                                <label className="mb-1 block text-xs font-medium text-slate-500">Date To</label>
                                <input type="date" value={filters.dateTo} onChange={e => setFilters(f => ({ ...f, dateTo: e.target.value }))}
                                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-[#1E3A8A] focus:outline-none focus:ring-1 focus:ring-[#1E3A8A]" />
                            </div>
                        </div>

                        {/* Stats + toggle */}
                        <div className="flex items-center justify-between px-5 py-2.5 bg-slate-50 border-t border-slate-100">
                            <div className="flex items-center gap-4 text-xs text-slate-500">
                                <span>Showing <span className="font-medium text-slate-700">{reviewList.length}</span> of <span className="font-medium text-slate-700">{scopedSummary.length}</span> employees</span>
                                {employeesWithIssues.length > 0 && (
                                    <span className="text-amber-600"><span className="font-medium">{employeesWithIssues.length}</span> with issues</span>
                                )}
                            </div>
                                <div className="flex items-center gap-3">
                                {/* Export to Excel */}
                                {reviewList.length > 0 && (
                                    <button
                                        onClick={() => {
                                            const dateLabel = activeFile?.date_from && activeFile?.date_to
                                                ? `${activeFile.date_from}_${activeFile.date_to}`
                                                : new Date().toISOString().slice(0, 10);

                                            // Sort by department then employee name alphabetically
                                            const sorted = [...reviewList].sort((a, b) => {
                                                const deptCmp = (a.department ?? '').localeCompare(b.department ?? '');
                                                if (deptCmp !== 0) return deptCmp;
                                                return (a.employee_name ?? '').localeCompare(b.employee_name ?? '');
                                            });

                                            const headers = ['Department', 'Employee Name', 'Employee Code', 'Days Worked', 'Absences', 'Late (HH:MM)', 'Undertime (HH:MM)', 'Overtime (HH:MM)', 'Missing Logs'];
                                            const rows = sorted.map(emp => [
                                                emp.department,
                                                emp.employee_name,
                                                emp.employee_code,
                                                emp.total_workdays,
                                                emp.total_absences,
                                                fmtTime(emp.total_late_minutes),
                                                fmtTime(emp.total_undertime_minutes),
                                                fmtTime(emp.total_overtime_minutes),
                                                emp.total_missed_logs,
                                            ]);

                                            const csv = [headers, ...rows]
                                                .map(r => r.map(v => `"${String(v ?? '').replace(/"/g, '""')}"`).join(','))
                                                .join('\r\n');

                                            const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
                                            const url  = URL.createObjectURL(blob);
                                            const a    = document.createElement('a');
                                            a.href = url;
                                            a.download = `Attendance_Summary_${dateLabel}.csv`;
                                            a.click();
                                            URL.revokeObjectURL(url);
                                        }}
                                        className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 shadow-sm transition hover:border-green-500 hover:text-green-700 hover:bg-green-50"
                                        title="Export summary to Excel"
                                    >
                                        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3M3 17V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
                                        </svg>
                                        Export Excel
                                    </button>
                                )}
                                {/* Print Letters — operates on the current filtered list */}
                                {reviewList.length > 0 && (
                                    <div className="flex items-center gap-1.5">
                                        <select
                                            value={bulkPrintFormat}
                                            onChange={e => setBulkPrintFormat(e.target.value)}
                                            className="rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-xs font-medium text-slate-600 focus:outline-none focus:border-[#1E3A8A]"
                                        >
                                            <option value="pdf">PDF</option>
                                            <option value="word">Word (.doc)</option>
                                        </select>
                                        {bulkPrintFormat === 'pdf' && (
                                            <select
                                                value={bulkPaperSize}
                                                onChange={e => setBulkPaperSize(e.target.value)}
                                                className="rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-xs font-medium text-slate-600 focus:outline-none focus:border-[#1E3A8A]"
                                            >
                                                <option value="A4">A4</option>
                                                <option value="legal">Legal (8.5×13")</option>
                                                <option value="letter">Letter (8.5×11")</option>
                                            </select>
                                        )}
                                        <button
                                            onClick={() => {
                                                const empIds = reviewList.map(e => e.employee_id);

                                                if (bulkPrintFormat === 'word') {
                                                    // Word: fetch data for each employee then generate client-side
                                                    // For bulk, open PDF in new tab with word hint — server handles it
                                                    // We reuse the PDF endpoint but trigger as download
                                                }

                                                const form = document.createElement('form');
                                                form.method = 'POST';
                                                form.action = route('admin.violations.download-letters-bulk');
                                                form.target = '_blank';
                                                const csrf = document.createElement('input');
                                                csrf.type = 'hidden'; csrf.name = '_token';
                                                csrf.value = document.querySelector('meta[name="csrf-token"]')?.content || '';
                                                form.appendChild(csrf);
                                                empIds.forEach(id => {
                                                    const inp = document.createElement('input');
                                                    inp.type = 'hidden'; inp.name = 'employee_ids[]'; inp.value = id;
                                                    form.appendChild(inp);
                                                });
                                                if (activeFile?.date_from) {
                                                    const df = document.createElement('input');
                                                    df.type = 'hidden'; df.name = 'dateFrom'; df.value = activeFile.date_from;
                                                    form.appendChild(df);
                                                }
                                                if (activeFile?.date_to) {
                                                    const dt = document.createElement('input');
                                                    dt.type = 'hidden'; dt.name = 'dateTo'; dt.value = activeFile.date_to;
                                                    form.appendChild(dt);
                                                }
                                                if (bulkPrintFormat === 'pdf') {
                                                    const pv = document.createElement('input');
                                                    pv.type = 'hidden'; pv.name = 'preview'; pv.value = '1';
                                                    form.appendChild(pv);
                                                    const ps = document.createElement('input');
                                                    ps.type = 'hidden'; ps.name = 'paper_size'; ps.value = bulkPaperSize;
                                                    form.appendChild(ps);
                                                } else {
                                                    const fmt = document.createElement('input');
                                                    fmt.type = 'hidden'; fmt.name = 'format'; fmt.value = 'word';
                                                    form.appendChild(fmt);
                                                }
                                                document.body.appendChild(form);
                                                form.submit();
                                                document.body.removeChild(form);
                                            }}
                                            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 shadow-sm transition hover:border-[#1E3A8A] hover:text-[#1E3A8A] hover:bg-blue-50"
                                            title={`${bulkPrintFormat === 'word' ? 'Download Word' : 'Preview PDF'} violation letters for ${reviewList.length} filtered employee${reviewList.length !== 1 ? 's' : ''}`}
                                        >
                                            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                            </svg>
                                            {bulkPrintFormat === 'word' ? 'Download Word' : `Print (${reviewList.length})`}
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Re-process notice */}
                    <div className="mb-3 flex items-start gap-2.5 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-800">
                        <svg className="h-4 w-4 flex-shrink-0 mt-0.5 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                        <span>If you changed <strong>Late Tolerance</strong> or <strong>Early Out Tolerance</strong> settings after processing this file, go back and click <strong>Re-process</strong> to apply the new settings to these records.</span>
                    </div>

                    {/* Employee table */}
                    {reviewList.length === 0 ? (
                        <div className="rounded-xl border border-slate-200 bg-white py-16 text-center">
                            <svg className="mx-auto h-8 w-8 text-slate-300 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                            <p className="text-sm text-slate-400">No employees found.</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm" style={{ maxHeight: '460px', overflowY: 'auto' }}>
                            <table className="min-w-full text-left text-sm">
                                <thead className="sticky top-0 bg-[#1E3A8A] text-xs uppercase text-white z-10">
                                    <tr>
                                        <th className="px-4 py-3 font-medium">Employee</th>
                                        <th className="px-4 py-3 font-medium">Department</th>
                                        <th className="px-4 py-3 font-medium text-center">Days</th>
                                        <th className="px-4 py-3 font-medium text-center">Absent</th>
                                        <th className="px-4 py-3 font-medium text-center">Late</th>
                                        <th className="px-4 py-3 font-medium text-center">UT</th>
                                        <th className="px-4 py-3 font-medium text-center">OT</th>
                                        <th className="px-4 py-3 font-medium text-center">Logs</th>
                                        <th className="px-4 py-3 font-medium text-center">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {reviewList.map(emp => (
                                        <tr key={emp.employee_id} className={`${getRowColorClass(emp)} cursor-pointer transition-colors`} onClick={() => viewDetails(emp)}>
                                            <td className="whitespace-nowrap px-4 py-3">
                                                <div className="font-medium text-slate-900">{emp.employee_name}</div>
                                                <div className="text-xs text-slate-400">{emp.employee_code}</div>
                                            </td>
                                            <td className="whitespace-nowrap px-4 py-3 text-slate-600">{emp.department}</td>
                                            <td className="whitespace-nowrap px-4 py-3 text-center font-medium text-slate-700">{emp.total_workdays}</td>
                                            <td className="whitespace-nowrap px-4 py-3 text-center">
                                                <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${emp.total_absences > 0 ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>{emp.total_absences}</span>
                                            </td>
                                            <td className="whitespace-nowrap px-4 py-3 text-center">
                                                <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${emp.total_late_minutes > 0 ? 'bg-yellow-100 text-yellow-700' : 'bg-slate-100 text-slate-500'}`}>{fmtTime(emp.total_late_minutes)}</span>
                                            </td>
                                            <td className="whitespace-nowrap px-4 py-3 text-center text-slate-600 text-xs">{fmtTime(emp.total_undertime_minutes)}</td>
                                            <td className="whitespace-nowrap px-4 py-3 text-center text-slate-600 text-xs">{fmtTime(emp.total_overtime_minutes)}</td>
                                            <td className="whitespace-nowrap px-4 py-3 text-center">
                                                <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${emp.total_missed_logs > 0 ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>{emp.total_missed_logs}</span>
                                            </td>
                                            <td className="whitespace-nowrap px-4 py-3 text-center" onClick={e => e.stopPropagation()}>
                                                <div className="flex items-center justify-center gap-1.5">
                                                    <button onClick={() => viewDetails(emp)}
                                                        className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-600 hover:border-[#1E3A8A] hover:text-[#1E3A8A] hover:bg-blue-50 transition">
                                                        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg>
                                                        View
                                                    </button>
                                                    <button onClick={() => { setSelectedEmployeeForLetter(emp.employee_id); setShowLetterModal(true); }}
                                                        className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-600 hover:border-green-400 hover:text-green-700 hover:bg-green-50 transition">
                                                        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
                                                        Letter
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}

            {/* ── STEP 3: Generate Payroll ── */}
            {currentStep === 3 && (
                <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
                    <div className="border-b border-slate-100 px-5 py-3.5 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <button onClick={() => setReviewConfirmed(false)}
                                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 transition">
                                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7"/></svg>
                                Back to Review
                            </button>
                            <div className="flex items-center gap-2">
                                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#1E3A8A] text-xs font-bold text-white">4</span>
                                <h3 className="text-sm font-semibold text-slate-800">Generate Payroll</h3>
                            </div>
                        </div>
                        {activeFile && (
                            <span className="text-xs text-slate-400">{activeFile.source_file}{activeFile.date_from ? ` · ${activeFile.date_from} → ${activeFile.date_to}` : ''}</span>
                        )}
                    </div>
                    <form onSubmit={handleGeneratePayroll} className="p-5">
                        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                            <div>
                                <label className="mb-1 block text-xs font-medium text-slate-500">Department</label>
                                <select required value={payrollForm.department_id} onChange={e => setPayrollForm(f => ({ ...f, department_id: e.target.value }))}
                                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-[#1E3A8A] focus:outline-none focus:ring-1 focus:ring-[#1E3A8A]">
                                    <option value="">Select Department</option>
                                    {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="mb-1 block text-xs font-medium text-slate-500">Start Date</label>
                                <input type="date" required value={payrollForm.start_date} onChange={e => setPayrollForm(f => ({ ...f, start_date: e.target.value }))}
                                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-[#1E3A8A] focus:outline-none focus:ring-1 focus:ring-[#1E3A8A]" />
                            </div>
                            <div>
                                <label className="mb-1 block text-xs font-medium text-slate-500">End Date</label>
                                <input type="date" required value={payrollForm.end_date} onChange={e => setPayrollForm(f => ({ ...f, end_date: e.target.value }))}
                                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-[#1E3A8A] focus:outline-none focus:ring-1 focus:ring-[#1E3A8A]" />
                            </div>
                            <div>
                                <label className="mb-1 block text-xs font-medium text-slate-500">Payroll Date</label>
                                <input type="date" required value={payrollForm.payroll_date} onChange={e => setPayrollForm(f => ({ ...f, payroll_date: e.target.value }))}
                                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-[#1E3A8A] focus:outline-none focus:ring-1 focus:ring-[#1E3A8A]" />
                            </div>
                        </div>
                        <div className="mt-5 flex items-center justify-end border-t border-slate-100 pt-4">
                            <button type="submit" disabled={generatingPayroll}
                                className="inline-flex items-center gap-2 rounded-lg bg-[#1E3A8A] px-5 py-2.5 text-sm font-medium text-white hover:bg-[#1E3A8A]/90 disabled:opacity-50 transition shadow-sm">
                                {generatingPayroll
                                    ? <><Spinner cls="h-4 w-4" />Generating…</>
                                    : <><svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z"/></svg>Generate Payroll</>}
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {/* ── STEP 4: Payslip ── */}
            {currentStep === 4 && (
                <div className="rounded-xl border border-green-200 bg-green-50 shadow-sm overflow-hidden">
                    <div className="flex items-center justify-between px-5 py-4">
                        <div className="flex items-center gap-4">
                            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-green-500">
                                <svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/></svg>
                            </div>
                            <div>
                                <p className="text-sm font-semibold text-green-900">Payroll Generated Successfully</p>
                                <p className="text-xs text-green-600 mt-0.5">Review payslips and finalize the payroll period.</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <button onClick={() => setGeneratedPeriodId(null)}
                                className="inline-flex items-center gap-1.5 rounded-lg border border-green-300 bg-white px-3 py-1.5 text-xs font-medium text-green-700 hover:bg-green-50 transition">
                                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7"/></svg>
                                Back
                            </button>
                            <a href={generatedPeriodId > 0 ? route('admin.payroll.period', generatedPeriodId) : route('admin.payroll.index')}
                                className="inline-flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 transition shadow-sm">
                                View Payslips
                                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7"/></svg>
                            </a>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Detail Modal ── */}
            {showDetailModal && selectedEmployee && (
                <DetailModal
                    employee={selectedEmployee}
                    onClose={() => { setShowDetailModal(false); setSelectedEmployee(null); }}
                    onRecordSave={() => router.reload({ only: ['attendanceSummary'] })}
                />
            )}

            {/* ── Payroll Impact Warning Modal ── */}
            {deleteImpact && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                    <div className="w-full max-w-md rounded-xl bg-white shadow-2xl overflow-hidden">
                        <div className="border-b border-amber-200 bg-amber-50 px-6 py-4 flex items-center gap-3">
                            <svg className="h-5 w-5 text-amber-600 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>
                            <div>
                                <h2 className="text-sm font-semibold text-amber-900">Payroll Already Generated</h2>
                                <p className="text-xs text-amber-700 mt-0.5">A payroll period overlaps with this file's date range</p>
                            </div>
                        </div>
                        <div className="px-6 py-4">
                            <p className="text-sm text-slate-700 mb-3">
                                Deleting this file will remove the attendance records, but the generated payroll will <span className="font-semibold">not</span> be affected.
                            </p>
                            <div className="space-y-2">
                                {deleteImpact.periods.map(p => (
                                    <div key={p.id} className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs">
                                        <span className="font-medium text-slate-700">{p.department}</span>
                                        <span className="text-slate-500">{p.start_date} → {p.end_date}</span>
                                        <span className={`rounded-full px-2 py-0.5 font-medium ${p.status === 'CLOSED' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>{p.status}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                        <div className="border-t border-slate-200 px-6 py-4 flex justify-end gap-2">
                            <button onClick={() => setDeleteImpact(null)}
                                className="rounded-lg border border-slate-300 px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-50 transition">
                                Cancel
                            </button>
                            <button onClick={() => { setDeleteImpact(null); setConfirmDelete(deleteImpact.sourceFile); }}
                                className="rounded-lg bg-red-600 px-4 py-2 text-xs font-medium text-white hover:bg-red-700 transition">
                                Delete Anyway
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Gap Warning Modal ── */}
            {showGapWarningModal && gapWarningData && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                    <div className="w-full max-w-lg rounded-xl bg-white shadow-2xl overflow-hidden">
                        <div className="border-b border-yellow-200 bg-yellow-50 px-6 py-4 flex items-center gap-3">
                            <svg className="h-5 w-5 text-yellow-600 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>
                            <div>
                                <h2 className="text-sm font-semibold text-yellow-900">Date Gaps Detected</h2>
                                <p className="text-xs text-yellow-700">CSV uploaded but gaps remain in attendance data</p>
                            </div>
                        </div>
                        <div className="max-h-64 overflow-y-auto px-6 py-4 space-y-2">
                            {gapWarningData.gaps.map((gap, idx) => (
                                <div key={idx} className="flex items-center justify-between rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-sm">
                                    <span className="text-slate-700">{gap.start_formatted} – {gap.end_formatted}</span>
                                    <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">{gap.days} days missing</span>
                                </div>
                            ))}
                        </div>
                        <div className="border-t border-slate-200 px-6 py-4 flex justify-end">
                            <button onClick={() => setShowGapWarningModal(false)}
                                className="rounded-lg bg-yellow-600 px-4 py-2 text-sm font-medium text-white hover:bg-yellow-700 transition">
                                I Understand
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <ViolationLetterModal
                isOpen={showLetterModal}
                onClose={() => { setShowLetterModal(false); setSelectedEmployeeForLetter(null); }}
                employeeId={selectedEmployeeForLetter}
                dateFilters={{
                    dateFrom: activeFile?.date_from || filters.dateFrom || '',
                    dateTo:   activeFile?.date_to   || filters.dateTo   || '',
                }}
            />

            {/* Bulk Sunday authorization modal — main page scope */}
            {showBulkSundayModal && (() => {
                // Collect eligible records, attaching employee_id from the parent summary
                const eligibleRecords = scopedSummary.flatMap(e =>
                    (e.records ?? [])
                        .filter(r => {
                            const s = (r.status || '').toLowerCase();
                            return isSunday(r.attendance_date) && (r.time_in_am || r.time_in_pm) && s.includes('unauthorized');
                        })
                        .map(r => ({ ...r, employee_id: Number(e.employee_id) }))
                );
                return (
                    <SundayAuthorizeModal
                        records={eligibleRecords}
                        employeeId={null}
                        onClose={() => setShowBulkSundayModal(false)}
                        onAuthorized={() => {
                            setShowBulkSundayModal(false);
                            router.reload({ only: ['attendanceSummary'] });
                        }}
                        isBulkMainPage
                    />
                );
            })()}
        </AdminLayout>
    );
}
