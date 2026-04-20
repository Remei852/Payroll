import { Head } from '@inertiajs/react';

const php = (n) => new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP', minimumFractionDigits: 2 }).format(n ?? 0);
const fmtDate = (d) => new Date(d).toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' });
const fmtNum = (n) => parseFloat(n).toFixed(2);

function PayslipCard({ payroll }) {
    const earnings  = payroll.items.filter(i => i.type === 'EARNING');
    const deductions = payroll.items.filter(i => i.type === 'DEDUCTION');
    const penalties  = deductions.filter(i => i.category.includes('Penalty'));
    const caItems    = deductions.filter(i => i.category === 'Cash Advance');
    const contribs   = deductions.filter(i => !i.category.includes('Penalty') && i.category !== 'Cash Advance');
    const s = payroll.summary ?? {};

    return (
        <div className="payslip-card bg-white text-[9px] border border-slate-300 flex flex-col" style={{ padding: '8px' }}>
            {/* Header */}
            <div className="border-b-2 border-slate-400 pb-1 mb-1.5">
                <div className="flex items-baseline justify-between">
                    <span className="font-bold text-[11px] text-slate-900 tracking-wide">PAYSLIP</span>
                    <span className="text-slate-500">{fmtDate(payroll.payroll_period.start_date)} – {fmtDate(payroll.payroll_period.end_date)}</span>
                </div>
            </div>

            {/* Employee info */}
            <div className="grid grid-cols-2 gap-x-3 mb-1.5 leading-[1.5]">
                <div><span className="font-semibold text-slate-600">Name: </span>{payroll.employee.first_name} {payroll.employee.last_name}</div>
                <div><span className="font-semibold text-slate-600">Dept: </span>{payroll.employee.department?.name}</div>
                <div><span className="font-semibold text-slate-600">Emp No: </span>{payroll.employee.employee_code}</div>
                <div><span className="font-semibold text-slate-600">Position: </span>{payroll.employee.position || 'N/A'}</div>
            </div>

            {/* Earnings & Deductions */}
            <table className="w-full mb-1.5" style={{ borderCollapse: 'collapse' }}>
                <thead>
                    <tr style={{ borderBottom: '1.5px solid #94a3b8' }}>
                        <th className="text-left font-semibold text-slate-700 py-0.5">Description</th>
                        <th className="text-right font-semibold text-slate-700 py-0.5">Amount</th>
                    </tr>
                </thead>
                <tbody>
                    {earnings.map(i => (
                        <tr key={i.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                            <td className="py-px text-slate-700">{i.category}</td>
                            <td className="py-px text-right text-slate-900">{php(i.amount)}</td>
                        </tr>
                    ))}
                    {penalties.map(i => (
                        <tr key={i.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                            <td className="py-px text-slate-700">{i.category}</td>
                            <td className="py-px text-right text-red-600">−{php(i.amount)}</td>
                        </tr>
                    ))}
                    {contribs.map(i => (
                        <tr key={i.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                            <td className="py-px text-slate-700">{i.category}</td>
                            <td className="py-px text-right text-red-600">−{php(i.amount)}</td>
                        </tr>
                    ))}
                    {caItems.length > 0 ? caItems.map(i => (
                        <tr key={i.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                            <td className="py-px text-slate-700">Cash Advance</td>
                            <td className="py-px text-right text-red-600">−{php(i.amount)}</td>
                        </tr>
                    )) : (
                        <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                            <td className="py-px text-slate-400 italic">Cash Advance</td>
                            <td className="py-px text-right text-slate-400">—</td>
                        </tr>
                    )}
                    <tr style={{ borderTop: '1.5px solid #94a3b8', background: '#f8fafc' }}>
                        <td className="py-1 font-bold text-slate-900">Net Pay</td>
                        <td className="py-1 text-right font-bold text-green-700">{php(payroll.net_pay)}</td>
                    </tr>
                </tbody>
            </table>

            {/* Attendance summary */}
            <div className="grid grid-cols-3 gap-x-2 rounded bg-slate-50 px-2 py-1 leading-[1.6]" style={{ border: '1px solid #e2e8f0' }}>
                <div><span className="text-slate-500">Days: </span><span className="font-medium">{fmtNum(s.days_worked)}</span></div>
                <div><span className="text-slate-500">Late: </span><span className="font-medium text-orange-600">{s.late_minutes}m</span></div>
                <div><span className="text-slate-500">OT: </span><span className="font-medium text-green-600">{fmtNum(s.overtime_hours)}h</span></div>
                <div><span className="text-slate-500">Gross: </span><span className="font-medium">{php(payroll.gross_pay)}</span></div>
                <div><span className="text-slate-500">Deduct: </span><span className="font-medium text-red-600">{php(payroll.total_deductions)}</span></div>
                <div><span className="text-slate-500">Rate: </span><span className="font-medium">{php(s.daily_rate)}</span></div>
            </div>

            {/* Signature line */}
            <div className="mt-auto pt-2 flex justify-between items-end">
                <div className="text-slate-400 italic" style={{ fontSize: '7px' }}>Computer-generated. No signature required.</div>
                <div className="text-center" style={{ minWidth: '90px' }}>
                    <div style={{ borderTop: '1px solid #94a3b8', paddingTop: '2px', fontSize: '7px', color: '#94a3b8' }}>Received by</div>
                </div>
            </div>
        </div>
    );
}

// Group payrolls into chunks of 4
function chunkArray(arr, size) {
    const chunks = [];
    for (let i = 0; i < arr.length; i += size) chunks.push(arr.slice(i, i + size));
    return chunks;
}

export default function PrintPeriod({ period, payrolls }) {
    const pages = chunkArray(payrolls, 4);

    return (
        <>
            <Head title={`Print Payslips — ${period.department?.name}`} />

            {/* Print button — hidden when printing */}
            <div className="print:hidden fixed top-4 right-4 z-50 flex items-center gap-2">
                <span className="text-sm text-slate-600">{payrolls.length} payslip{payrolls.length !== 1 ? 's' : ''}</span>
                <button onClick={() => window.print()}
                    className="inline-flex items-center gap-2 rounded-lg bg-[#1E3A8A] px-4 py-2 text-sm font-medium text-white hover:bg-[#1E3A8A]/90 shadow-lg transition">
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                    </svg>
                    Print All
                </button>
                <button onClick={() => window.history.back()}
                    className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 transition">
                    ← Back
                </button>
            </div>

            {/* Print styles */}
            <style>{`
                @media print {
                    @page {
                        size: A4 landscape;
                        margin: 0.6cm;
                    }
                    body { background: white !important; }
                    .print-page {
                        page-break-after: always;
                        break-after: page;
                    }
                    .print-page:last-child {
                        page-break-after: avoid;
                        break-after: avoid;
                    }
                }
                body { background: #e5e7eb; }
                .print-page {
                    width: 277mm;
                    height: 190mm;
                    background: white;
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    grid-template-rows: 1fr 1fr;
                    gap: 6px;
                    padding: 6px;
                    box-sizing: border-box;
                    margin: 0 auto 12px;
                }
                .payslip-card {
                    overflow: hidden;
                    box-sizing: border-box;
                }
            `}</style>

            {/* Pages — each page holds up to 4 payslips in a 2×2 grid */}
            <div>
                {pages.map((group, pi) => (
                    <div key={pi} className="print-page">
                        {group.map(p => <PayslipCard key={p.id} payroll={p} />)}
                    </div>
                ))}
            </div>
        </>
    );
}
