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
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
            {/* Table header */}
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3.5">
                <h3 className="text-sm font-semibold text-slate-800">{title}</h3>
                {selectedHere.length > 0 && (
                    <div className="flex items-center gap-2">
                        <span className="text-xs text-slate-500">{selectedHere.length} selected</span>
                        <button onClick={() => onToggle(null, true)}
                            className="rounded-lg border border-slate-300 px-3 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50 transition">
                            Clear
                        </button>
                        <button onClick={() => onBulkDelete(selectedHere)} disabled={deleting}
                            className="inline-flex items-center gap-1 rounded-lg bg-red-600 px-3 py-1 text-xs font-medium text-white hover:bg-red-700 disabled:opacity-50 transition">
                            {deleting ? 'Deleting…' : `Delete ${selectedHere.length}`}
                        </button>
                    </div>
                )}
            </div>

            {periods.length === 0 ? (
                <p className="px-5 py-8 text-center text-sm text-slate-400">{emptyMsg}</p>
            ) : (
                <table className="min-w-full text-sm">
                    <thead className="bg-[#1E3A8A] text-xs uppercase text-white">
                        <tr>
                            <th className="px-4 py-3 w-10">
                                {deletable.length > 0 && (
                                    <input type="checkbox" checked={allSelected}
                                        onChange={() => onToggleAll(deletable, allSelected)}
                                        className="rounded border-white/50 bg-transparent accent-white cursor-pointer" />
                                )}
                            </th>
                            <th className="px-5 py-3 text-left font-medium">Department</th>
                            <th className="px-5 py-3 text-left font-medium">Period</th>
                            <th className="px-5 py-3 text-left font-medium">Payroll Date</th>
                            <th className="px-5 py-3 text-center font-medium">Employees</th>
                            <th className="px-5 py-3 text-right font-medium">Net Pay</th>
                            <th className="px-5 py-3 text-center font-medium">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {periods.map(period => {
                            const isDeletable = period.status === 'OPEN';
                            const isChecked = selected.includes(period.id);
                            const totalNet = period.payrolls_sum_net_pay ?? 0;
                            const empCount = period.payrolls_count ?? '—';

                            return (
                                <tr key={period.id} className={`transition-colors ${isChecked ? 'bg-red-50' : 'hover:bg-slate-50'}`}>
                                    <td className="px-4 py-3.5 text-center">
                                        {isDeletable && (
                                            <input type="checkbox" checked={isChecked} onChange={() => onToggle(period.id)}
                                                className="rounded cursor-pointer accent-[#1E3A8A]" />
                                        )}
                                    </td>
                                    <td className="px-5 py-3.5 font-medium text-slate-900">{period.department?.name ?? '—'}</td>
                                    <td className="px-5 py-3.5 text-slate-600 whitespace-nowrap">
                                        {fmtDate(period.start_date)}
                                        <span className="mx-1.5 text-slate-300">→</span>
                                        {fmtDate(period.end_date)}
                                    </td>
                                    <td className="px-5 py-3.5 text-slate-500 whitespace-nowrap">{fmtDate(period.payroll_date)}</td>
                                    <td className="px-5 py-3.5 text-center text-slate-600">{empCount}</td>
                                    <td className="px-5 py-3.5 text-right font-semibold text-slate-800">{php(totalNet)}</td>
                                    <td className="px-5 py-3.5 text-center">
                                        <div className="flex items-center justify-center gap-1.5">
                                            <Link href={route('admin.payroll.period', period.id)}
                                                className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 hover:border-[#1E3A8A] hover:text-[#1E3A8A] transition">
                                                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg>
                                                View
                                            </Link>
                                            {isDeletable && (
                                                <button onClick={() => onDelete(period.id)}
                                                    className="rounded-lg border border-slate-200 bg-white p-1.5 text-slate-400 hover:border-red-200 hover:bg-red-50 hover:text-red-500 transition" title="Delete">
                                                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                                                </button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
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

            <div className="mb-6">
                <h2 className="text-lg font-semibold text-slate-800">Payroll</h2>
                <p className="mt-0.5 text-sm text-slate-500">Manage payroll periods and employee payslips</p>
            </div>

            {/* Summary cards */}
            <div className="mb-6 grid grid-cols-3 gap-4">
                {[
                    { label: 'Total Periods', value: periods.total,  sub: null,                  color: 'text-slate-800',  bg: 'bg-slate-100' },
                    { label: 'Open',          value: open.length,    sub: open.length > 0 ? php(totalNetOpen) + ' total net' : null,   color: 'text-blue-700',  bg: 'bg-blue-100' },
                    { label: 'Closed',        value: closed.length,  sub: closed.length > 0 ? php(totalNetClosed) + ' total net' : null, color: 'text-green-700', bg: 'bg-green-100' },
                ].map(c => (
                    <div key={c.label} className="rounded-xl border border-slate-200 bg-white px-5 py-4 shadow-sm">
                        <p className="text-xs font-medium text-slate-500">{c.label}</p>
                        <p className={`mt-1 text-xl font-bold ${c.color}`}>{c.value}</p>
                        {c.sub && <p className="mt-0.5 text-xs text-slate-400">{c.sub}</p>}
                    </div>
                ))}
            </div>

            {/* Open periods */}
            <div className="mb-6">
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
                <div className="mt-4 flex items-center justify-between">
                    <p className="text-xs text-slate-500">Showing {periods.from}–{periods.to} of {periods.total}</p>
                    <div className="flex items-center gap-1">
                        {periods.links.map((link, i) => (
                            <button key={i} disabled={!link.url}
                                onClick={() => link.url && router.get(link.url, {}, { preserveState: true })}
                                className={`min-w-[2rem] rounded-lg px-2.5 py-1 text-xs font-medium transition ${
                                    link.active ? 'bg-[#1E3A8A] text-white'
                                    : link.url ? 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                                    : 'cursor-not-allowed text-slate-300'
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
