import { Head } from '@inertiajs/react';

const fmtDate = (d) => {
    const [y, m, day] = d.split('-');
    return `${m}/${day}/${y}`;
};

const fmtDateLong = (d) => new Date(d + 'T00:00:00').toLocaleDateString('en-US', {
    year: 'numeric', month: 'long', day: 'numeric',
});

const fmtTime = (t) => {
    if (!t) return '—';
    const [h, m] = t.split(':');
    const hour = parseInt(h, 10);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const h12  = hour % 12 || 12;
    return `${h12}:${m} ${ampm}`;
};

const fmtMinutes = (min) => {
    if (!min || min === 0) return '0 min';
    const h = Math.floor(min / 60);
    const m = min % 60;
    if (h === 0) return `${m} min`;
    return m === 0 ? `${h}h` : `${h}h ${m}min`;
};

const statusColor = (status) => {
    if (!status) return '';
    const s = status.toLowerCase();
    if (s.includes('absent')) return 'text-red-600';
    if (s.includes('late'))   return 'text-orange-600';
    if (s.includes('missed')) return 'text-pink-600';
    return 'text-slate-700';
};

function EmployeeTable({ data, dateFrom, dateTo, isLast }) {
    const {
        employee, rows,
        total_late_minutes, total_absences, total_late_days, total_missing_logs,
        total_undertime_minutes, total_overtime_minutes,
    } = data;

    return (
        <div className={`employee-section ${!isLast ? 'page-break' : ''}`}>
            {/* Employee Header */}
            <div className="mb-3 border-b-2 border-slate-800 pb-2">
                <div className="flex items-baseline justify-between">
                    <div>
                        <h2 className="text-base font-bold text-slate-900">
                            {employee.last_name}, {employee.first_name}
                        </h2>
                        <p className="text-xs text-slate-500">
                            {employee.employee_code} · {employee.department ?? '—'}
                        </p>
                    </div>
                    <p className="text-xs text-slate-500">
                        {fmtDateLong(dateFrom)} – {fmtDateLong(dateTo)}
                    </p>
                </div>
            </div>

            {/* Records Table */}
            {rows.length === 0 ? (
                <p className="py-4 text-center text-xs text-slate-400 italic">No attendance records found for this period.</p>
            ) : (
                <table className="w-full text-xs mb-4">
                    <thead>
                        <tr className="border-b-2 border-slate-300 bg-slate-50">
                            <th className="py-1.5 px-2 text-left font-semibold text-slate-700">Date</th>
                            <th className="py-1.5 px-2 text-center font-semibold text-slate-700">AM In</th>
                            <th className="py-1.5 px-2 text-center font-semibold text-slate-700">AM Out</th>
                            <th className="py-1.5 px-2 text-center font-semibold text-slate-700">PM In</th>
                            <th className="py-1.5 px-2 text-center font-semibold text-slate-700">PM Out</th>
                            <th className="py-1.5 px-2 text-center font-semibold text-slate-700">Missing</th>
                            <th className="py-1.5 px-2 text-center font-semibold text-slate-700">Late (min)</th>
                            <th className="py-1.5 px-2 text-center font-semibold text-slate-700">Undertime (min)</th>
                            <th className="py-1.5 px-2 text-center font-semibold text-slate-700">Overtime (min)</th>
                            <th className="py-1.5 px-2 text-left font-semibold text-slate-700">Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        {rows.map((row, i) => {
                            const isAbsent   = (row.status ?? '').toLowerCase().includes('absent') &&
                                               !(row.status ?? '').toLowerCase().includes('holiday');
                            const isLate     = row.late_minutes > 0;
                            const hasMissing = row.missed_logs > 0;
                            const rowBg = isAbsent ? 'bg-red-50' : isLate ? 'bg-orange-50' : hasMissing ? 'bg-pink-50' : '';

                            return (
                                <tr key={i} className={`border-b border-slate-100 ${rowBg}`}>
                                    <td className="py-1 px-2 font-medium text-slate-800">{fmtDate(row.date)}</td>
                                    <td className="py-1 px-2 text-center text-slate-700">{fmtTime(row.time_in_am)}</td>
                                    <td className="py-1 px-2 text-center text-slate-700">{fmtTime(row.time_out_lunch)}</td>
                                    <td className="py-1 px-2 text-center text-slate-700">{fmtTime(row.time_in_pm)}</td>
                                    <td className="py-1 px-2 text-center text-slate-700">{fmtTime(row.time_out_pm)}</td>
                                    <td className="py-1 px-2 text-center">
                                        {row.missed_logs > 0
                                            ? <span className="font-semibold text-pink-600">{row.missed_logs}</span>
                                            : <span className="text-slate-400">0</span>}
                                    </td>
                                    <td className="py-1 px-2 text-center">
                                        {row.late_minutes > 0
                                            ? <span className="font-semibold text-orange-600">{row.late_minutes}</span>
                                            : <span className="text-slate-400">0</span>}
                                    </td>
                                    <td className="py-1 px-2 text-center">
                                        {row.undertime_minutes > 0
                                            ? <span className="font-semibold text-purple-600">{row.undertime_minutes}</span>
                                            : <span className="text-slate-400">0</span>}
                                    </td>
                                    <td className="py-1 px-2 text-center">
                                        {row.overtime_minutes > 0
                                            ? <span className="font-semibold text-green-600">{row.overtime_minutes}</span>
                                            : <span className="text-slate-400">0</span>}
                                    </td>
                                    <td className={`py-1 px-2 ${statusColor(row.status)}`}>{row.status || '—'}</td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            )}

            {/* Summary Row */}
            <div className="grid grid-cols-6 gap-2 rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs">
                <div className="text-center">
                    <div className="text-base font-bold text-orange-600">{total_late_days}</div>
                    <div className="text-slate-500">Days Late</div>
                </div>
                <div className="text-center">
                    <div className="text-base font-bold text-red-600">{total_absences}</div>
                    <div className="text-slate-500">Absences</div>
                </div>
                <div className="text-center">
                    <div className="text-base font-bold text-pink-600">{total_missing_logs}</div>
                    <div className="text-slate-500">Missing Logs</div>
                </div>
                <div className="text-center">
                    <div className="text-base font-bold text-orange-700">{fmtMinutes(total_late_minutes)}</div>
                    <div className="text-slate-500">Total Late</div>
                </div>
                <div className="text-center">
                    <div className="text-base font-bold text-purple-600">{fmtMinutes(total_undertime_minutes)}</div>
                    <div className="text-slate-500">Total Undertime</div>
                </div>
                <div className="text-center">
                    <div className="text-base font-bold text-green-600">{fmtMinutes(total_overtime_minutes)}</div>
                    <div className="text-slate-500">Total Overtime</div>
                </div>
            </div>
        </div>
    );
}

export default function PrintReport({ reportData, dateFrom, dateTo }) {
    const handlePrint = () => window.print();

    return (
        <>
            <Head title={`Attendance Report — ${fmtDate(dateFrom)} to ${fmtDate(dateTo)}`} />

            <style>{`
                @media print {
                    @page { size: A4 landscape; margin: 1.2cm; }
                    .no-print { display: none !important; }
                    .page-break { page-break-after: always; }
                    body { background: white; }
                }
                body { background: #f8fafc; }
            `}</style>

            {/* Toolbar — hidden on print */}
            <div className="no-print fixed top-0 left-0 right-0 z-50 flex items-center justify-between border-b border-slate-200 bg-white px-6 py-3 shadow-sm">
                <div>
                    <h1 className="text-base font-semibold text-slate-800">Attendance Report</h1>
                    <p className="text-xs text-slate-500">
                        {fmtDateLong(dateFrom)} – {fmtDateLong(dateTo)} · {reportData.length} employee{reportData.length !== 1 ? 's' : ''}
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => window.history.back()}
                        className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 transition"
                    >
                        ← Back
                    </button>
                    <button
                        onClick={handlePrint}
                        className="inline-flex items-center gap-2 rounded-lg bg-[#1E3A8A] px-4 py-2 text-sm font-medium text-white shadow transition hover:bg-[#1E3A8A]/90"
                    >
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                        </svg>
                        Print / Export PDF
                    </button>
                </div>
            </div>

            {/* Report Content */}
            <div className="mx-auto max-w-5xl space-y-8 bg-white p-8 pt-24 print:pt-0 print:max-w-none print:space-y-0">
                {/* Report Title (visible on print) */}
                <div className="mb-6 border-b-2 border-slate-800 pb-4 no-print">
                    <h1 className="text-xl font-bold text-slate-900">Attendance Report</h1>
                    <p className="text-sm text-slate-500">
                        Period: {fmtDateLong(dateFrom)} – {fmtDateLong(dateTo)}
                    </p>
                </div>

                {/* Print-only title */}
                <div className="hidden print:block mb-4 border-b-2 border-slate-800 pb-3">
                    <h1 className="text-lg font-bold text-slate-900">Attendance Report</h1>
                    <p className="text-xs text-slate-500">Period: {fmtDateLong(dateFrom)} – {fmtDateLong(dateTo)}</p>
                </div>

                {reportData.length === 0 ? (
                    <div className="py-16 text-center text-slate-400">
                        <p className="text-lg font-medium">No data found</p>
                        <p className="text-sm">No attendance records exist for the selected range and employees.</p>
                    </div>
                ) : (
                    reportData.map((data, i) => (
                        <EmployeeTable
                            key={data.employee.id}
                            data={data}
                            dateFrom={dateFrom}
                            dateTo={dateTo}
                            isLast={i === reportData.length - 1}
                        />
                    ))
                )}
            </div>
        </>
    );
}
