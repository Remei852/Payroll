import { useState } from 'react';
import AdminLayout from '@/Layouts/AdminLayout';
import { Head, Link, router } from '@inertiajs/react';

const php = (n) => new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP', minimumFractionDigits: 2 }).format(n ?? 0);
const fmtDate = (d) => new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
const fmtMin = (m) => {
    if (!m || m <= 0) return '—';
    const h = Math.floor(m / 60), mn = m % 60;
    return `${String(h).padStart(2,'0')}:${String(mn).padStart(2,'0')}`;
};

// ─── Add Cash Advance modal ───────────────────────────────────────────────────
function AddAdvanceModal({ employees, periodId, onClose, onSave }) {
    const [form, setForm] = useState({ employee_id: '', amount: '', reason: '', deduct_on: '', release_date: new Date().toISOString().split('T')[0] });
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState(null);

    async function handleSubmit(e) {
        e.preventDefault();
        setSaving(true);
        setError(null);
        try {
            const res = await fetch(`/api/employees/${form.employee_id}/cash-advances`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.content },
                body: JSON.stringify({
                    amount: parseFloat(form.amount),
                    release_date: form.release_date || null,
                    reason: form.reason || null,
                    deduct_on: form.deduct_on || null,
                    apply_to_period_id: periodId,
                }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.message || 'Failed');
            onSave();
            onClose();
        } catch (err) {
            setError(err.message);
        } finally {
            setSaving(false);
        }
    }

    return (
        <>
            <div className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm" onClick={onClose} />
            <div className="fixed left-1/2 top-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-xl border border-slate-200 bg-white shadow-2xl">
                <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
                    <h3 className="text-sm font-semibold text-slate-800">Add Cash Advance</h3>
                    <button onClick={onClose} className="rounded-lg p-1 text-slate-400 hover:bg-slate-100"><svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/></svg></button>
                </div>
                <form onSubmit={handleSubmit} className="p-5 space-y-4">
                    <div>
                        <label className="mb-1 block text-xs font-medium text-slate-600">Employee</label>
                        <select required value={form.employee_id} onChange={e => setForm(f => ({ ...f, employee_id: e.target.value }))}
                            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-[#1E3A8A] focus:outline-none focus:ring-1 focus:ring-[#1E3A8A]">
                            <option value="">Select employee</option>
                            {employees.map(e => <option key={e.id} value={e.id}>{e.last_name}, {e.first_name}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="mb-1 block text-xs font-medium text-slate-600">Amount</label>
                        <input required type="number" min="0.01" step="0.01" placeholder="0.00" value={form.amount}
                            onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
                            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-[#1E3A8A] focus:outline-none focus:ring-1 focus:ring-[#1E3A8A]" />
                    </div>
                    <div>
                        <label className="mb-1 block text-xs font-medium text-slate-600">Release Date</label>
                        <input required type="date" value={form.release_date}
                            onChange={e => setForm(f => ({ ...f, release_date: e.target.value }))}
                            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-[#1E3A8A] focus:outline-none focus:ring-1 focus:ring-[#1E3A8A]" />
                    </div>
                    <div>
                        <label className="mb-1 block text-xs font-medium text-slate-600">Reason <span className="text-slate-400">(optional)</span></label>
                        <input type="text" placeholder="e.g. Emergency" value={form.reason}
                            onChange={e => setForm(f => ({ ...f, reason: e.target.value }))}
                            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-[#1E3A8A] focus:outline-none focus:ring-1 focus:ring-[#1E3A8A]" />
                    </div>
                    <div>
                        <label className="mb-1 block text-xs font-medium text-slate-600">
                            Deduction Date <span className="text-slate-400">(leave blank to deduct in current period)</span>
                        </label>
                        <input type="date" value={form.deduct_on}
                            onChange={e => setForm(f => ({ ...f, deduct_on: e.target.value }))}
                            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-[#1E3A8A] focus:outline-none focus:ring-1 focus:ring-[#1E3A8A]" />
                        <p className="mt-1 text-xs text-slate-400">The system uses this date to determine which payroll period will handle the deduction.</p>
                    </div>
                    {error && <p className="text-xs text-red-600">{error}</p>}
                    <div className="flex justify-end gap-2 pt-1">
                        <button type="button" onClick={onClose} className="rounded-lg border border-slate-300 px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-50">Cancel</button>
                        <button type="submit" disabled={saving}
                            className="inline-flex items-center gap-1.5 rounded-lg bg-[#1E3A8A] px-4 py-2 text-xs font-medium text-white hover:bg-[#1E3A8A]/90 disabled:opacity-50">
                            {saving ? 'Saving…' : 'Add Advance'}
                        </button>
                    </div>
                </form>
            </div>
        </>
    );
}

// ─── Employee row (expandable) ────────────────────────────────────────────────
function EmployeeRow({ payroll, periodStatus, isClosed, isSelected, onToggleSelect, onApplyAdvance, onRemoveAdvance, onRegenerate }) {
    const [expanded, setExpanded] = useState(false);
    const [applyingId, setApplyingId] = useState(null);
    const [removingId, setRemovingId] = useState(null);

    const earnings    = payroll.items.filter(i => i.type === 'EARNING');
    const deductions  = payroll.items.filter(i => i.type === 'DEDUCTION');
    const penalties   = deductions.filter(i => i.category.includes('Penalty'));
    const contribs    = deductions.filter(i => !i.category.includes('Penalty') && i.category !== 'Cash Advance');
    const caDeductions = deductions.filter(i => i.category === 'Cash Advance');
    // Only show advances that are still Active (not yet deducted) — deducted ones show via caDeductions
    const activeAdvances = (payroll.employee.cash_advances ?? []).filter(a => a.status === 'Active');
    const att = payroll.attendance_summary ?? {};

    async function applyAdvance(advanceId) {
        setApplyingId(advanceId);
        try {
            const res = await fetch(`/api/payroll/${payroll.id}/apply-cash-advance`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.content },
                body: JSON.stringify({ cash_advance_id: advanceId }),
            });
            const data = await res.json();
            if (res.ok) {
                onApplyAdvance();
            } else {
                alert(data.message || 'Failed to apply deduction');
            }
        } catch {
            alert('Network error — could not apply deduction');
        } finally { setApplyingId(null); }
    }

    async function removeAdvance(advanceId) {
        if (!confirm('Remove this cash advance?')) return;
        setRemovingId(advanceId);
        try {
            const res = await fetch(`/api/cash-advances/${advanceId}`, {
                method: 'DELETE',
                headers: { 'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.content },
            });
            if (res.ok) onRemoveAdvance();
        } finally { setRemovingId(null); }
    }

    const emp = payroll.employee;
    const name = `${emp.last_name}, ${emp.first_name}`;

    return (
        <>
            {/* Summary row */}
            <tr className={`transition-colors ${expanded ? 'bg-blue-50' : 'hover:bg-slate-50'}`}>
                {isClosed && (
                    <td className="px-4 py-3 text-center" onClick={e => e.stopPropagation()}>
                        <input type="checkbox" checked={isSelected} onChange={onToggleSelect}
                            className="rounded cursor-pointer accent-[#1E3A8A]" />
                    </td>
                )}
                <td className="px-4 py-3">
                    <button onClick={() => setExpanded(e => !e)} className="flex items-center gap-2 text-left">
                        <svg className={`h-3.5 w-3.5 text-slate-400 transition-transform flex-shrink-0 ${expanded ? 'rotate-90' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7"/></svg>
                        <div>
                            <div className="flex items-center gap-2">
                                <p className="text-sm font-medium text-slate-900">{name}</p>
                                {activeAdvances.length > 0 && (
                                    <span 
                                        className="inline-flex items-center rounded bg-amber-50 px-1 py-0.5 text-[10px] font-bold text-amber-600 ring-1 ring-inset ring-amber-500/10"
                                        title={`${activeAdvances.length} pending cash advance(s)`}
                                    >
                                        CA
                                    </span>
                                )}
                            </div>
                            <p className="text-xs text-slate-400">{emp.employee_code}</p>
                        </div>
                    </button>
                </td>
                <td className="px-4 py-3 text-center text-sm text-slate-600">{att.days_worked ?? '—'}</td>
                <td className="px-4 py-3 text-right text-sm text-slate-800">{php(payroll.gross_pay)}</td>
                <td className="px-4 py-3 text-right text-sm text-red-600">{php(payroll.total_deductions)}</td>
                <td className="px-4 py-3 text-right text-sm font-semibold text-green-700">{php(payroll.net_pay)}</td>
                <td className="px-4 py-3 text-center">
                    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${payroll.status === 'DRAFT' ? 'bg-yellow-100 text-yellow-700' : 'bg-green-100 text-green-700'}`}>
                        {payroll.status}
                    </span>
                </td>
                <td className="px-4 py-3 text-center">
                    <div className="flex items-center justify-center gap-1.5">
                        <Link href={route('admin.payroll.payslip', payroll.id)}
                            className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-600 hover:border-[#1E3A8A] hover:text-[#1E3A8A] transition">
                            <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
                            Payslip
                        </Link>
                        {periodStatus === 'OPEN' && (
                            <button onClick={() => onRegenerate(payroll.employee.id)}
                                className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-600 hover:border-slate-400 transition">
                                <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg>
                                Regen
                            </button>
                        )}
                    </div>
                </td>
            </tr>

            {/* Expanded detail */}
            {expanded && (
                <tr>
                    <td colSpan={isClosed ? 8 : 7} className="bg-slate-50 px-6 pb-4 pt-2">
                        <div className="grid grid-cols-3 gap-4">

                            {/* Attendance */}
                            <div className="rounded-lg border border-slate-200 bg-white p-4">
                                <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500">Attendance</p>
                                <div className="space-y-1.5 text-xs">
                                    <div className="flex justify-between"><span className="text-slate-500">Days Worked</span><span className="font-medium text-slate-800">{att.days_worked ?? '—'}</span></div>
                                    <div className="flex justify-between"><span className="text-slate-500">Late</span><span className={`font-medium ${att.late_minutes > 0 ? 'text-orange-600' : 'text-slate-800'}`}>{fmtMin(att.late_minutes)}</span></div>
                                    <div className="flex justify-between"><span className="text-slate-500">Undertime</span><span className={`font-medium ${att.undertime_minutes > 0 ? 'text-purple-600' : 'text-slate-800'}`}>{fmtMin(att.undertime_minutes)}</span></div>
                                    <div className="flex justify-between"><span className="text-slate-500">Overtime</span><span className={`font-medium ${att.overtime_minutes > 0 ? 'text-green-600' : 'text-slate-800'}`}>{fmtMin(att.overtime_minutes)}</span></div>
                                </div>
                            </div>

                            {/* Earnings & Deductions */}
                            <div className="rounded-lg border border-slate-200 bg-white p-4">
                                <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500">Earnings & Deductions</p>
                                <div className="space-y-1 text-xs">
                                    {earnings.map(i => (
                                        <div key={i.id} className="flex justify-between">
                                            <span className="text-slate-500">{i.category}</span>
                                            <span className="font-medium text-green-700">+{php(i.amount)}</span>
                                        </div>
                                    ))}
                                    {penalties.map(i => (
                                        <div key={i.id} className="flex justify-between">
                                            <span className="text-slate-500">{i.category}</span>
                                            <span className="font-medium text-red-600">−{php(i.amount)}</span>
                                        </div>
                                    ))}
                                    {contribs.map(i => (
                                        <div key={i.id} className="flex justify-between">
                                            <span className="text-slate-500">{i.category}</span>
                                            <span className="font-medium text-red-600">−{php(i.amount)}</span>
                                        </div>
                                    ))}
                                    {caDeductions.map(i => (
                                        <div key={i.id} className="flex justify-between">
                                            <span className="text-slate-500">Cash Advance</span>
                                            <span className="font-medium text-red-600">−{php(i.amount)}</span>
                                        </div>
                                    ))}
                                    <div className="flex justify-between border-t border-slate-100 pt-1.5 mt-1.5">
                                        <span className="font-semibold text-slate-700">Net Pay</span>
                                        <span className="font-bold text-green-700">{php(payroll.net_pay)}</span>
                                    </div>
                                </div>
                            </div>

                            {/* Cash Advances */}
                            <div className="rounded-lg border border-slate-200 bg-white p-4">
                                <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500">Cash Advances</p>
                                {/* Already deducted in this payroll */}
                                {caDeductions.length > 0 && (
                                    <div className="mb-3 space-y-1.5">
                                        {caDeductions.map(item => (
                                            <div key={item.id} className="flex items-center justify-between rounded-lg border border-green-100 bg-green-50 px-3 py-2">
                                                <div>
                                                    <p className="text-xs font-semibold text-green-800">{php(item.amount)}</p>
                                                    <p className="text-xs text-green-600">Deducted this period</p>
                                                </div>
                                                <svg className="h-4 w-4 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/></svg>
                                            </div>
                                        ))}
                                    </div>
                                )}
                                {/* Active advances pending deduction */}
                                {activeAdvances.length === 0 && caDeductions.length === 0 ? (
                                    <p className="text-xs text-slate-400">No cash advances</p>
                                ) : activeAdvances.length > 0 ? (
                                    <div className="space-y-2">
                                        {activeAdvances.map(adv => (
                                            <div key={adv.id} className="flex items-center justify-between gap-2 rounded-lg border border-amber-100 bg-amber-50 px-3 py-2">
                                                <div>
                                                    <p className="text-xs font-semibold text-amber-800">{php(adv.amount)}</p>
                                                    {adv.reason && <p className="text-xs text-amber-600">{adv.reason}</p>}
                                                    {adv.deduct_on && (
                                                        <p className="text-xs text-amber-500">Deduct on: {new Date(adv.deduct_on).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</p>
                                                    )}
                                                </div>
                                                {periodStatus === 'OPEN' && (
                                                    <div className="flex gap-1">
                                                        <button onClick={() => applyAdvance(adv.id)} disabled={applyingId === adv.id}
                                                            className="rounded-md bg-green-600 px-2 py-1 text-xs font-medium text-white hover:bg-green-700 disabled:opacity-50">
                                                            {applyingId === adv.id ? '…' : 'Deduct'}
                                                        </button>
                                                        <button onClick={() => removeAdvance(adv.id)} disabled={removingId === adv.id}
                                                            className="rounded-md border border-slate-300 bg-white px-2 py-1 text-xs font-medium text-slate-600 hover:bg-red-50 hover:border-red-300 hover:text-red-600 disabled:opacity-50">
                                                            {removingId === adv.id ? '…' : 'Remove'}
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                ) : null}
                            </div>
                        </div>
                    </td>
                </tr>
            )}
        </>
    );
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function PayrollPeriod({ period }) {
    const [finalizing, setFinalizing] = useState(false);
    const [showAddAdvance, setShowAddAdvance] = useState(false);
    const [toast, setToast] = useState(null);
    const [selected, setSelected] = useState([]);

    const totalGross = period.payrolls.reduce((s, p) => s + parseFloat(p.gross_pay), 0);
    const totalDed   = period.payrolls.reduce((s, p) => s + parseFloat(p.total_deductions), 0);
    const totalNet   = period.payrolls.reduce((s, p) => s + parseFloat(p.net_pay), 0);
    const isClosed   = period.status === 'CLOSED';
    const isOpen     = period.status === 'OPEN';
    const allSelected = period.payrolls.length > 0 && selected.length === period.payrolls.length;

    function toggleSelect(id) {
        setSelected(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
    }
    function toggleAll() {
        setSelected(allSelected ? [] : period.payrolls.map(p => p.id));
    }
    function printSelected() {
        const ids = selected.length > 0 ? selected : period.payrolls.map(p => p.id);
        const url = route('admin.payroll.period.print', period.id) + (selected.length > 0 ? `?ids=${ids.join(',')}` : '');
        window.open(url, '_blank');
    }

    function showMsg(type, msg) {
        setToast({ type, msg });
        setTimeout(() => setToast(null), 3500);
    }

    function handleFinalize() {
        if (!confirm('Finalize this payroll period? This cannot be undone.')) return;
        setFinalizing(true);
        router.post(route('admin.payroll.finalize-period', period.id), {}, {
            onSuccess: () => showMsg('success', 'Period finalized'),
            onError: () => showMsg('error', 'Failed to finalize'),
            onFinish: () => setFinalizing(false),
        });
    }

    function handleDelete() {
        if (!confirm('Delete this payroll period? All payroll data for this period will be permanently removed.')) return;
        router.delete(route('admin.payroll.period.delete', period.id), {}, {
            onError: () => showMsg('error', 'Failed to delete period'),
        });
    }

    function handleRegenerate(employeeId) {
        router.post(route('admin.payroll.regenerate-employee', [period.id, employeeId]), {}, {
            onSuccess: () => showMsg('success', 'Payroll regenerated'),
            onError: () => showMsg('error', 'Failed to regenerate'),
        });
    }

    function reload() {
        router.reload({ only: ['period'] });
    }

    const employees = period.payrolls.map(p => p.employee);

    return (
        <AdminLayout title="Payroll Period">
            <Head title="Payroll Period" />

            {/* Toast */}
            {toast && (
                <div className={`fixed top-5 right-5 z-50 rounded-xl px-4 py-3 text-sm font-medium shadow-xl ${toast.type === 'success' ? 'bg-green-600 text-white' : 'bg-red-600 text-white'}`}>
                    {toast.msg}
                </div>
            )}

            {/* Header */}
            <div className="mb-6 flex items-start justify-between">
                <div>
                    <div className="flex items-center gap-2 mb-1">
                        <Link href={route('admin.payroll.index')} className="text-xs text-slate-400 hover:text-slate-600 transition">← Payroll</Link>
                    </div>
                    <h2 className="text-lg font-semibold text-slate-800">{period.department.name}</h2>
                    <p className="mt-0.5 text-sm text-slate-500">
                        {fmtDate(period.start_date)} → {fmtDate(period.end_date)}
                        <span className="mx-2 text-slate-300">·</span>
                        Payroll date: {fmtDate(period.payroll_date)}
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
                        period.status === 'OPEN' ? 'bg-blue-100 text-blue-700'
                        : period.status === 'PROCESSING' ? 'bg-yellow-100 text-yellow-700'
                        : 'bg-green-100 text-green-700'
                    }`}>{period.status}</span>
                    {isOpen && (
                        <>
                            <button onClick={() => setShowAddAdvance(true)}
                                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 transition">
                                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4"/></svg>
                                Add Cash Advance
                            </button>
                            <button onClick={handleDelete}
                                className="inline-flex items-center gap-1.5 rounded-lg border border-red-300 bg-white px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 transition">
                                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                                Delete Period
                            </button>
                            <button onClick={handleFinalize} disabled={finalizing}
                                className="inline-flex items-center gap-1.5 rounded-lg bg-green-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-green-700 disabled:opacity-50 transition">
                                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/></svg>
                                {finalizing ? 'Finalizing…' : 'Finalize Period'}
                            </button>
                        </>
                    )}
                    {isClosed && (
                        <button onClick={printSelected}
                            className="inline-flex items-center gap-1.5 rounded-lg bg-[#1E3A8A] px-3 py-1.5 text-xs font-medium text-white hover:bg-[#1E3A8A]/90 transition">
                            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"/></svg>
                            {selected.length > 0 ? `Print Selected (${selected.length})` : 'Print All'}
                        </button>
                    )}
                </div>
            </div>

            {/* Summary cards */}
            <div className="mb-6 grid grid-cols-3 gap-4">
                {[
                    { label: 'Total Gross Pay',   value: totalGross, color: 'text-slate-800',  bg: 'bg-slate-100' },
                    { label: 'Total Deductions',  value: totalDed,   color: 'text-red-600',    bg: 'bg-red-100' },
                    { label: 'Total Net Pay',     value: totalNet,   color: 'text-green-700',  bg: 'bg-green-100' },
                ].map(c => (
                    <div key={c.label} className="rounded-xl border border-slate-200 bg-white px-5 py-4 shadow-sm">
                        <p className="text-xs font-medium text-slate-500">{c.label}</p>
                        <p className={`mt-1 text-xl font-bold ${c.color}`}>{php(c.value)}</p>
                        <p className="mt-0.5 text-xs text-slate-400">{period.payrolls.length} employees</p>
                    </div>
                ))}
            </div>

            {/* Employee table */}
            <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
                <div className="border-b border-slate-100 px-5 py-3.5 flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-slate-800">Employee Payrolls</h3>
                    <p className="text-xs text-slate-400">
                        {isClosed ? 'Check employees to print specific payslips, or print all.' : 'Click a row to expand details, contributions, and cash advances'}
                    </p>
                </div>
                <div className="overflow-x-auto">
                    <table className="min-w-full text-sm">
                        <thead className="bg-[#1E3A8A] text-xs uppercase text-white">
                            <tr>
                                {isClosed && (
                                    <th className="px-4 py-3 text-center font-medium w-10">
                                        <input type="checkbox" checked={allSelected} onChange={toggleAll}
                                            className="rounded border-white/50 bg-transparent accent-white cursor-pointer" />
                                    </th>
                                )}
                                <th className="px-4 py-3 text-left font-medium">Employee</th>
                                <th className="px-4 py-3 text-center font-medium">Days</th>
                                <th className="px-4 py-3 text-right font-medium">Gross Pay</th>
                                <th className="px-4 py-3 text-right font-medium">Deductions</th>
                                <th className="px-4 py-3 text-right font-medium">Net Pay</th>
                                <th className="px-4 py-3 text-center font-medium">Status</th>
                                <th className="px-4 py-3 text-center font-medium">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {period.payrolls.map(payroll => (
                                <EmployeeRow
                                    key={payroll.id}
                                    payroll={payroll}
                                    periodStatus={period.status}
                                    isClosed={isClosed}
                                    isSelected={selected.includes(payroll.id)}
                                    onToggleSelect={() => toggleSelect(payroll.id)}
                                    onApplyAdvance={reload}
                                    onRemoveAdvance={reload}
                                    onRegenerate={handleRegenerate}
                                />
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Add Cash Advance modal */}
            {showAddAdvance && (
                <AddAdvanceModal
                    employees={employees}
                    periodId={period.id}
                    onClose={() => setShowAddAdvance(false)}
                    onSave={reload}
                />
            )}
        </AdminLayout>
    );
}
