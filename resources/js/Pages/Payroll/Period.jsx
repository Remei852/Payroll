import { useState, useEffect } from 'react';
import AdminLayout from '@/Layouts/AdminLayout';
import { Head, Link, router } from '@inertiajs/react';

export default function PayrollPeriod({ period }) {
    const [isProcessing, setIsProcessing] = useState(false);
    const [activeTab, setActiveTab] = useState('overview');
    const [expandedRow, setExpandedRow] = useState(null);
    const [cashAdvances, setCashAdvances] = useState({});
    const [newAdvance, setNewAdvance] = useState({ employee_id: '', amount: '', reason: '' });
    const [successMessage, setSuccessMessage] = useState('');
    const [errorMessage, setErrorMessage] = useState('');

    const handleFinalize = () => {
        if (!confirm('Are you sure you want to finalize this payroll period? This action cannot be undone.')) {
            return;
        }

        setIsProcessing(true);
        router.post(route('admin.payroll.finalize-period', period.id), {}, {
            onFinish: () => setIsProcessing(false),
        });
    };

    useEffect(() => {
        fetchCashAdvances();
    }, []);

    const fetchCashAdvances = async () => {
        try {
            const advances = {};
            for (const payroll of period.payrolls) {
                const response = await fetch(`/api/employees/${payroll.employee_id}/cash-advances`);
                const data = await response.json();
                advances[payroll.employee_id] = data;
            }
            setCashAdvances(advances);
        } catch (error) {
            console.error('Error fetching cash advances:', error);
        }
    };

    const handleAddCashAdvance = async () => {
        if (!newAdvance.employee_id || !newAdvance.amount) {
            setErrorMessage('Please select employee and enter amount');
            return;
        }

        try {
            const csrfToken = document.querySelector('meta[name="csrf-token"]')?.content;
            if (!csrfToken) {
                throw new Error('CSRF token not found');
            }

            const response = await fetch(`/api/employees/${newAdvance.employee_id}/cash-advances`, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': csrfToken,
                },
                body: JSON.stringify({
                    amount: parseFloat(newAdvance.amount),
                    reason: newAdvance.reason || null,
                }),
            });

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.message || `Failed to add cash advance (${response.status})`);
            }

            const data = await response.json();

            setSuccessMessage('Cash advance added successfully');
            setTimeout(() => setSuccessMessage(''), 3000);
            setNewAdvance({ employee_id: '', amount: '', reason: '' });
            fetchCashAdvances();
        } catch (error) {
            console.error('Error adding cash advance:', error);
            setErrorMessage(error.message || 'Error adding cash advance');
        }
    };

    const handleApplyDeduction = async (employeeId, advanceId) => {
        const payroll = period.payrolls.find(p => p.employee_id === employeeId);
        if (!payroll) return;

        try {
            const csrfToken = document.querySelector('meta[name="csrf-token"]')?.content;
            if (!csrfToken) {
                throw new Error('CSRF token not found');
            }

            const response = await fetch(`/api/payroll/${payroll.id}/apply-cash-advance`, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': csrfToken,
                },
                body: JSON.stringify({ cash_advance_id: advanceId }),
            });

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.message || `Failed to apply deduction (${response.status})`);
            }

            const data = await response.json();

            setSuccessMessage('Deduction applied successfully');
            setTimeout(() => setSuccessMessage(''), 3000);
            fetchCashAdvances();
        } catch (error) {
            console.error('Error applying deduction:', error);
            setErrorMessage(error.message || 'Error applying deduction');
        }
    };

    const handleRemoveAdvance = async (advanceId) => {
        if (!confirm('Are you sure you want to remove this cash advance?')) return;

        try {
            const csrfToken = document.querySelector('meta[name="csrf-token"]')?.content;
            if (!csrfToken) {
                throw new Error('CSRF token not found');
            }

            const response = await fetch(`/api/cash-advances/${advanceId}`, {
                method: 'DELETE',
                headers: { 
                    'X-CSRF-TOKEN': csrfToken,
                },
            });

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.message || `Failed to remove cash advance (${response.status})`);
            }

            const data = await response.json();

            setSuccessMessage('Cash advance removed successfully');
            setTimeout(() => setSuccessMessage(''), 3000);
            fetchCashAdvances();
        } catch (error) {
            console.error('Error removing cash advance:', error);
            setErrorMessage(error.message || 'Error removing cash advance');
        }
    };

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('en-PH', {
            style: 'currency',
            currency: 'PHP',
        }).format(amount);
    };

    const totalGrossPay = period.payrolls.reduce((sum, p) => sum + parseFloat(p.gross_pay), 0);
    const totalDeductions = period.payrolls.reduce((sum, p) => sum + parseFloat(p.total_deductions), 0);
    const totalNetPay = period.payrolls.reduce((sum, p) => sum + parseFloat(p.net_pay), 0);

    return (
        <AdminLayout title="Payroll Period Details">
            <Head title="Payroll Period Details" />

            {/* Header with Status */}
            <div className="mb-8">
                <div className="flex items-start justify-between">
                    <div>
                        <h1 className="text-3xl font-bold text-slate-900">
                            {period.department.name}
                        </h1>
                        <p className="mt-2 text-slate-600">
                            Payroll Period: {new Date(period.start_date).toLocaleDateString('en-US', {
                                month: 'short',
                                day: 'numeric',
                                year: 'numeric'
                            })} - {new Date(period.end_date).toLocaleDateString('en-US', {
                                month: 'short',
                                day: 'numeric',
                                year: 'numeric'
                            })}
                        </p>
                    </div>
                    <div className="flex items-center gap-3">
                        <span className={`inline-flex items-center rounded-full px-4 py-2 text-sm font-semibold ${
                            period.status === 'OPEN' ? 'bg-blue-100 text-blue-800' :
                            period.status === 'PROCESSING' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-green-100 text-green-800'
                        }`}>
                            {period.status}
                        </span>
                        {period.status === 'OPEN' && (
                            <button
                                onClick={handleFinalize}
                                disabled={isProcessing}
                                className="inline-flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white shadow-md transition hover:bg-green-700 disabled:opacity-50"
                            >
                                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                </svg>
                                {isProcessing ? 'Processing...' : 'Finalize Period'}
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* Tab Navigation */}
            <div className="mb-6 border-b border-slate-200">
                <nav className="flex gap-8">
                    <button
                        onClick={() => setActiveTab('overview')}
                        className={`pb-3 text-sm font-semibold transition ${
                            activeTab === 'overview'
                                ? 'border-b-2 border-primary text-primary'
                                : 'text-slate-600 hover:text-slate-900'
                        }`}
                    >
                        Overview
                    </button>
                    <button
                        onClick={() => setActiveTab('payrolls')}
                        className={`pb-3 text-sm font-semibold transition ${
                            activeTab === 'payrolls'
                                ? 'border-b-2 border-primary text-primary'
                                : 'text-slate-600 hover:text-slate-900'
                        }`}
                    >
                        Employee Payrolls
                    </button>
                    <button
                        onClick={() => setActiveTab('cash-advances')}
                        className={`pb-3 text-sm font-semibold transition ${
                            activeTab === 'cash-advances'
                                ? 'border-b-2 border-primary text-primary'
                                : 'text-slate-600 hover:text-slate-900'
                        }`}
                    >
                        Cash Advances
                    </button>
                </nav>
            </div>

            {/* Overview Tab */}
            {activeTab === 'overview' && (
                <div className="space-y-6">
                    {/* Summary Cards */}
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                        <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Total Gross Pay</p>
                                    <p className="mt-3 text-3xl font-bold text-slate-900">
                                        {formatCurrency(totalGrossPay)}
                                    </p>
                                    <p className="mt-2 text-xs text-slate-500">{period.payrolls.length} employees</p>
                                </div>
                                <div className="rounded-full bg-blue-100 p-4">
                                    <svg className="h-8 w-8 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                </div>
                            </div>
                        </div>
                        <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Total Deductions</p>
                                    <p className="mt-3 text-3xl font-bold text-red-600">
                                        {formatCurrency(totalDeductions)}
                                    </p>
                                    <p className="mt-2 text-xs text-slate-500">Penalties & Contributions</p>
                                </div>
                                <div className="rounded-full bg-red-100 p-4">
                                    <svg className="h-8 w-8 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 17H3v-2h10v2zm0-4H3v-2h10v2zm0-4H3V7h10v2z" />
                                    </svg>
                                </div>
                            </div>
                        </div>
                        <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Total Net Pay</p>
                                    <p className="mt-3 text-3xl font-bold text-green-600">
                                        {formatCurrency(totalNetPay)}
                                    </p>
                                    <p className="mt-2 text-xs text-slate-500">Amount to be paid</p>
                                </div>
                                <div className="rounded-full bg-green-100 p-4">
                                    <svg className="h-8 w-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Period Details Card */}
                    <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
                        <h3 className="text-sm font-semibold text-slate-900 mb-4">Period Details</h3>
                        <div className="grid grid-cols-2 gap-6 sm:grid-cols-4">
                            <div>
                                <p className="text-xs font-medium text-slate-600">Start Date</p>
                                <p className="mt-1 text-sm font-semibold text-slate-900">
                                    {new Date(period.start_date).toLocaleDateString('en-US', {
                                        month: 'short',
                                        day: 'numeric',
                                        year: 'numeric'
                                    })}
                                </p>
                            </div>
                            <div>
                                <p className="text-xs font-medium text-slate-600">End Date</p>
                                <p className="mt-1 text-sm font-semibold text-slate-900">
                                    {new Date(period.end_date).toLocaleDateString('en-US', {
                                        month: 'short',
                                        day: 'numeric',
                                        year: 'numeric'
                                    })}
                                </p>
                            </div>
                            <div>
                                <p className="text-xs font-medium text-slate-600">Payroll Date</p>
                                <p className="mt-1 text-sm font-semibold text-slate-900">
                                    {new Date(period.payroll_date).toLocaleDateString('en-US', {
                                        month: 'short',
                                        day: 'numeric',
                                        year: 'numeric'
                                    })}
                                </p>
                            </div>
                            <div>
                                <p className="text-xs font-medium text-slate-600">Status</p>
                                <p className="mt-1 text-sm font-semibold text-slate-900">{period.status}</p>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Payrolls Tab */}
            {activeTab === 'payrolls' && (
                <div className="rounded-lg border border-slate-200 bg-white shadow-sm overflow-hidden">
                    <div className="border-b border-slate-200 bg-slate-50 px-6 py-4">
                        <h3 className="text-sm font-semibold text-slate-900">Employee Payrolls</h3>
                        <p className="mt-1 text-xs text-slate-600">Click on an employee to view details or regenerate payroll</p>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-slate-200">
                            <thead className="bg-slate-50">
                                <tr>
                                    <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                                        Employee
                                    </th>
                                    <th scope="col" className="px-6 py-3 text-right text-xs font-semibold text-slate-700 uppercase tracking-wider">
                                        Gross Pay
                                    </th>
                                    <th scope="col" className="px-6 py-3 text-right text-xs font-semibold text-slate-700 uppercase tracking-wider">
                                        Deductions
                                    </th>
                                    <th scope="col" className="px-6 py-3 text-right text-xs font-semibold text-slate-700 uppercase tracking-wider">
                                        Net Pay
                                    </th>
                                    <th scope="col" className="px-6 py-3 text-center text-xs font-semibold text-slate-700 uppercase tracking-wider">
                                        Status
                                    </th>
                                    <th scope="col" className="px-6 py-3 text-center text-xs font-semibold text-slate-700 uppercase tracking-wider">
                                        Actions
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-200 bg-white">
                                {period.payrolls.map((payroll) => (
                                    <tr key={payroll.id} className="hover:bg-slate-50 transition">
                                        <td className="px-6 py-4">
                                            <div className="text-sm font-semibold text-slate-900">
                                                {payroll.employee.first_name} {payroll.employee.last_name}
                                            </div>
                                            <div className="text-xs text-slate-500">
                                                {payroll.employee.employee_code}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-right text-sm font-medium text-slate-900">
                                            {formatCurrency(payroll.gross_pay)}
                                        </td>
                                        <td className="px-6 py-4 text-right text-sm text-red-600">
                                            {formatCurrency(payroll.total_deductions)}
                                        </td>
                                        <td className="px-6 py-4 text-right text-sm font-semibold text-green-600">
                                            {formatCurrency(payroll.net_pay)}
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${
                                                payroll.status === 'DRAFT' ? 'bg-yellow-100 text-yellow-800' : 'bg-green-100 text-green-800'
                                            }`}>
                                                {payroll.status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <div className="flex items-center justify-center gap-2">
                                                <Link
                                                    href={route('admin.payroll.payslip', payroll.id)}
                                                    className="inline-flex items-center gap-1 rounded-md bg-blue-50 px-3 py-1.5 text-xs font-medium text-blue-700 transition hover:bg-blue-100"
                                                >
                                                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                                    </svg>
                                                    View
                                                </Link>
                                                {period.status === 'OPEN' && (
                                                    <button
                                                        onClick={() => router.post(route('admin.payroll.regenerate-employee', [period.id, payroll.employee.id]))}
                                                        className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-200"
                                                    >
                                                        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                                        </svg>
                                                        Regenerate
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Cash Advances Tab */}
            {activeTab === 'cash-advances' && (
                <div className="space-y-6">
                    {/* Messages */}
                    {successMessage && (
                        <div className="rounded-lg border border-green-200 bg-green-50 p-4 text-green-800">
                            {successMessage}
                        </div>
                    )}
                    {errorMessage && (
                        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-800">
                            {errorMessage}
                        </div>
                    )}

                    {/* Add Cash Advance Form */}
                    <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
                        <h3 className="text-lg font-semibold text-slate-900 mb-4">Add Cash Advance</h3>
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
                                    {period.payrolls.map(payroll => (
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

                    {/* Cash Advances Table */}
                    <div className="rounded-lg border border-slate-200 bg-white shadow-sm overflow-hidden">
                        <div className="border-b border-slate-200 bg-slate-50 px-6 py-4">
                            <h3 className="text-sm font-semibold text-slate-900">Employee Cash Advances</h3>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b border-slate-200 bg-slate-50">
                                        <th className="px-6 py-3 text-left font-semibold text-slate-900">Employee</th>
                                        <th className="px-6 py-3 text-right font-semibold text-slate-900">Available</th>
                                        <th className="px-6 py-3 text-right font-semibold text-slate-900">Remaining</th>
                                        <th className="px-6 py-3 text-left font-semibold text-slate-900">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {period.payrolls.map((payroll) => {
                                        const advances = cashAdvances[payroll.employee_id] || { deductible: [], remaining: [], totalRemaining: 0 };
                                        return (
                                            <tr key={payroll.id} className="border-b border-slate-200 hover:bg-slate-50">
                                                <td className="px-6 py-4 text-slate-900 font-medium">
                                                    {payroll.employee.first_name} {payroll.employee.last_name}
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    {advances.deductible.length > 0 ? (
                                                        <div className="space-y-1">
                                                            {advances.deductible.map(adv => (
                                                                <div key={adv.id} className="flex items-center justify-between gap-2">
                                                                    <span className="text-slate-600">{formatCurrency(adv.amount)}</span>
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => handleApplyDeduction(payroll.employee_id, adv.id)}
                                                                        className="rounded bg-green-100 px-2 py-1 text-xs font-semibold text-green-700 transition hover:bg-green-200"
                                                                    >
                                                                        Apply
                                                                    </button>
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => handleRemoveAdvance(adv.id)}
                                                                        className="rounded bg-red-100 px-2 py-1 text-xs font-semibold text-red-700 transition hover:bg-red-200"
                                                                    >
                                                                        Remove
                                                                    </button>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    ) : (
                                                        <span className="text-slate-500">-</span>
                                                    )}
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    {advances.totalRemaining > 0 ? (
                                                        <span className="font-semibold text-amber-600">{formatCurrency(advances.totalRemaining)}</span>
                                                    ) : (
                                                        <span className="text-slate-500">-</span>
                                                    )}
                                                </td>
                                                <td className="px-6 py-4">
                                                    <Link
                                                        href={route('admin.payroll.payslip', payroll.id)}
                                                        className="inline-flex items-center gap-1 rounded-md bg-blue-50 px-3 py-1.5 text-xs font-medium text-blue-700 transition hover:bg-blue-100"
                                                    >
                                                        View Payslip
                                                    </Link>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}
        </AdminLayout>
    );
}
