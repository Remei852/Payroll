import { Head } from '@inertiajs/react';
import { router } from '@inertiajs/react';
import { useState } from 'react';

// ─── Formatters ───────────────────────────────────────────────────────────────
const fmtDate = (d) => {
    const [y, m, day] = d.split('-');
    return `${m}/${day}/${y}`;
};

const fmtDateLong = (d) => new Date(d + 'T00:00:00').toLocaleDateString('en-US', {
    year: 'numeric', month: 'long', day: 'numeric',
});

const fmtTime = (t) => {
    if (!t) return '—';
    // Return as-is in HH:MM:SS — the backend sends HH:MM or HH:MM:SS
    const parts = t.split(':');
    const h  = parts[0].padStart(2, '0');
    const m  = (parts[1] ?? '00').padStart(2, '0');
    const s  = (parts[2] ?? '00').padStart(2, '0');
    return `${h}:${m}:${s}`;
};

const fmtMins = (min) => {
    if (!min || min === 0) return '—';
    const h = Math.floor(min / 60), m = min % 60;
    if (h === 0) return `${m}m`;
    return m === 0 ? `${h}h` : `${h}h${m}m`;
};

// ─── Single employee block ────────────────────────────────────────────────────
function EmployeeBlock({ data, dateFrom, dateTo }) {
    const {
        employee, rows,
        total_days_worked,
        total_late_minutes, total_absences, total_late_days,
        total_missing_logs, total_undertime_minutes, total_overtime_minutes,
    } = data;

    return (
        <div className="employee-block">
            {/* Employee header — compact single line */}
            <div className="emp-header">
                <span className="emp-name">{employee.last_name}, {employee.first_name}</span>
                <span className="emp-meta">{employee.employee_code} · {employee.department ?? '—'}</span>
                <span className="emp-period">{fmtDateLong(dateFrom)} – {fmtDateLong(dateTo)}</span>
            </div>

            {rows.length === 0 ? (
                <p className="no-records">No attendance records for this period.</p>
            ) : (
                <table className="att-table">
                    <thead>
                        <tr>
                            <th className="col-date">Date</th>
                            <th className="col-time">AM In</th>
                            <th className="col-time">AM Out</th>
                            <th className="col-time">PM In</th>
                            <th className="col-time">PM Out</th>
                            <th className="col-num">Miss</th>
                            <th className="col-num">Late AM</th>
                            <th className="col-num">Late PM</th>
                            <th className="col-num">Total Late</th>
                            <th className="col-num">UT</th>
                            <th className="col-num">OT</th>
                            <th className="col-status">Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        {rows.map((row, i) => {
                            const absent  = (row.status ?? '').toLowerCase().includes('absent') &&
                                            !(row.status ?? '').toLowerCase().includes('holiday');
                            const missing = row.missed_logs > 0;
                            const cls = absent ? 'row-absent' : missing ? 'row-missing' : '';
                            const lateAM = row.late_minutes_am > 0;
                            const latePM = row.late_minutes_pm > 0;
                            return (
                                <tr key={i} className={cls}>
                                    <td className="col-date">{fmtDate(row.date)}</td>
                                    <td className={`col-time${lateAM ? ' cell-late' : ''}`}>{fmtTime(row.time_in_am)}</td>
                                    <td className="col-time">{fmtTime(row.time_out_lunch)}</td>
                                    <td className={`col-time${latePM ? ' cell-late' : ''}`}>{fmtTime(row.time_in_pm)}</td>
                                    <td className="col-time">{fmtTime(row.time_out_pm)}</td>
                                    <td className="col-num">{row.missed_logs > 0 ? row.missed_logs : '—'}</td>
                                    <td className={`col-num${lateAM ? ' cell-late' : ''}`}>{fmtMins(row.late_minutes_am)}</td>
                                    <td className={`col-num${latePM ? ' cell-late' : ''}`}>{fmtMins(row.late_minutes_pm)}</td>
                                    <td className={`col-num${lateAM || latePM ? ' cell-late-total' : ''}`}>{fmtMins(row.late_minutes)}</td>
                                    <td className="col-num">{fmtMins(row.undertime_minutes)}</td>
                                    <td className="col-num">{fmtMins(row.overtime_minutes)}</td>
                                    <td className="col-status">{row.status || '—'}</td>
                                </tr>
                            );
                        })}
                    </tbody>
                    <tfoot>
                        <tr className="summary-row">
                            <td colSpan={5} className="summary-label">TOTALS</td>
                            <td className="col-num">{total_missing_logs || '—'}</td>
                            <td className="col-num">—</td>
                            <td className="col-num">—</td>
                            <td className="col-num">{fmtMins(total_late_minutes)}</td>
                            <td className="col-num">{fmtMins(total_undertime_minutes)}</td>
                            <td className="col-num">{fmtMins(total_overtime_minutes)}</td>
                            <td className="col-status summary-stats">
                                {total_absences > 0 && <span>{total_absences} absent</span>}
                                {total_late_days > 0 && <span>{total_late_days} late days</span>}
                                <span className="days-worked">{total_days_worked} days worked</span>
                            </td>
                        </tr>
                    </tfoot>
                </table>
            )}
        </div>
    );
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function PrintReport({ reportData, dateFrom, dateTo }) {
    const [onePerPage, setOnePerPage] = useState(false);

    return (
        <>
            <Head title={`Attendance Report — ${fmtDate(dateFrom)} to ${fmtDate(dateTo)}`} />

            <style>{`
                /* ── Screen styles ── */
                body { background: #f1f5f9; margin: 0; }

                .toolbar {
                    position: fixed; top: 0; left: 0; right: 0; z-index: 50;
                    display: flex; align-items: center; justify-content: space-between;
                    background: white; border-bottom: 1px solid #e2e8f0;
                    padding: 10px 24px; box-shadow: 0 1px 3px rgba(0,0,0,.08);
                }
                .toolbar-title { font-size: 14px; font-weight: 600; color: #1e293b; }
                .toolbar-sub   { font-size: 11px; color: #64748b; margin-top: 1px; }
                .toolbar-actions { display: flex; gap: 8px; align-items: center; }

                .btn {
                    display: inline-flex; align-items: center; gap: 6px;
                    padding: 7px 14px; border-radius: 8px; font-size: 13px;
                    font-weight: 500; cursor: pointer; transition: all .15s;
                    border: 1px solid #cbd5e1; background: white; color: #475569;
                }
                .btn:hover { background: #f8fafc; }
                .btn-primary { background: #1e3a8a; color: white; border-color: #1e3a8a; }
                .btn-primary:hover { background: #1e3a8a; opacity: .9; }

                .toggle-label {
                    display: flex; align-items: center; gap: 6px;
                    font-size: 12px; color: #475569; cursor: pointer;
                }

                .report-spacer { height: 72px; }

                .report-wrap {
                    max-width: 900px; margin: 0 auto 40px;
                    background: white; padding: 24px;
                    box-shadow: 0 1px 4px rgba(0,0,0,.1);
                }

                .report-title {
                    font-size: 16px; font-weight: 700; color: #0f172a;
                    border-bottom: 2px solid #0f172a; padding-bottom: 8px; margin-bottom: 20px;
                }
                .report-title span { font-size: 11px; font-weight: 400; color: #64748b; margin-left: 8px; }

                /* ── Employee block ── */
                .employee-block {
                    margin-bottom: 20px;
                    border: 1px solid #e2e8f0;
                    border-radius: 6px;
                    overflow: hidden;
                }

                .emp-header {
                    display: flex; align-items: baseline; gap: 10px;
                    background: #1e3a8a; color: white;
                    padding: 6px 10px; font-size: 11px;
                }
                .emp-name   { font-weight: 700; font-size: 12px; }
                .emp-meta   { opacity: .75; }
                .emp-period { margin-left: auto; opacity: .75; white-space: nowrap; }

                .no-records {
                    padding: 12px; text-align: center;
                    font-size: 11px; color: #94a3b8; font-style: italic;
                }

                /* ── Attendance table ── */
                .att-table {
                    width: 100%; border-collapse: collapse;
                    font-size: 10.5px;
                }
                .att-table th {
                    background: #f8fafc; color: #475569;
                    font-weight: 600; text-transform: uppercase;
                    font-size: 9px; letter-spacing: .04em;
                    padding: 5px 6px; border-bottom: 1px solid #e2e8f0;
                    white-space: nowrap;
                }
                .att-table td {
                    padding: 4px 6px; border-bottom: 1px solid #f1f5f9;
                    color: #334155;
                }
                .att-table tbody tr:last-child td { border-bottom: none; }

                .col-date   { text-align: left;   min-width: 58px; }
                .col-time   { text-align: center;  min-width: 62px; }
                .col-num    { text-align: center;  min-width: 36px; }
                .col-status { text-align: left;    min-width: 80px; }

                /* Row highlights — subtle for screen, stripped for print */
                .row-absent  td { background: #fef2f2; }
                .row-missing td { background: #fdf4ff; }

                /* Late cell highlights — applied per-cell, not per-row */
                .cell-late {
                    background: #fff7ed !important;
                    color: #c2410c !important;
                    font-weight: 600;
                }
                .cell-late-total {
                    background: #ffedd5 !important;
                    color: #9a3412 !important;
                    font-weight: 700;
                }

                /* Summary footer row */
                .summary-row td {
                    background: #f8fafc; font-weight: 600;
                    border-top: 1.5px solid #cbd5e1;
                    font-size: 10px; color: #1e293b;
                    padding: 5px 6px;
                }
                .summary-label { text-align: right; color: #64748b; }
                .summary-stats { display: flex; gap: 6px; flex-wrap: wrap; }
                .summary-stats span {
                    background: #e2e8f0; border-radius: 3px;
                    padding: 1px 5px; font-size: 9px; color: #475569;
                }
                .summary-stats .days-worked {
                    background: #dbeafe; color: #1e40af; font-weight: 600;
                }

                /* ── Print styles ── */
                @media print {
                    @page {
                        size: A4 portrait;
                        margin: 1cm 1.2cm;
                    }
                    @page :first {
                        margin: 1cm 1.2cm;
                    }

                    html, body { background: white !important; margin: 0; padding: 0; }
                    .toolbar { display: none !important; }
                    .report-spacer { display: none !important; }

                    .report-wrap {
                        max-width: none; margin: 0; padding: 0;
                        box-shadow: none;
                    }

                    .report-title {
                        font-size: 13px; margin-bottom: 14px;
                    }

                    /* Remove colored row backgrounds — saves ink, looks clean in B&W */
                    .row-absent td, .row-missing td {
                        background: white !important;
                    }

                    /* Keep late cell orange in print — it's the key visual signal */
                    .cell-late, .cell-late-total {
                        -webkit-print-color-adjust: exact;
                        print-color-adjust: exact;
                    }

                    /* Mark problem rows with left border instead of background */
                    .row-absent  td:first-child { border-left: 3px solid #dc2626; }
                    .row-missing td:first-child { border-left: 3px solid #a21caf; }

                    .employee-block {
                        border: 1px solid #cbd5e1;
                        border-radius: 0;
                        margin-bottom: 14px;
                        /* Avoid splitting an employee block across pages when possible */
                        break-inside: avoid;
                    }

                    /* One-per-page mode: force page break after each employee */
                    .one-per-page .employee-block {
                        break-after: page;
                    }
                    .one-per-page .employee-block:last-child {
                        break-after: avoid;
                    }

                    .emp-header {
                        /* Print-safe: dark background with white text prints fine */
                        -webkit-print-color-adjust: exact;
                        print-color-adjust: exact;
                    }

                    .att-table { font-size: 9.5px; }
                    .att-table th { font-size: 8px; padding: 4px 5px; }
                    .att-table td { padding: 3px 5px; }

                    .summary-row td { font-size: 9px; }
                    .summary-stats span {
                        -webkit-print-color-adjust: exact;
                        print-color-adjust: exact;
                    }                }
            `}</style>

            {/* Toolbar */}
            <div className="toolbar no-print">
                <div>
                    <div className="toolbar-title">Attendance Report</div>
                    <div className="toolbar-sub">
                        {fmtDateLong(dateFrom)} – {fmtDateLong(dateTo)} · {reportData.length} employee{reportData.length !== 1 ? 's' : ''}
                    </div>
                </div>
                <div className="toolbar-actions">
                    {/* One-per-page toggle */}
                    <label className="toggle-label">
                        <input
                            type="checkbox"
                            checked={onePerPage}
                            onChange={e => setOnePerPage(e.target.checked)}
                            style={{ accentColor: '#1e3a8a' }}
                        />
                        One employee per page
                    </label>
                    <button className="btn" onClick={() => router.get(route('admin.attendance.report'))}>← Back</button>
                    <button className="btn btn-primary" onClick={() => window.print()}>
                        <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                        </svg>
                        Print / Save PDF
                    </button>
                </div>
            </div>

            {/* Report */}
            <div className="report-spacer" />
            <div className={`report-wrap ${onePerPage ? 'one-per-page' : ''}`}>
                <div className="report-title">
                    Attendance Report
                    <span>{fmtDateLong(dateFrom)} – {fmtDateLong(dateTo)}</span>
                </div>

                {reportData.length === 0 ? (
                    <p style={{ textAlign: 'center', color: '#94a3b8', padding: '40px 0' }}>
                        No attendance records found for the selected range.
                    </p>
                ) : (
                    reportData.map((data) => (
                        <EmployeeBlock
                            key={data.employee.id}
                            data={data}
                            dateFrom={dateFrom}
                            dateTo={dateTo}
                        />
                    ))
                )}
            </div>
        </>
    );
}
