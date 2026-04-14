import AdminLayout from '@/Layouts/AdminLayout';
import { Head, router } from '@inertiajs/react';
import { useState } from 'react';

export default function AttendanceReport({ employees }) {
    const today = new Date().toISOString().slice(0, 10);
    const firstOfMonth = today.slice(0, 8) + '01';

    const [dateFrom, setDateFrom] = useState(firstOfMonth);
    const [dateTo, setDateTo]     = useState(today);
    const [selected, setSelected] = useState([]); // empty = all
    const [search, setSearch]     = useState('');
    const [loading, setLoading]   = useState(false);

    const filtered = employees.filter(e =>
        `${e.first_name} ${e.last_name} ${e.employee_code}`.toLowerCase().includes(search.toLowerCase())
    );

    const toggleEmployee = (id) => {
        setSelected(prev =>
            prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
        );
    };

    const selectAll  = () => setSelected([]);
    const isAll      = selected.length === 0;

    const handleGenerate = () => {
        setLoading(true);
        router.post(route('admin.attendance.report.generate'), {
            date_from:    dateFrom,
            date_to:      dateTo,
            employee_ids: isAll ? [] : selected,
        }, {
            replace: true,   // replaces history entry so Back doesn't re-hit the POST URL
            onFinish: () => setLoading(false),
        });
    };

    return (
        <AdminLayout title="Attendance Report">
            <Head title="Attendance Report" />

            <div className="mx-auto max-w-4xl space-y-6">
                {/* Date Range */}
                <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                    <h2 className="mb-4 text-base font-semibold text-slate-800">Date Range</h2>
                    <div className="flex flex-wrap gap-4">
                        <div className="flex flex-col gap-1">
                            <label className="text-xs font-medium text-slate-600">From</label>
                            <input
                                type="date"
                                value={dateFrom}
                                onChange={e => setDateFrom(e.target.value)}
                                className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                            />
                        </div>
                        <div className="flex flex-col gap-1">
                            <label className="text-xs font-medium text-slate-600">To</label>
                            <input
                                type="date"
                                value={dateTo}
                                onChange={e => setDateTo(e.target.value)}
                                className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                            />
                        </div>
                    </div>
                </div>

                {/* Employee Selection */}
                <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                    <div className="mb-4 flex items-center justify-between">
                        <h2 className="text-base font-semibold text-slate-800">Employees</h2>
                        <button
                            onClick={selectAll}
                            className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                                isAll
                                    ? 'bg-blue-600 text-white'
                                    : 'border border-slate-300 text-slate-600 hover:bg-slate-50'
                            }`}
                        >
                            All Employees
                        </button>
                    </div>

                    <input
                        type="text"
                        placeholder="Search employees..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        className="mb-3 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                    />

                    <div className="max-h-64 overflow-y-auto rounded-lg border border-slate-200">
                        {filtered.map(emp => {
                            const checked = isAll || selected.includes(emp.id);
                            return (
                                <label
                                    key={emp.id}
                                    className="flex cursor-pointer items-center gap-3 border-b border-slate-100 px-4 py-2.5 last:border-0 hover:bg-slate-50"
                                >
                                    <input
                                        type="checkbox"
                                        checked={selected.includes(emp.id)}
                                        onChange={() => toggleEmployee(emp.id)}
                                        className="h-4 w-4 rounded border-slate-300 text-blue-600"
                                    />
                                    <div className="min-w-0 flex-1">
                                        <div className="text-sm font-medium text-slate-800">
                                            {emp.last_name}, {emp.first_name}
                                        </div>
                                        <div className="text-xs text-slate-500">
                                            {emp.employee_code} · {emp.department?.name ?? '—'}
                                        </div>
                                    </div>
                                </label>
                            );
                        })}
                        {filtered.length === 0 && (
                            <div className="px-4 py-6 text-center text-sm text-slate-400">No employees found</div>
                        )}
                    </div>

                    {!isAll && (
                        <p className="mt-2 text-xs text-slate-500">
                            {selected.length} employee{selected.length !== 1 ? 's' : ''} selected
                        </p>
                    )}
                    {isAll && (
                        <p className="mt-2 text-xs text-slate-500">
                            All {employees.length} employees will be included
                        </p>
                    )}
                </div>

                <div className="flex justify-end">
                    <button
                        onClick={handleGenerate}
                        disabled={loading || !dateFrom || !dateTo}
                        className="inline-flex items-center gap-2 rounded-lg bg-[#1E3A8A] px-6 py-2.5 text-sm font-medium text-white shadow transition hover:bg-[#1E3A8A]/90 disabled:opacity-50"
                    >
                        {loading ? (
                            <>
                                <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                                </svg>
                                Generating...
                            </>
                        ) : (
                            <>
                                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                                Generate Report
                            </>
                        )}
                    </button>
                </div>
            </div>
        </AdminLayout>
    );
}
