import { Head } from '@inertiajs/react';

const php = (n) => new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP', minimumFractionDigits: 2 }).format(n ?? 0);
const fmtDate = (d) => new Date(d).toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' });
const fmtNum = (n) => parseFloat(n).toFixed(2);

function PayslipPage({ payroll }) {
    const earnings  = payroll.items.filter(i => i.type === 'EARNING');
    const deductions = payroll.items.filter(i => i.type === 'DEDUCTION');
    const penalties  = deductions.filter(i => i.category.includes('Penalty'));
    const caItems    = deductions.filter(i => i.category === 'Cash Advance');
    const contribs   = deductions.filter(i => !i.category.includes('Penalty') && i.category !== 'Cash Advance');
    const s = payroll.summary ?? {};

    return (
        <div className="payslip-page bg-white p-8 text-sm" style={{ pageBreakAfter: 'always' }}>
            {/* Header */}
            <div className="mb-5 border-b-2 border-slate-300 pb-4">
                <h1 className="text-xl font-bold text-slate-900">PAYSLIP</h1>
                <p className="mt-0.5 text-xs text-slate-500">
                    {payroll.employee.first_name} {payroll.employee.last_name} &mdash;{' '}
                    {new Date(payroll.payroll_period.start_date).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                </p>
            </div>

            {/* Employee info */}
            <div className="mb-4 grid grid-cols-2 gap-4 text-xs">
                <div className="space-y-1">
                    <div><span className="font-semibold text-slate-600">Name: </span>{payroll.employee.first_name} {payroll.employee.last_name}</div>
                    <div><span className="font-semibold text-slate-600">Employee No: </span>{payroll.employee.employee_code}</div>
                    <div><span className="font-semibold text-slate-600">Position: </span>{payroll.employee.position || 'N/A'}</div>
                </div>
                <div className="space-y-1">
                    <div><span className="font-semibold text-slate-600">Department: </span>{payroll.employee.department?.name}</div>
                    <div><span className="font-semibold text-slate-600">Period: </span>{fmtDate(payroll.payroll_period.start_date)} – {fmtDate(payroll.payroll_period.end_date)}</div>
                    <div><span className="font-semibold text-slate-600">Payroll Date: </span>{fmtDate(payroll.payroll_period.payroll_date)}</div>
                </div>
            </div>

            {/* Earnings & Deductions */}
            <table className="w-full text-xs mb-4">
                <thead>
                    <tr className="border-b-2 border-slate-300">
                        <th className="py-1.5 text-left font-semibold text-slate-700">Description</th>
                        <th className="py-1.5 text-right font-semibold text-slate-700">Amount</th>
                    </tr>
                </thead>
                <tbody>
                    {earnings.map(i => (
                        <tr key={i.id} className="border-b border-slate-100">
                            <td className="py-1 text-slate-700">{i.category}</td>
                            <td className="py-1 text-right text-slate-900">{php(i.amount)}</td>
                        </tr>
                    ))}
                    {penalties.map(i => (
                        <tr key={i.id} className="border-b border-slate-100">
                            <td className="py-1 text-slate-700">{i.category}</td>
                            <td className="py-1 text-right text-red-600">−{php(i.amount)}</td>
                        </tr>
                    ))}
                    {contribs.map(i => (
                        <tr key={i.id} className="border-b border-slate-100">
                            <td className="py-1 text-slate-700">{i.category}</td>
                            <td className="py-1 text-right text-red-600">−{php(i.amount)}</td>
                        </tr>
                    ))}
                    {caItems.length > 0 ? caItems.map(i => (
                        <tr key={i.id} className="border-b border-slate-100">
                            <td className="py-1 text-slate-700">Cash Advance</td>
                            <td className="py-1 text-right text-red-600">−{php(i.amount)}</td>
                        </tr>
                    )) : (
                        <tr className="border-b border-slate-100">
                            <td className="py-1 text-slate-400 italic">Cash Advance</td>
                            <td className="py-1 text-right text-slate-400">—</td>
                        </tr>
                    )}
                    <tr className="border-t-2 border-slate-300 bg-slate-50">
                        <td className="py-2 font-bold text-slate-900">Net Pay</td>
                        <td className="py-2 text-right font-bold text-green-700">{php(payroll.net_pay)}</td>
                    </tr>
                </tbody>
            </table>

            {/* Attendance summary */}
            <div className="grid grid-cols-3 gap-3 rounded-lg bg-slate-50 p-3 text-xs">
                <div><span className="text-slate-500">Days Worked: </span><span className="font-medium">{fmtNum(s.days_worked)}</span></div>
                <div><span className="text-slate-500">Late: </span><span className="font-medium text-orange-600">{s.late_minutes} min</span></div>
                <div><span className="text-slate-500">OT: </span><span className="font-medium text-green-600">{fmtNum(s.overtime_hours)} hrs</span></div>
                <div><span className="text-slate-500">Gross Pay: </span><span className="font-medium">{php(payroll.gross_pay)}</span></div>
                <div><span className="text-slate-500">Deductions: </span><span className="font-medium text-red-600">{php(payroll.total_deductions)}</span></div>
                <div><span className="text-slate-500">Daily Rate: </span><span className="font-medium">{php(s.daily_rate)}</span></div>
            </div>

            <p className="mt-4 text-center text-xs text-slate-400">This is a computer-generated payslip. No signature required.</p>
        </div>
    );
}

export default function PrintPeriod({ period, payrolls }) {
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
                    @page { margin: 1cm; size: A4; }
                    .payslip-page { page-break-after: always; }
                    .payslip-page:last-child { page-break-after: avoid; }
                }
                body { background: white; }
            `}</style>

            {/* Payslips */}
            <div className="print:block">
                {payrolls.map(p => <PayslipPage key={p.id} payroll={p} />)}
            </div>
        </>
    );
}
