import { useState } from 'react';
import { router } from '@inertiajs/react';

export default function PayrollCashAdvances({ period, payrolls }) {
    const [expandedEmployee, setExpandedEmployee] = useState(null);
    const [showForm, setShowForm] = useState(null);
    const [formData, setFormData] = useState({
        amount: '',
        date_requested: new Date().toISOString().split('T')[0],
        purpose: '',
    });
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleAddCashAdvance = (employeeId) => {
        setShowForm(employeeId);
        setFormData({
            amount: '',
            date_requested: new Date().toISOString().split('T')[0],
            purpose: '',
        });
    };

    const handleSubmit = (e, employeeId) => {
        e.preventDefault();
        setIsSubmitting(true);

        router.post(route('admin.cash-advances.store'), {
            employee_id: employeeId,
            payroll_period_id: period.id,
            ...formData,
        }, {
            onSuccess: () => {
                setFormData({
                    amount: '',
                    date_requested: new Date().toISOString().split('T')[0],
                    purpose: '',
                });
                setShowForm(null);
                setIsSubmitting(false);
            },
            onError: () => {
                setIsSubmitting(false);
            },
        });
    };

    const handleApprove = (cashAdvanceId) => {
        if (!confirm('Approve this cash advance?')) return;
        router.post(route('admin.cash-advances.approve', cashAdvanceId), {
            preserveState: true,
        });
    };

    const getStatusColor = (status) => {
        const colors = {
            'pending': 'bg-yellow-50 text-yellow-700 border border-yellow-200',
            'approved': 'bg-blue-50 text-blue-700 border border-blue-200',
            'deducted': 'bg-green-50 text-green-700 border border-green-200',
            'cancelled': 'bg-slate-50 text-slate-700 border border-slate-200',
        };
        return colors[status] || 'bg-slate-50 text-slate-700 border border-slate-200';
    };

    const getTotalPending = () => {
        return payrolls.reduce((sum, payroll) => {
            const pending = (payroll.employee.cash_advances || [])
                .filter(ca => ca.status === 'pending')
                .reduce((s, ca) => s + parseFloat(ca.amount), 0);
            return sum + pending;
        }, 0);
    };

    const getTotalApproved = () => {
        return payrolls.reduce((sum, payroll) => {
            const approved = (payroll.employee.cash_advances || [])
                .filter(ca => ca.status === 'approved')
                .reduce((s, ca) => s + parseFloat(ca.amount), 0);
            return sum + approved;
        }, 0);
    };

    if (payrolls.length === 0) {
        return (
            <div className="rounded-lg border border-blue-200 bg-blue-50 p-6 text-center">
                <p className="text-sm font-semibold text-blue-900">No Payrolls Generated</p>
                <p className="text-xs text-blue-700 mt-1">Generate payrolls first to manage cash advances</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
                    <div>
                        <p className="text-xs font-medium text-slate-600">Pending</p>
                        <p className="mt-1 text-2xl font-semibold text-slate-900">₱{getTotalPending().toFixed(2)}</p>
                        <p className="mt-1 text-xs text-slate-500">Awaiting approval</p>
                    </div>
                </div>

                <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
                    <div>
                        <p className="text-xs font-medium text-slate-600">Approved</p>
                        <p className="mt-1 text-2xl font-semibold text-slate-900">₱{getTotalApproved().toFixed(2)}</p>
                        <p className="mt-1 text-xs text-slate-500">Ready for deduction</p>
                    </div>
                </div>

                <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
                    <div>
                        <p className="text-xs font-medium text-slate-600">Total</p>
                        <p className="mt-1 text-2xl font-semibold text-slate-900">₱{(getTotalPending() + getTotalApproved()).toFixed(2)}</p>
                        <p className="mt-1 text-xs text-slate-500">All cash advances</p>
                    </div>
                </div>
            </div>

            <div className="rounded-lg border border-slate-200 bg-white shadow-sm overflow-hidden">
                <div className="border-b border-slate-200 bg-slate-50 px-4 py-3">
                    <h3 className="text-sm font-semibold text-[#334155]">Employee Cash Advances</h3>
                    <p className="mt-1 text-xs text-slate-600">Manage cash advances before finalizing payroll</p>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-slate-50 border-b border-slate-200">
                            <tr>
                                <th scope="col" className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">Employee</th>
                                <th scope="col" className="px-4 py-3 text-right text-xs font-semibold text-slate-700 uppercase tracking-wider">Pending</th>
                                <th scope="col" className="px-4 py-3 text-right text-xs font-semibold text-slate-700 uppercase tracking-wider">Approved</th>
                                <th scope="col" className="px-4 py-3 text-right text-xs font-semibold text-slate-700 uppercase tracking-wider">Total</th>
                                <th scope="col" className="px-4 py-3 text-center text-xs font-semibold text-slate-700 uppercase tracking-wider">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200">
                            {payrolls.map((payroll) => {
                                const cashAdvances = payroll.employee.cash_advances || [];
                                const pending = cashAdvances.filter(ca => ca.status === 'pending').reduce((sum, ca) => sum + parseFloat(ca.amount), 0);
                                const approved = cashAdvances.filter(ca => ca.status === 'approved').reduce((sum, ca) => sum + parseFloat(ca.amount), 0);
                                const total = pending + approved;

                                return (
                                    <tr key={payroll.id} className="hover:bg-slate-50 transition">
                                        <td className="px-4 py-3">
                                            <div className="text-sm font-medium text-slate-900">{payroll.employee.first_name} {payroll.employee.last_name}</div>
                                            <div className="text-xs text-slate-500 mt-0.5">{payroll.employee.employee_code}</div>
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                            <span className="inline-flex items-center rounded-full bg-yellow-100 px-2.5 py-0.5 text-xs font-medium text-yellow-700">₱{pending.toFixed(2)}</span>
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                            <span className="inline-flex items-center rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-700">₱{approved.toFixed(2)}</span>
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                            <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-700">₱{total.toFixed(2)}</span>
                                        </td>
                                        <td className="px-4 py-3 text-center">
                                            <button onClick={() => setExpandedEmployee(expandedEmployee === payroll.id ? null : payroll.id)} className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 text-xs font-medium transition">
                                                {expandedEmployee === payroll.id ? 'Hide' : 'Manage'}
                                            </button>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>

            {expandedEmployee && (
                <div className="rounded-lg border border-slate-200 bg-white shadow-sm p-4">
                    {payrolls.map((payroll) => {
                        if (payroll.id !== expandedEmployee) return null;
                        const cashAdvances = payroll.employee.cash_advances || [];

                        return (
                            <div key={payroll.id} className="space-y-4">
                                <div className="flex items-center justify-between border-b border-slate-200 pb-4">
                                    <div>
                                        <h4 className="text-sm font-semibold text-[#334155]">{payroll.employee.first_name} {payroll.employee.last_name}</h4>
                                        <p className="text-xs text-slate-600 mt-1">Employee ID: {payroll.employee.employee_code}</p>
                                    </div>
                                    <button onClick={() => handleAddCashAdvance(payroll.employee.id)} className="inline-flex items-center gap-2 rounded-lg bg-primary px-3 py-2 text-xs font-medium text-white shadow-sm transition hover:bg-primary/90">
                                        Add
                                    </button>
                                </div>

                                {showForm === payroll.employee.id && (
                                    <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                                        <h5 className="text-xs font-semibold text-[#334155] mb-3">New Cash Advance Request</h5>
                                        <form onSubmit={(e) => handleSubmit(e, payroll.employee.id)} className="space-y-3">
                                            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                                                <div>
                                                    <label className="mb-1 block text-xs font-semibold text-slate-700">Amount *</label>
                                                    <input type="number" step="0.01" min="0" required value={formData.amount} onChange={(e) => setFormData({ ...formData, amount: e.target.value })} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-700 shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20" placeholder="0.00" />
                                                </div>
                                                <div>
                                                    <label className="mb-1 block text-xs font-semibold text-slate-700">Date *</label>
                                                    <input type="date" required value={formData.date_requested} onChange={(e) => setFormData({ ...formData, date_requested: e.target.value })} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-700 shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20" />
                                                </div>
                                            </div>

                                            <div>
                                                <label className="mb-1 block text-xs font-semibold text-slate-700">Purpose</label>
                                                <input type="text" value={formData.purpose} onChange={(e) => setFormData({ ...formData, purpose: e.target.value })} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-700 shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20" placeholder="e.g., Medical, Emergency" />
                                            </div>

                                            <div className="flex items-center justify-end gap-2 border-t border-slate-200 pt-3">
                                                <button type="button" onClick={() => setShowForm(null)} className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-50">
                                                    Cancel
                                                </button>
                                                <button type="submit" disabled={isSubmitting} className="inline-flex items-center gap-2 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-white shadow-sm transition hover:bg-primary/90 disabled:opacity-50">
                                                    {isSubmitting ? 'Saving...' : 'Save'}
                                                </button>
                                            </div>
                                        </form>
                                    </div>
                                )}

                                {cashAdvances.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center py-6 px-4">
                                        <p className="text-xs text-slate-500">No cash advances</p>
                                    </div>
                                ) : (
                                    <div className="space-y-2">
                                        {cashAdvances.map((ca) => (
                                            <div key={ca.id} className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 p-3 hover:bg-slate-100 transition">
                                                <div className="flex-1">
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-sm font-semibold text-slate-900">₱{parseFloat(ca.amount).toFixed(2)}</span>
                                                        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${getStatusColor(ca.status)}`}>
                                                            {ca.status.charAt(0).toUpperCase() + ca.status.slice(1)}
                                                        </span>
                                                    </div>
                                                    <div className="mt-1 flex items-center gap-3 text-xs text-slate-600">
                                                        <span>{new Date(ca.date_requested).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                                                        {ca.purpose && <span>{ca.purpose}</span>}
                                                    </div>
                                                </div>
                                                {ca.status === 'pending' && (
                                                    <button onClick={() => handleApprove(ca.id)} className="ml-3 inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 text-xs font-medium transition">
                                                        Approve
                                                    </button>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
