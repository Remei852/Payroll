import { useState } from 'react';
import AdminLayout from '@/Layouts/AdminLayout';
import { Head, router } from '@inertiajs/react';
import axios from 'axios';

export default function PayrollGenerateOverview({ payrollPeriod, employees, payrolls }) {
    const [selectedEmployees, setSelectedEmployees] = useState(new Set());
    const [cashAdvances, setCashAdvances] = useState({});
    const [newAdvance, setNewAdvance] = useState({ employee_id: '', amount: '', reason: '' });
    const [successMessage, setSuccessMessage] = useState('');
    const [errorMessage, setErrorMessage] = useState('');
    const [isGeneratingPayslips, setIsGeneratingPayslips] = useState(false);

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('en-PH', {
            style: 'currency',
            currency: 'PHP',
        }).format(amount);
    };

    const handleAddCashAdvance = async () => {
        if (!newAdvance.employee_id || !newAdvance.amount) {
            setErrorMessage('Please select employee and enter amount');
            return;
        }

        try {
            await axios.post(`/api/employees/${newAdvance.employee_id}/cash-advances`, {
                amount: parseFloat(newAdvance.amount),
                reason: newAdvance.reason || null,
            });
            setSuccessMessage('Cash advance added successfully');
            setTimeout(() => setSuccessMessage(''), 3000);
            setNewAdvance({ employee_id: '', amount: '', reason: '' });
            
            // Refresh cash advances
            fetchCashAdvances();
        } catch (error) {
            const message = error.response?.data?.message || 'Error adding cash advance';
            setErrorMessage(message);
        }
    };

    const fetchCashAdvances = async () => {
        try {
            const advances = {};
            for (const payroll of payrolls) {
                const response = await axios.get(`/api/employees/${payroll.employee_id}/cash-advances`);
                advances[payroll.employee_id] = response.data;
            }
            setCashAdvances(advances);
        } catch (error) {
            console.error('Error fetching cash advances:', error);
        }
    };

    const handleApplyDeduction = async (employeeId, advanceId) => {
        const payroll = payrolls.find(p => p.employee_id === employeeId);
        if (!payroll) return;

        try {
            await axios.post(`/api/payroll/${payroll.id}/apply-cash-advance`, {
                cash_advance_id: advanceId,
            });
            setSuccessMessage('Deduction applied successfully');
            setTimeout(() => setSuccessMessage(''), 3000);
            fetchCashAdvances();
        } catch (error) {
            const message = error.response?.data?.message || 'Error applying deduction';
            setErrorMessage(message);
        }
    };

    const handleRemoveAdvance = async (advanceId) => {
        if (!confirm('Are you sure you want to remove this cash advance?')) return;

        try {
            await axios.delete(`/api/cash-advances/${advanceId}`);
            setSuccessMessage('Cash advance removed successfully');
            setTimeout(() => setSuccessMessage(''), 3000);
            fetchCashAdvances();
        } catch (error) {
            const message = error.response?.data?.message || 'Error removing cash advance';
            setErrorMessage(message);
        }
    };

    const handleGeneratePayslips = async () => {
        if (payrolls.length === 0) {
            setErrorMessage('No payrolls to generate');
            return;
        }

        setIsGeneratingPayslips(true);
        try {
            // Redirect to payroll period view to generate payslips
            router.visit(route('admin.payroll.period', payrollPeriod.id));
        } catch (error) {
            setErrorMessage('Error generating payslips');
            setIsGeneratingPayslips(false);
        }
    };

    return (
        <AdminLayout title="Payroll Overview">
            <Head title="Payroll Overview" />

            <div className="mb-8">
                <h1 className="text-3xl font-bold text-slate-900">Payroll Overview</h1>
                <p className="mt-2 text-slate-600">
                    Period: {new Date(payrollPeriod.start_date).toLocaleDateString()} - {new Date(payrollPeriod.end_date).toLocaleDateString()}
                </p>
            </div>

            {/* Messages */}
            {successMessage && (
                <div className="mb-6 rounded-lg border border-green-200 bg-green-50 p-4 text-green-800">
                    {successMessage}
                </div>
            )}
            {errorMessage && (
                <div className="mb-6 rounded-lg border border-red-200 bg-red-50 p-4 text-red-800">
                    {errorMessage}
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mb-8">
                {/* Stats */}
                <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
                    <p className="text-sm font-semibold text-slate-600 uppercase">Total Employees</p>
                    <p className="mt-2 text-3xl font-bold text-slate-900">{payrolls.length}</p>
                </div>
                <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
                    <p className="text-sm font-semibold text-slate-600 uppercase">Total Gross Pay</p>
                    <p className="mt-2 text-3xl font-bold text-slate-900">
                        {formatCurrency(payrolls.reduce((sum, p) => sum + parseFloat(p.gross_pay), 0))}
                    </p>
                </div>
                <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
                    <p className="text-sm font-semibold text-slate-600 uppercase">Total Deductions</p>
                    <p className="mt-2 text-3xl font-bold text-red-600">
                        {formatCurrency(payrolls.reduce((sum, p) => sum + parseFloat(p.total_deductions), 0))}
                    </p>
                </div>
                <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
                    <p className="text-sm font-semibold text-slate-600 uppercase">Total Net Pay</p>
                    <p className="mt-2 text-3xl font-bold text-green-600">
                        {formatCurrency(payrolls.reduce((sum, p) => sum + parseFloat(p.net_pay), 0))}
                    </p>
                </div>
            </div>

            {/* Add Cash Advance Form */}
            <div className="mb-8 rounded-lg border border-slate-200 bg-white p-8 shadow-md">
                <h2 className="text-2xl font-bold text-slate-900 mb-6">Add Cash Advance</h2>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div>
                        <label className="block text-sm font-semibold text-slate-900 mb-2">
                            Employee <span className="text-red-500">*</span>
                        </label>
                        <select
                            value={newAdvance.employee_id}
                            onChange={(e) => setNewAdvance({...newAdvance, employee_id: e.target.value})}
                            className="w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-sm transition focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                        >
                            <option value="">-- Select Employee --</option>
                            {payrolls.map(payroll => (
                                <option key={payroll.employee_id} value={payroll.employee_id}>
                                    {payroll.employee.first_name} {payroll.employee.last_name}
                                </option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-semibold text-slate-900 mb-2">
                            Amount <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="number"
                            step="0.01"
                            min="0.01"
                            placeholder="Enter amount"
                            value={newAdvance.amount}
                            onChange={(e) => setNewAdvance({...newAdvance, amount: e.target.value})}
                            className="w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-sm transition focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-semibold text-slate-900 mb-2">
                            Reason
                        </label>
                        <input
                            type="text"
                            placeholder="Enter reason"
                            value={newAdvance.reason}
                            onChange={(e) => setNewAdvance({...newAdvance, reason: e.target.value})}
                            className="w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-sm transition focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                        />
                    </div>
                    <div className="flex items-end">
                        <button
                            type="button"
                            onClick={handleAddCashAdvance}
                            className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-6 py-3 text-sm font-semibold text-white shadow-lg transition hover:bg-primary/90"
                        >
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                            </svg>
                            Add
                        </button>
                    </div>
                </div>
            </div>

            {/* Employees Table */}
            <div className="mb-8 rounded-lg border border-slate-200 bg-white shadow-md overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b border-slate-200 bg-slate-50">
                                <th className="px-6 py-4 text-left font-semibold text-slate-900">Employee</th>
                                <th className="px-6 py-4 text-right font-semibold text-slate-900">Gross Pay</th>
                                <th className="px-6 py-4 text-right font-semibold text-slate-900">Deductions</th>
                                <th className="px-6 py-4 text-right font-semibold text-slate-900">Net Pay</th>
                                <th className="px-6 py-4 text-left font-semibold text-slate-900">Cash Advances</th>
                                <th className="px-6 py-4 text-left font-semibold text-slate-900">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {payrolls.map((payroll) => {
                                const advances = cashAdvances[payroll.employee_id] || { deductible: [], remaining: [], totalRemaining: 0 };
                                return (
                                    <tr key={payroll.id} className="border-b border-slate-200 hover:bg-slate-50">
                                        <td className="px-6 py-4 text-slate-900 font-medium">
                                            {payroll.employee.first_name} {payroll.employee.last_name}
                                        </td>
                                        <td className="px-6 py-4 text-right text-slate-900">
                                            {formatCurrency(payroll.gross_pay)}
                                        </td>
                                        <td className="px-6 py-4 text-right text-slate-900">
                                            {formatCurrency(payroll.total_deductions)}
                                        </td>
                                        <td className="px-6 py-4 text-right font-semibold text-green-600">
                                            {formatCurrency(payroll.net_pay)}
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="space-y-2">
                                                {advances.deductible.length > 0 && (
                                                    <div className="text-xs">
                                                        <p className="font-semibold text-slate-700">Available:</p>
                                                        {advances.deductible.map(adv => (
                                                            <div key={adv.id} className="flex items-center justify-between gap-2 mt-1">
                                                                <span className="text-slate-600">{formatCurrency(adv.amount)}</span>
                                                                <button
                                                                    type="button"
                                                                    onClick={() => handleApplyDeduction(payroll.employee_id, adv.id)}
                                                                    className="rounded bg-green-100 px-2 py-1 text-xs font-semibold text-green-700 transition hover:bg-green-200"
                                                                >
                                                                    Apply
                                                                </button>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                                {advances.totalRemaining > 0 && (
                                                    <div className="text-xs bg-amber-50 p-2 rounded border border-amber-200">
                                                        <p className="font-semibold text-amber-900">Remaining: {formatCurrency(advances.totalRemaining)}</p>
                                                    </div>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <button
                                                type="button"
                                                onClick={() => router.visit(route('admin.payroll.payslip', payroll.id))}
                                                className="inline-flex items-center gap-1 rounded bg-blue-100 px-3 py-2 text-xs font-semibold text-blue-700 transition hover:bg-blue-200"
                                            >
                                                <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                                </svg>
                                                View Payslip
                                            </button>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-3">
                <button
                    type="button"
                    onClick={() => router.visit(route('admin.payroll.index'))}
                    className="rounded-lg border border-slate-300 bg-white px-6 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                >
                    Back
                </button>
                <button
                    type="button"
                    onClick={handleGeneratePayslips}
                    disabled={isGeneratingPayslips}
                    className="inline-flex items-center gap-2 rounded-lg bg-primary px-6 py-3 text-sm font-semibold text-white shadow-lg transition hover:bg-primary/90 disabled:opacity-50"
                >
                    {isGeneratingPayslips ? (
                        <>
                            <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                            </svg>
                            Generating...
                        </>
                    ) : (
                        <>
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                            </svg>
                            View All Payslips
                        </>
                    )}
                </button>
            </div>
        </AdminLayout>
    );
}
