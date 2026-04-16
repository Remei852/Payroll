import { useState, useRef } from 'react';
import AdminLayout from '@/Layouts/AdminLayout';
import { Head, router } from '@inertiajs/react';
import ViolationLetterModal from '@/Components/ViolationLetterModal';

function fmtTime(min) {
    if (!min) return '00:00';
    const h = Math.floor(Math.abs(min) / 60);
    const m = Math.abs(min) % 60;
    return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}`;
}

function fmtDate(d, opts) {
    if (!d) return '—';
    return new Date(d + 'T00:00:00').toLocaleDateString('en-US', opts || {
        weekday: 'short', month: 'short', day: 'numeric', year: 'numeric',
    });
}

function Chevron({ open }) {
    return (
        <svg className={`h-4 w-4 transition-transform duration-200 ${open ? 'rotate-90' : ''}`}
            fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
        </svg>
    );
}

function SummaryCard({ label, value, sub, icon, color }) {
    const palette = {
        blue:   { card: 'bg-blue-50 border-blue-200',     val: 'text-blue-700',   icon: 'bg-blue-100 text-blue-600' },
        red:    { card: 'bg-red-50 border-red-200',       val: 'text-red-700',    icon: 'bg-red-100 text-red-600' },
        yellow: { card: 'bg-yellow-50 border-yellow-200', val: 'text-yellow-700', icon: 'bg-yellow-100 text-yellow-600' },
        orange: { card: 'bg-orange-50 border-orange-200', val: 'text-orange-700', icon: 'bg-orange-100 text-orange-600' },
    };
    const p = palette[color] || palette.blue;
    return (
        <div className={`rounded-xl border px-5 py-4 flex items-center gap-4 ${p.card}`}>
            <div className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg ${p.icon}`}>{icon}</div>
            <div>
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">{label}</p>
                <p className={`mt-0.5 text-2xl font-bold leading-none ${p.val}`}>{value}</p>
                {sub && <p className="mt-0.5 text-[11px] text-slate-400">{sub}</p>}
            </div>
        </div>
    );
}

function LogChip({ log, index }) {
    const isIn = log.type === 'IN';
    return (
        <div className={`flex flex-col items-center rounded-lg border px-3 py-2 min-w-[64px] ${isIn ? 'border-green-200 bg-green-50' : 'border-rose-200 bg-rose-50'}`}>
            <span className={`text-[9px] font-bold uppercase tracking-widest ${isIn ? 'text-green-600' : 'text-rose-600'}`}>{log.type}</span>
            <span className="font-mono text-xs font-semibold text-slate-800 mt-0.5">{log.time}</span>
            <span className="text-[9px] text-slate-400 mt-0.5">#{index + 1}</span>
        </div>
    );
}

