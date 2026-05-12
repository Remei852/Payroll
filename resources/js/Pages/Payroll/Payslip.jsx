import AdminLayout from '@/Layouts/AdminLayout';
import { Head, Link } from '@inertiajs/react';

export default function Payslip({ payroll, summary }) {
    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('en-PH', {
            style: 'currency',
            currency: 'PHP',
            minimumFractionDigits: 2,
        }).format(amount);
    };

    const formatNumber = (num) => {
        return parseFloat(num).toFixed(2);
    };

    const earnings = payroll.items.filter(item => item.type === 'EARNING');
    const deductions = payroll.items.filter(item => item.type === 'DEDUCTION');
    
    // Separate deductions into categories
    const penalties      = deductions.filter(item => item.category.includes('Penalty'));
    const cashAdvanceDeductions = deductions.filter(item => item.category === 'Cash Advance');
    const contributions  = deductions.filter(item => !item.category.includes('Penalty') && item.category !== 'Cash Advance');

    const totalCashAdvanceDeductions = cashAdvanceDeductions.reduce((sum, item) => sum + parseFloat(item.amount), 0);

    return (
        <AdminLayout title="Employee Payslip">
            <Head title="Employee Payslip" />

            <div className="mb-6 print:hidden">
                <div className="flex items-start justify-between gap-4">
                    <div>
                        <h2 className="text-lg font-semibold text-[#334155]">Employee Payslip</h2>
                        <p className="mt-1 text-sm text-slate-500">Detailed salary breakdown</p>
                    </div>
                    <Link
                        href={route('admin.payroll.period', payroll.payroll_period_id)}
                        onClick={(e) => {
                            if (typeof window !== 'undefined' && window.history.length > 1) {
                                e.preventDefault();
                                window.history.back();
                            }
                        }}
                        className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:border-[#1E3A8A] hover:text-[#1E3A8A] transition"
                    >
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                        </svg>
                        Back
                    </Link>
                </div>
            </div>

            {/* Info Banner - Payslip Information */}
            <div className="mb-6 rounded-lg border border-blue-200 bg-blue-50 p-4 print:hidden">
                <div className="flex items-start gap-3">
                    <svg className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <div>
                        <p className="text-sm font-semibold text-blue-900">Payslip Information</p>
                        <p className="text-xs text-blue-700 mt-1">
                            This payslip shows your complete salary breakdown for the period. Please review all details carefully.
                        </p>
                    </div>
                </div>
            </div>

            {/* Payslip Content - Professional Format */}
            <div className="mx-auto max-w-4xl bg-white p-8 shadow-sm print:shadow-none print:p-0">
                {/* Header */}
                <div className="mb-6 border-b-2 border-slate-300 pb-4">
                    <h1 className="text-2xl font-bold text-slate-900">PAYSLIP</h1>
                    <p className="mt-1 text-sm text-slate-600">
                        Salary Slip of {payroll.employee.first_name} {payroll.employee.last_name} for {new Date(payroll.payroll_period.start_date).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                    </p>
                </div>

                {/* Employee Information - Two Columns */}
                <div className="mb-6 grid grid-cols-2 gap-6 text-sm">
                    <div>
                        <div className="mb-3">
                            <span className="font-semibold text-slate-700">Name</span>
                            <div className="text-slate-900">{payroll.employee.first_name} {payroll.employee.last_name}</div>
                        </div>
                        <div>
                            <span className="font-semibold text-slate-700">Employee Number</span>
                            <div className="text-slate-900">{payroll.employee.employee_code}</div>
                        </div>
                    </div>
                    <div>
                        <div className="mb-3">
                            <span className="font-semibold text-slate-700">Job Position</span>
                            <div className="text-slate-900">{payroll.employee.position || 'N/A'}</div>
                        </div>
                        <div>
                            <span className="font-semibold text-slate-700">Department</span>
                            <div className="text-slate-900">{payroll.employee.department.name}</div>
                        </div>
                    </div>
                </div>

                {/* Period Information */}
                <div className="mb-6 grid grid-cols-3 gap-6 border-b border-slate-200 pb-4 text-sm">
                    <div>
                        <span className="font-semibold text-slate-700">Date From</span>
                        <div className="text-slate-900">
                            {new Date(payroll.payroll_period.start_date).toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' })}
                        </div>
                    </div>
                    <div>
                        <span className="font-semibold text-slate-700">Date To</span>
                        <div className="text-slate-900">
                            {new Date(payroll.payroll_period.end_date).toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' })}
                        </div>
                    </div>
                    <div>
                        <span className="font-semibold text-slate-700">Payroll Date</span>
                        <div className="text-slate-900">
                            {new Date(payroll.payroll_period.payroll_date).toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' })}
                        </div>
                    </div>
                </div>

                {/* Earnings and Deductions Table */}
                <div className="mb-6">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b-2 border-slate-300">
                                <th className="py-2 text-left font-semibold text-slate-700">Name</th>
                                <th className="py-2 text-right font-semibold text-slate-700">Amount</th>
                                <th className="py-2 text-right font-semibold text-slate-700">Total</th>
                            </tr>
                        </thead>
                        <tbody>
                            {/* Earnings */}
                            {earnings.map((item) => (
                                <tr key={item.id} className="border-b border-slate-200">
                                    <td className="py-2 text-slate-700">{item.category}</td>
                                    <td className="py-2 text-right text-slate-900">{formatCurrency(item.amount)}</td>
                                    <td className="py-2 text-right text-slate-900">{formatCurrency(item.amount)}</td>
                                </tr>
                            ))}

                            {/* Unpaid Leaves */}
                            {summary.undertime_hours > 0 && (
                                <tr className="border-b border-slate-200">
                                    <td className="py-2 text-slate-700">Unpaid Leaves</td>
                                    <td className="py-2 text-right text-slate-900">-{formatCurrency(summary.undertime_hours * summary.hourly_rate)}</td>
                                    <td className="py-2 text-right text-slate-900">-{formatCurrency(summary.undertime_hours * summary.hourly_rate)}</td>
                                </tr>
                            )}

                            {/* Late / Undertime */}
                            {penalties.length > 0 && penalties.map((item) => (
                                <tr key={item.id} className="border-b border-slate-200">
                                    <td className="py-2 text-slate-700">{item.category}</td>
                                    <td className="py-2 text-right text-slate-900">-{formatCurrency(item.amount)}</td>
                                    <td className="py-2 text-right text-slate-900">-{formatCurrency(item.amount)}</td>
                                </tr>
                            ))}

                            {/* Contributions */}
                            {contributions.length > 0 && contributions.map((item) => (
                                <tr key={item.id} className="border-b border-slate-200">
                                    <td className="py-2 text-slate-700">{item.category}</td>
                                    <td className="py-2 text-right text-slate-900">-{formatCurrency(item.amount)}</td>
                                    <td className="py-2 text-right text-slate-900">-{formatCurrency(item.amount)}</td>
                                </tr>
                            ))}

                            {/* Cash Advance Deductions */}
                            {cashAdvanceDeductions.length > 0 ? cashAdvanceDeductions.map((item) => (
                                <tr key={item.id} className="border-b border-slate-200">
                                    <td className="py-2 text-slate-700">Cash Advance</td>
                                    <td className="py-2 text-right text-red-600">-{formatCurrency(item.amount)}</td>
                                    <td className="py-2 text-right text-red-600">-{formatCurrency(item.amount)}</td>
                                </tr>
                            )) : (
                                <tr className="border-b border-slate-200">
                                    <td className="py-2 text-slate-400 italic">Cash Advance</td>
                                    <td className="py-2 text-right text-slate-400">—</td>
                                    <td className="py-2 text-right text-slate-400">—</td>
                                </tr>
                            )}

                            {/* Net Salary */}
                            <tr className="border-t-2 border-slate-300 bg-slate-50">
                                <td className="py-3 font-bold text-slate-900">Net Salary</td>
                                <td className="py-3 text-right font-bold text-slate-900">{formatCurrency(payroll.net_pay)}</td>
                                <td className="py-3 text-right font-bold text-slate-900">{formatCurrency(payroll.net_pay)}</td>
                            </tr>
                        </tbody>
                    </table>
                </div>

                {/* Attendance Summary */}
                <div className="mb-6 border-t-2 border-slate-300 pt-4">
                    <h3 className="mb-3 font-semibold text-slate-700">Attendance Summary</h3>
                    <div className="grid grid-cols-3 gap-4 text-sm">
                        <div>
                            <span className="text-slate-600">Valid Hours</span>
                            <div className="font-semibold text-slate-900">{formatNumber(summary.hours_worked)}</div>
                        </div>
                        <div>
                            <span className="text-slate-600">Valid Overtime Hours</span>
                            <div className="font-semibold text-slate-900">{formatNumber(summary.overtime_hours)}</div>
                        </div>
                        <div>
                            <span className="text-slate-600">Tardy Hours</span>
                            <div className="font-semibold text-slate-900">{formatNumber(summary.late_hours)}</div>
                        </div>
                    </div>
                </div>

                {/* Detailed Breakdown */}
                <div className="mb-6 rounded-lg bg-slate-50 p-4 text-sm">
                    <h3 className="mb-3 font-semibold text-slate-700">Detailed Breakdown</h3>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <div className="mb-2 flex justify-between">
                                <span className="text-slate-600">Days Worked:</span>
                                <span className="font-medium text-slate-900">{formatNumber(summary.days_worked)} days</span>
                            </div>
                            <div className="mb-2 flex justify-between">
                                <span className="text-slate-600">Hours Worked:</span>
                                <span className="font-medium text-slate-900">{formatNumber(summary.hours_worked)} hrs</span>
                            </div>
                            <div className="mb-2 flex justify-between">
                                <span className="text-slate-600">Overtime Hours:</span>
                                <span className="font-medium text-green-600">{formatNumber(summary.overtime_hours)} hrs</span>
                            </div>
                        </div>
                        <div>
                            <div className="mb-2 flex justify-between">
                                <span className="text-slate-600">Late Minutes:</span>
                                <span className="font-medium text-red-600">{summary.late_minutes} min</span>
                            </div>
                            <div className="mb-2 flex justify-between">
                                <span className="text-slate-600">Undertime Minutes:</span>
                                <span className="font-medium text-red-600">{summary.undertime_minutes} min</span>
                            </div>
                            <div className="mb-2 flex justify-between">
                                <span className="text-slate-600">Daily Rate:</span>
                                <span className="font-medium text-slate-900">{formatCurrency(summary.daily_rate)}</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Summary Box */}
                <div className="mb-6 rounded-lg border-2 border-slate-300 bg-gradient-to-r from-blue-50 to-slate-50 p-4">
                    <div className="grid grid-cols-2 gap-6 text-sm">
                        <div>
                            <div className="mb-2 flex justify-between">
                                <span className="text-slate-600">Gross Pay:</span>
                                <span className="font-semibold text-slate-900">{formatCurrency(payroll.gross_pay)}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-slate-600">Total Deductions:</span>
                                <span className="font-semibold text-red-600">{formatCurrency(payroll.total_deductions)}</span>
                            </div>
                        </div>
                        <div className="border-l border-slate-300 pl-4">
                            <div className="flex justify-between text-base">
                                <span className="font-bold text-slate-900">Net Pay:</span>
                                <span className="rounded-lg bg-green-100 px-3 py-1 font-bold text-green-700">
                                    {formatCurrency(payroll.net_pay)}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="border-t border-slate-200 pt-4 text-center text-xs text-slate-500">
                    <p className="mt-1">Generated on {new Date(payroll.generated_at).toLocaleString('en-US')}</p>
                    <p className="mt-2 text-slate-400">Page 1 / 1</p>
                </div>
            </div>
        </AdminLayout>
    );
}
