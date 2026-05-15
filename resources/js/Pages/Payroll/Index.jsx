import AdminLayout from '@/Layouts/AdminLayout';
import { Head, Link, router } from '@inertiajs/react';
import { useState } from 'react';

const php = (n) => new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP', minimumFractionDigits: 2 }).format(n ?? 0);
const fmtDate = (d) => new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

function PeriodTable({ title, periods, selected, onToggle, onToggleAll, onDelete, onBulkDelete, deleting, emptyMsg }) {
    const deletable = periods.filter(p => p.status === 'OPEN').map(p => p.id);
    const allSelected = deletable.length > 0 && deletable.every(id => selected.includes(id));
    const selectedHere = selected.filter(id => periods.some(p => p.id === id));

    return (
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
            {/* Table header */}
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4 bg-slate-50/50">
                <h3 className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">{title}</h3>
                {selectedHere.length > 0 && (
                    <div className="flex items-center gap-3">
                        <span className="text-[10px] font-bold text-[#1E3A8A] uppercase tracking-widest">{selectedHere.length} Selected</span>
                        <button onClick={() => onToggle(null, true)}
                            className="rounded-lg border border-slate-300 px-3 py-1.5 text-[10px] font-bold text-slate-600 hover:bg-white transition-all uppercase tracking-widest active:scale-95">
                            Clear
                        </button>
                        <button onClick={() => onBulkDelete(selectedHere)} disabled={deleting}
                            className="inline-flex items-center gap-1 rounded-lg bg-rose-600 px-3 py-1.5 text-[10px] font-bold text-white hover:bg-rose-700 disabled:opacity-50 transition-all uppercase tracking-widest shadow-lg shadow-rose-200 active:scale-95">
                            {deleting ? 'Deleting…' : `Delete ${selectedHere.length}`}
                        </button>
                    </div>
                )}
            </div>

            {periods.length === 0 ? (
                <p className="px-6 py-12 text-center text-[11px] font-medium text-slate-400">{emptyMsg}</p>
            ) : (
                <div className="overflow-x-auto">
                    <table className="min-w-full">
                        <thead className="bg-[#1E3A8A] text-[9px] font-bold uppercase text-white tracking-widest">
                            <tr>
                                <th className="px-4 py-4 w-10">
                                    {deletable.length > 0 && (
                                        <input type="checkbox" checked={allSelected}
                                            onChange={() => onToggleAll(deletable, allSelected)}
                                            className="h-4 w-4 rounded border-white/50 bg-transparent accent-white cursor-pointer" />
                                    )}
                                </th>
                                <th className="px-6 py-4 text-left">Department</th>
                                <th className="px-6 py-4 text-left">Period</th>
                                <th className="px-6 py-4 text-left">Payroll Date</th>
                                <th className="px-6 py-4 text-center">Employees</th>
                                <th className="px-6 py-4 text-right">Net Pay</th>
                                <th className="px-6 py-4 text-center">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-[11px] font-medium">
                            {periods.map(period => {
                                const isDeletable = period.status === 'OPEN';
                                const isChecked = selected.includes(period.id);
                                const totalNet = period.payrolls_sum_net_pay ?? 0;
                                const empCount = period.payrolls_count ?? '—';

                                return (
                                    <tr key={period.id} className={`transition-colors ${isChecked ? 'bg-rose-50/50' : 'hover:bg-slate-50/50'}`}>
                                        <td className="px-4 py-4 text-center">
                                            {isDeletable && (
                                                <input type="checkbox" checked={isChecked} onChange={() => onToggle(period.id)}
                                                    className="h-4 w-4 rounded cursor-pointer accent-[#1E3A8A]" />
                                            )}
                                        </td>
                                        <td className="px-6 py-4 font-bold text-slate-800">{period.department?.name ?? '—'}</td>
                                        <td className="px-6 py-4 text-slate-500 whitespace-nowrap">
                                            {fmtDate(period.start_date)}
                                            <span className="mx-2 opacity-30">→</span>
                                            {fmtDate(period.end_date)}
                                        </td>
                                        <td className="px-6 py-4 text-slate-500 whitespace-nowrap">{fmtDate(period.payroll_date)}</td>
                                        <td className="px-6 py-4 text-center text-slate-600">{empCount}</td>
                                        <td className="px-6 py-4 text-right font-bold text-slate-800">{php(totalNet)}</td>
                                        <td className="px-6 py-4 text-center">
                                            <div className="flex items-center justify-center gap-2">
                                                <Link href={route('admin.payroll.period', period.id)}
                                                    className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-[10px] font-bold text-slate-600 hover:border-[#1E3A8A] hover:text-[#1E3A8A] transition-all hover:shadow-sm active:scale-95">
                                                    View
                                                </Link>
                                                {isDeletable && (
                                                    <button onClick={() => onDelete(period.id)}
                                                        className="rounded-xl border border-slate-200 bg-white p-2 text-slate-400 hover:border-rose-200 hover:bg-rose-50 hover:text-rose-500 transition-all active:scale-95" title="Delete">
                                                        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}

export default function PayrollIndex({ periods }) {
    const all    = periods.data;
    const open   = all.filter(p => p.status === 'OPEN');
    const closed = all.filter(p => p.status !== 'OPEN');

    const [selected, setSelected] = useState([]);
    const [deleting, setDeleting] = useState(false);

    function toggle(id, clear = false) {
        if (clear) { setSelected([]); return; }
        setSelected(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
    }

    function toggleAll(ids, allSelected) {
        if (allSelected) setSelected(prev => prev.filter(id => !ids.includes(id)));
        else setSelected(prev => [...new Set([...prev, ...ids])]);
    }

    function handleDelete(id) {
        if (!confirm('Delete this payroll period? All payroll data will be permanently removed.')) return;
        router.delete(route('admin.payroll.period.delete', id));
    }

    async function handleBulkDelete(ids) {
        if (!confirm(`Delete ${ids.length} payroll period${ids.length > 1 ? 's' : ''}? This cannot be undone.`)) return;
        setDeleting(true);
        try {
            for (const id of ids) {
                await fetch(route('admin.payroll.period.delete', id), {
                    method: 'DELETE',
                    headers: {
                        'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.content,
                        'Accept': 'application/json',
                    },
                });
            }
        } finally {
            setSelected([]);
            setDeleting(false);
            router.reload();
        }
    }

    // Summary totals
    const totalNetOpen   = open.reduce((s, p) => s + parseFloat(p.payrolls_sum_net_pay ?? 0), 0);
    const totalNetClosed = closed.reduce((s, p) => s + parseFloat(p.payrolls_sum_net_pay ?? 0), 0);

    return (
        <AdminLayout title="Payroll">
            <Head title="Payroll" />

            <div className="mb-8 px-1">
                <p className="text-[11px] font-bold text-[#1E3A8A] uppercase tracking-widest">
                    Payroll Management
                </p>
                <p className="mt-1.5 text-[13px] font-medium text-slate-500 max-w-2xl">
                    Manage payroll periods and employee payslips.
                </p>
            </div>

            {/* Summary cards */}
            <div className="mb-8 grid grid-cols-3 gap-5">
                {[
                    { label: 'Total Periods', value: periods.total,  sub: null,                  color: 'text-slate-800',  bg: 'bg-slate-100' },
                    { label: 'Open',          value: open.length,    sub: open.length > 0 ? php(totalNetOpen) + ' total net' : null,   color: 'text-blue-700',  bg: 'bg-blue-100' },
                    { label: 'Closed',        value: closed.length,  sub: closed.length > 0 ? php(totalNetClosed) + ' total net' : null, color: 'text-emerald-700', bg: 'bg-emerald-100' },
                ].map(c => (
                    <div key={c.label} className="rounded-2xl border border-slate-200 bg-white px-6 py-5 shadow-sm hover:shadow-md transition-all">
                        <p className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">{c.label}</p>
                        <p className={`mt-2 text-2xl font-bold ${c.color} leading-none`}>{c.value}</p>
                        {c.sub && <p className="mt-2 text-[10px] font-medium text-slate-400">{c.sub}</p>}
                    </div>
                ))}
            </div>

            {/* Open periods */}
            <div className="mb-8">
                <PeriodTable
                    title="Open Periods"
                    periods={open}
                    selected={selected}
                    onToggle={toggle}
                    onToggleAll={toggleAll}
                    onDelete={handleDelete}
                    onBulkDelete={handleBulkDelete}
                    deleting={deleting}
                    emptyMsg="No open payroll periods."
                />
            </div>

            {/* Closed periods */}
            <PeriodTable
                title="Closed Periods"
                periods={closed}
                selected={selected}
                onToggle={toggle}
                onToggleAll={toggleAll}
                onDelete={handleDelete}
                onBulkDelete={handleBulkDelete}
                deleting={deleting}
                emptyMsg="No closed payroll periods yet."
            />

            {/* Pagination */}
            {periods.last_page > 1 && (
                <div className="mt-6 flex items-center justify-between px-2">
                    <p className="text-[11px] font-medium text-slate-500">Showing {periods.from}–{periods.to} of {periods.total}</p>
                    <div className="flex items-center gap-1.5">
                        {periods.links.map((link, i) => (
                            <button key={i} disabled={!link.url}
                                onClick={() => link.url && router.get(link.url, {}, { preserveState: true })}
                                className={`min-w-[2.5rem] h-9 rounded-xl px-3 py-1 text-[11px] font-bold transition-all ${
                                    link.active ? 'bg-[#1E3A8A] text-white shadow-lg shadow-blue-900/20'
                                    : link.url ? 'border border-slate-200 bg-white text-slate-600 hover:border-[#1E3A8A] hover:text-[#1E3A8A]'
                                    : 'cursor-not-allowed text-slate-200 border-slate-100'
                                }`}
                                dangerouslySetInnerHTML={{ __html: link.label }}
                            />
                        ))}
                    </div>
                </div>
            )}
        </AdminLayout>
    );
}