function PrintModal({ isOpen, onClose, scope, employeeIds, filters }) {
    if (!isOpen) return null;
    const isFiltered = scope === 'filtered';
    const count = employeeIds.length;
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const handlePrint = async () => {
        setLoading(true);
        setError(null);

        const url = isFiltered
            ? route('admin.violations.download-letters-bulk-filtered')
            : route('admin.violations.download-letters-bulk');

        const body = new URLSearchParams();
        body.append('_token', document.querySelector('meta[name="csrf-token"]')?.content || '');
        body.append('preview', '1');
        body.append('markSent', '0');

        if (isFiltered) {
            if (filters.search)        body.append('employee_name', filters.search);
            if (filters.department_id) body.append('department_id', filters.department_id);
            if (filters.start_date)    body.append('start_date', filters.start_date);
            if (filters.end_date)      body.append('end_date', filters.end_date);
        } else {
            employeeIds.forEach(id => body.append('employee_ids[]', id));
            if (filters.start_date) body.append('dateFrom', filters.start_date);
            if (filters.end_date)   body.append('dateTo', filters.end_date);
        }

        // Open the window immediately (synchronous, inside click handler) to avoid popup blockers
        const newTab = window.open('', '_blank');
        if (newTab) {
            newTab.document.write('<html><body style="margin:0;display:flex;align-items:center;justify-content:center;height:100vh;font-family:sans-serif;color:#64748b;font-size:14px;">Generating PDF…</body></html>');
        }

        try {
            const res = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: body.toString(),
            });

            if (!res.ok) {
                const text = await res.text();
                if (newTab) newTab.close();
                throw new Error(`Server error ${res.status}: ${text.slice(0, 300)}`);
            }

            const blob = await res.blob();
            const objectUrl = URL.createObjectURL(blob);

            if (newTab) {
                newTab.location.href = objectUrl;
            } else {
                // Fallback if popup was blocked
                const a = document.createElement('a');
                a.href = objectUrl;
                a.target = '_blank';
                a.click();
            }

            setTimeout(() => URL.revokeObjectURL(objectUrl), 10000);
            onClose();
        } catch (err) {
            if (newTab) newTab.close();
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };
    return (
        <>
            <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm" onClick={onClose} />
            <div className="fixed left-1/2 top-1/2 z-[60] w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-slate-200 bg-white shadow-2xl">
                <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
                    <div>
                        <h3 className="text-sm font-semibold text-slate-900">Print Violation Letters</h3>
                        <p className="mt-0.5 text-xs text-slate-400">Opens PDF in a new tab</p>
                    </div>
                    <button onClick={onClose} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 transition">
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>
                    </button>
                </div>
                <div className="p-6 space-y-4">
                    <div className="rounded-xl bg-[#1E3A8A]/5 border border-[#1E3A8A]/15 px-4 py-3">
                        <p className="text-[10px] font-semibold text-[#1E3A8A] uppercase tracking-wider mb-1">Scope</p>
                        <p className="text-sm font-medium text-slate-900">
                            {isFiltered ? 'All employees matching current filters' : `${count} selected employee${count !== 1 ? 's' : ''}`}
                        </p>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        {[['Period From', filters.start_date], ['Period To', filters.end_date]].map(([label, val]) => (
                            <div key={label} className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5">
                                <p className="text-[10px] text-slate-400 mb-0.5">{label}</p>
                                <p className="text-sm font-medium text-slate-900">{fmtDate(val, { month: 'long', day: 'numeric', year: 'numeric' })}</p>
                            </div>
                        ))}
                    </div>
                    {(!filters.start_date || !filters.end_date) && (
                        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-800">
                            No date range set — letters will cover all available records. Set Start/End Date to restrict the period.
                        </div>
                    )}
                    {error && (
                        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs text-red-700">
                            {error}
                        </div>
                    )}
                </div>
                <div className="flex justify-end gap-2 border-t border-slate-100 bg-slate-50 px-6 py-4 rounded-b-2xl">
                    <button onClick={onClose} disabled={loading} className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 transition disabled:opacity-50">Cancel</button>
                    <button onClick={handlePrint} disabled={loading} className="inline-flex items-center gap-2 rounded-lg bg-[#1E3A8A] px-4 py-2 text-sm font-medium text-white hover:bg-[#1E3A8A]/90 transition disabled:opacity-60">
                        {loading ? (
                            <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/></svg>
                        ) : (
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
                        )}
                        {loading ? 'Generating…' : 'Generate PDF'}
                    </button>
                </div>
            </div>
        </>
    );
}

export default function ViolationsIndex({ summary, totals, filters, departments, multipleLogs }) {
    const searchTimer = useRef(null);
    const [localFilters, setLocalFilters] = useState({
        search: filters.search || '', department_id: filters.department_id || '',
        start_date: filters.start_date || '', end_date: filters.end_date || '', status: filters.status || '',
    });
    const [selectedIds,  setSelectedIds]  = useState([]);
    const [printModal,   setPrintModal]   = useState({ open: false, scope: 'filtered', employeeIds: [] });
    const [letterModal,  setLetterModal]  = useState({ open: false, employeeId: null });
    const [empExpanded,  setEmpExpanded]  = useState({});
    const [dateExpanded, setDateExpanded] = useState({});

    function applyFilters(next) {
        router.get(route('admin.violations.index'), next, { preserveState: true, preserveScroll: true });
    }
    function handleChange(field, value) {
        const next = { ...localFilters, [field]: value };
        setLocalFilters(next);
        if (field === 'search') {
            clearTimeout(searchTimer.current);
            searchTimer.current = setTimeout(() => applyFilters(next), 350);
        } else {
            applyFilters(next);
        }
    }
    function clearFilters() {
        const blank = { search: '', department_id: '', start_date: '', end_date: '', status: '' };
        setLocalFilters(blank);
        applyFilters(blank);
    }

    const hasFilters  = Object.values(localFilters).some(v => v !== '');
    const allIds      = summary.map(e => e.employee_id);
    const allSelected = allIds.length > 0 && selectedIds.length === allIds.length;

    function toggleAll(e)  { setSelectedIds(e.target.checked ? allIds : []); }
    function toggleOne(id) { setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]); }
    function toggleEmp(code) { setEmpExpanded(p => ({ ...p, [code]: !p[code] })); }
    function toggleDate(key) { setDateExpanded(p => ({ ...p, [key]: !p[key] })); }

    const ic = 'w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-[#1E3A8A] focus:outline-none focus:ring-1 focus:ring-[#1E3A8A]/20';

    return (
        <AdminLayout title="Attendance Violations">
            <Head title="Attendance Violations" />

            {/* Header */}
            <div className="mb-6 flex items-start justify-between gap-4">
                <div>
                    <h2 className="text-xl font-bold text-slate-900">Attendance Violations</h2>
                    <p className="mt-1 text-sm text-slate-500">Review attendance issues and generate formal notice letters for the selected period.</p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                    {selectedIds.length > 0 && (
                        <button onClick={() => setPrintModal({ open: true, scope: 'selected', employeeIds: selectedIds })}
                            className="inline-flex items-center gap-1.5 rounded-lg bg-[#1E3A8A] px-3 py-2 text-xs font-semibold text-white shadow-sm hover:bg-[#1E3A8A]/90 transition">
                            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
                            Print Selected ({selectedIds.length})
                        </button>
                    )}
                    <button onClick={() => setPrintModal({ open: true, scope: 'filtered', employeeIds: [] })}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-[#1E3A8A] bg-white px-3 py-2 text-xs font-semibold text-[#1E3A8A] hover:bg-blue-50 transition">
                        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
                        Print All Filtered
                    </button>
                </div>
            </div>

            {/* Summary Cards */}
            <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
                <SummaryCard color="blue" label="Employees with Issues" value={totals.employees}
                    icon={<svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"/></svg>} />
                <SummaryCard color="red" label="Total Absences" value={totals.absences} sub="days"
                    icon={<svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>} />
                <SummaryCard color="yellow" label="Late Days" value={totals.late_days} sub="occurrences"
                    icon={<svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>} />
                <SummaryCard color="orange" label="Missing Logs" value={totals.missing_logs} sub="days"
                    icon={<svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>} />
            </div>

            {/* Filters */}
            <div className="mb-5 rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
                <div className="flex flex-wrap items-end gap-3 px-4 py-3">
                    <div className="flex-1 min-w-[150px]">
                        <label className="mb-1 block text-xs font-medium text-slate-500">Search</label>
                        <input type="text" placeholder="Name or code" value={localFilters.search} onChange={e => handleChange('search', e.target.value)} className={ic} />
                    </div>
                    <div className="flex-1 min-w-[140px]">
                        <label className="mb-1 block text-xs font-medium text-slate-500">Department</label>
                        <select value={localFilters.department_id} onChange={e => handleChange('department_id', e.target.value)} className={ic}>
                            <option value="">All Departments</option>
                            {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                        </select>
                    </div>
                    <div className="flex-1 min-w-[130px]">
                        <label className="mb-1 block text-xs font-medium text-slate-500">Issue Type</label>
                        <select value={localFilters.status} onChange={e => handleChange('status', e.target.value)} className={ic}>
                            <option value="">All Issues</option>
                            <option value="Absent">Absent</option>
                            <option value="Late">Late</option>
                            <option value="Missed Log">Missing Logs</option>
                            <option value="Undertime">Undertime</option>
                            <option value="Half Day">Half Day</option>
                        </select>
                    </div>
                    <div className="flex-1 min-w-[130px]">
                        <label className="mb-1 block text-xs font-medium text-slate-500">Date From</label>
                        <input type="date" value={localFilters.start_date} onChange={e => handleChange('start_date', e.target.value)} className={ic} />
                    </div>
                    <div className="flex-1 min-w-[130px]">
                        <label className="mb-1 block text-xs font-medium text-slate-500">Date To</label>
                        <input type="date" value={localFilters.end_date} onChange={e => handleChange('end_date', e.target.value)} className={ic} />
                    </div>
                    {hasFilters && (
                        <button onClick={clearFilters} className="self-end rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-500 hover:bg-slate-50 transition">Clear</button>
                    )}
                </div>
                <div className="border-t border-slate-100 bg-slate-50 px-4 py-2 flex items-center gap-4 text-xs text-slate-500">
                    <span><span className="font-semibold text-slate-700">{summary.length}</span> employee{summary.length !== 1 ? 's' : ''} with issues</span>
                    {(localFilters.start_date || localFilters.end_date) && (
                        <span className="text-[#1E3A8A] font-medium">{localFilters.start_date || '—'} → {localFilters.end_date || '—'}</span>
                    )}
                </div>
            </div>

            {/* Employee List */}
            {summary.length === 0 ? (
                <div className="rounded-xl border border-slate-200 bg-white px-6 py-16 text-center shadow-sm">
                    <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-slate-100">
                        <svg className="h-7 w-7 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
                    </div>
                    <h4 className="mt-4 text-sm font-semibold text-slate-900">No violations found</h4>
                    <p className="mt-1 text-xs text-slate-500">{hasFilters ? 'Try adjusting your filters.' : 'No attendance issues detected for the selected period.'}</p>
                </div>
            ) : (
                <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
                    <table className="min-w-full divide-y divide-slate-200">
                        <thead className="bg-slate-50">
                            <tr>
                                <th className="w-10 px-4 py-3">
                                    <input type="checkbox" checked={allSelected} onChange={toggleAll} className="h-4 w-4 rounded border-slate-300 text-[#1E3A8A] focus:ring-[#1E3A8A]/20" />
                                </th>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Employee</th>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Department</th>
                                <th className="px-4 py-3 text-center text-xs font-semibold text-slate-600 uppercase tracking-wider">Absences</th>
                                <th className="px-4 py-3 text-center text-xs font-semibold text-slate-600 uppercase tracking-wider">Late Days</th>
                                <th className="px-4 py-3 text-center text-xs font-semibold text-slate-600 uppercase tracking-wider">Missed Logs</th>
                                <th className="px-4 py-3 text-center text-xs font-semibold text-slate-600 uppercase tracking-wider">Undertime</th>
                                <th className="px-4 py-3 text-center text-xs font-semibold text-slate-600 uppercase tracking-wider">Letter</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 bg-white">
                            {summary.map(emp => (
                                <tr key={emp.employee_id} className="hover:bg-slate-50 transition">
                                    <td className="px-4 py-3">
                                        <input type="checkbox" checked={selectedIds.includes(emp.employee_id)} onChange={() => toggleOne(emp.employee_id)} className="h-4 w-4 rounded border-slate-300 text-[#1E3A8A] focus:ring-[#1E3A8A]/20" />
                                    </td>
                                    <td className="px-4 py-3">
                                        <p className="text-sm font-semibold text-slate-900">{emp.employee_name}</p>
                                        <p className="text-xs text-slate-400">{emp.employee_code}</p>
                                    </td>
                                    <td className="px-4 py-3 text-sm text-slate-600">{emp.department}</td>
                                    <td className="px-4 py-3 text-center">
                                        {emp.total_absences > 0
                                            ? <span className="inline-flex items-center rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-semibold text-red-700">{emp.total_absences}</span>
                                            : <span className="text-xs text-slate-300">—</span>}
                                    </td>
                                    <td className="px-4 py-3 text-center">
                                        {emp.late_frequency > 0
                                            ? <span className="inline-flex items-center rounded-full bg-yellow-100 px-2.5 py-0.5 text-xs font-semibold text-yellow-700">{emp.late_frequency}×</span>
                                            : <span className="text-xs text-slate-300">—</span>}
                                    </td>
                                    <td className="px-4 py-3 text-center">
                                        {emp.total_missed_logs > 0
                                            ? <span className="inline-flex items-center rounded-full bg-orange-100 px-2.5 py-0.5 text-xs font-semibold text-orange-700">{emp.total_missed_logs}</span>
                                            : <span className="text-xs text-slate-300">—</span>}
                                    </td>
                                    <td className="px-4 py-3 text-center">
                                        {emp.total_undertime_minutes > 0
                                            ? <span className="inline-flex items-center rounded-full bg-purple-100 px-2.5 py-0.5 text-xs font-semibold text-purple-700">{fmtTime(emp.total_undertime_minutes)}</span>
                                            : <span className="text-xs text-slate-300">—</span>}
                                    </td>
                                    <td className="px-4 py-3 text-center">
                                        <button
                                            onClick={() => setLetterModal({ open: true, employeeId: emp.employee_id })}
                                            className="inline-flex items-center gap-1 rounded-lg border border-[#1E3A8A]/30 bg-[#1E3A8A]/5 px-2.5 py-1 text-xs font-medium text-[#1E3A8A] hover:bg-[#1E3A8A]/10 transition">
                                            <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
                                            Letter
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Multiple Logs Section */}
            {multipleLogs.length > 0 && (
                <div className="mt-6">
                    <h3 className="mb-3 text-sm font-semibold text-slate-700">Employees with Multiple Biometric Logs <span className="font-normal text-slate-400">(&gt;4 logs/day)</span></h3>
                    <div className="rounded-xl border border-amber-200 bg-white shadow-sm divide-y divide-amber-100">
                        {multipleLogs.map(emp => (
                            <div key={emp.employee_code}>
                                {/* Employee row */}
                                <button
                                    onClick={() => toggleEmp(emp.employee_code)}
                                    className="w-full flex items-center justify-between px-4 py-3 hover:bg-amber-50 transition text-left"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className={`flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full transition ${empExpanded[emp.employee_code] ? 'bg-amber-200 text-amber-800' : 'bg-amber-100 text-amber-600'}`}>
                                            <svg className={`h-3.5 w-3.5 transition-transform duration-200 ${empExpanded[emp.employee_code] ? 'rotate-90' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7"/></svg>
                                        </div>
                                        <div>
                                            <p className="text-sm font-semibold text-slate-900">{emp.employee_name}</p>
                                            <p className="text-xs text-slate-400">{emp.employee_code} · {emp.department}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3 flex-shrink-0">
                                        <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-700">{emp.total_days} day{emp.total_days !== 1 ? 's' : ''}</span>
                                        <span className="rounded-full bg-orange-100 px-2.5 py-0.5 text-xs font-semibold text-orange-700">{emp.total_logs} logs</span>
                                    </div>
                                </button>

                                {/* Expanded: dates + raw logs */}
                                {empExpanded[emp.employee_code] && (
                                    <div className="px-4 pb-4 space-y-3 bg-amber-50/50">
                                        {emp.dates.map(d => (
                                            <div key={d.log_date} className="rounded-xl border border-amber-200 bg-white p-3">
                                                <div className="flex items-center gap-2 mb-2">
                                                    <span className="text-xs font-semibold text-slate-700">{fmtDate(d.log_date)}</span>
                                                    <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-700">{d.log_count} logs</span>
                                                </div>
                                                <div className="flex flex-wrap gap-1.5">
                                                    {d.logs.map((log, i) => <LogChip key={i} log={log} index={i} />)}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Print Modal */}
            <PrintModal
                isOpen={printModal.open}
                onClose={() => setPrintModal(p => ({ ...p, open: false }))}
                scope={printModal.scope}
                employeeIds={printModal.employeeIds}
                filters={localFilters}
            />

            {/* Violation Letter Modal */}
            {letterModal.open && (
                <ViolationLetterModal
                    isOpen={letterModal.open}
                    employeeId={letterModal.employeeId}
                    filters={localFilters}
                    onClose={() => setLetterModal({ open: false, employeeId: null })}
                />
            )}
        </AdminLayout>
    );
}
