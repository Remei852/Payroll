import { useState } from 'react';
import AdminLayout from '@/Layouts/AdminLayout';
import { Head, router } from '@inertiajs/react';

export default function PayrollGenerate({ departments }) {
    const [formData, setFormData] = useState({
        department_id: '',
        start_date: '',
        end_date: '',
        payroll_date: '',
    });
    const [isProcessing, setIsProcessing] = useState(false);
    const [zeroRateEmployees, setZeroRateEmployees] = useState([]);
    const [departmentEmployees, setDepartmentEmployees] = useState([]);
    const [errorMessage, setErrorMessage] = useState('');

    const handleSubmit = (e) => {
        e.preventDefault();
        setIsProcessing(true);

        router.post(route('admin.payroll.process-generation'), formData, {
            onFinish: () => setIsProcessing(false),
        });
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData({
            ...formData,
            [name]: value,
        });

        // Fetch employees when department changes
        if (name === 'department_id' && value) {
            fetchDepartmentEmployees(value);
        }
    };

    const fetchDepartmentEmployees = async (departmentId) => {
        try {
            const response = await fetch(`/api/employees?department_id=${departmentId}`);
            const data = await response.json();
            const employees = data.data || data || [];
            setDepartmentEmployees(employees);
            
            // Find employees with zero daily rate
            const zeroRate = employees.filter(emp => parseFloat(emp.daily_rate) === 0);
            setZeroRateEmployees(zeroRate);
        } catch (error) {
            console.error('Error fetching employees:', error);
            setDepartmentEmployees([]);
            setZeroRateEmployees([]);
        }
    };

    return (
        <AdminLayout title="Generate Payroll">
            <Head title="Generate Payroll" />

            <div className="mb-8">
                <h1 className="text-3xl font-bold text-slate-900">Generate Payroll</h1>
                <p className="mt-2 text-slate-600">
                    Create a new payroll period and calculate employee wages
                </p>
            </div>

            {/* Messages */}
            {errorMessage && (
                <div className="mb-6 rounded-lg border border-red-200 bg-red-50 p-4 text-red-800">
                    {errorMessage}
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Form Section */}
                <div className="lg:col-span-2">
                    <div className="rounded-lg border border-slate-200 bg-white p-8 shadow-md">
                        <form onSubmit={handleSubmit} className="space-y-6">
                            {/* Department Selection */}
                            <div>
                                <label htmlFor="department_id" className="block text-sm font-semibold text-slate-900 mb-2">
                                    Department
                                </label>
                                <select
                                    id="department_id"
                                    name="department_id"
                                    value={formData.department_id}
                                    onChange={handleChange}
                                    required
                                    className="w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-sm transition focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                                >
                                    <option value="">Select Department</option>
                                    {departments.map((dept) => (
                                        <option key={dept.id} value={dept.id}>
                                            {dept.name}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {/* Period Dates */}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label htmlFor="start_date" className="block text-sm font-semibold text-slate-900 mb-2">
                                        Period Start Date
                                    </label>
                                    <input
                                        type="date"
                                        id="start_date"
                                        name="start_date"
                                        value={formData.start_date}
                                        onChange={handleChange}
                                        required
                                        className="w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-sm transition focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                                    />
                                </div>

                                <div>
                                    <label htmlFor="end_date" className="block text-sm font-semibold text-slate-900 mb-2">
                                        Period End Date
                                    </label>
                                    <input
                                        type="date"
                                        id="end_date"
                                        name="end_date"
                                        value={formData.end_date}
                                        onChange={handleChange}
                                        required
                                        className="w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-sm transition focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                                    />
                                </div>
                            </div>

                            {/* Payroll Date */}
                            <div>
                                <label htmlFor="payroll_date" className="block text-sm font-semibold text-slate-900 mb-2">
                                    Payroll Date
                                </label>
                                <input
                                    type="date"
                                    id="payroll_date"
                                    name="payroll_date"
                                    value={formData.payroll_date}
                                    onChange={handleChange}
                                    required
                                    className="w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-sm transition focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                                />
                                <p className="mt-2 text-xs text-slate-500">
                                    The date when employees will receive their pay
                                </p>
                            </div>

                            {/* Actions */}
                            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
                                <button
                                    type="button"
                                    onClick={() => router.visit(route('admin.payroll.index'))}
                                    className="rounded-lg border border-slate-300 bg-white px-6 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={isProcessing}
                                    className="inline-flex items-center gap-2 rounded-lg bg-primary px-6 py-3 text-sm font-semibold text-white shadow-lg transition hover:bg-primary/90 disabled:opacity-50 hover:shadow-xl"
                                >
                                    {isProcessing ? (
                                        <>
                                            <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                            </svg>
                                            Processing...
                                        </>
                                    ) : (
                                        <>
                                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                            </svg>
                                            Generate Payroll
                                        </>
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>

                {/* Info Section */}
                <div className="space-y-4">
                    {/* Info Box */}
                    <div className="rounded-lg border border-blue-200 bg-gradient-to-br from-blue-50 to-blue-100 p-6 shadow-sm">
                        <div className="flex gap-3">
                            <div className="text-2xl">ℹ️</div>
                            <div>
                                <h3 className="font-semibold text-blue-900 mb-2">Payroll Calculation</h3>
                                <div className="text-xs text-blue-800 space-y-1">
                                    <p><strong>Gross Pay =</strong></p>
                                    <p className="ml-2">(Days Worked × Daily Rate) + Overtime Pay</p>
                                    <p className="mt-2"><strong>Deductions =</strong></p>
                                    <p className="ml-2">Late Penalty + Undertime Penalty + Contributions + Cash Advances</p>
                                    <p className="mt-2"><strong>Net Pay =</strong></p>
                                    <p className="ml-2">Gross Pay - Deductions</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Employee Count */}
                    {departmentEmployees.length > 0 && (
                        <div className="rounded-lg border border-slate-200 bg-gradient-to-br from-slate-50 to-slate-100 p-6 shadow-sm">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Employees</p>
                                    <p className="mt-2 text-3xl font-bold text-slate-900">{departmentEmployees.length}</p>
                                </div>
                                <div className="text-4xl opacity-20">👥</div>
                            </div>
                        </div>
                    )}

                    {/* Warning for zero daily rates */}
                    {zeroRateEmployees.length > 0 && (
                        <div className="rounded-lg border border-amber-200 bg-gradient-to-br from-amber-50 to-amber-100 p-6 shadow-sm">
                            <div className="flex gap-3">
                                <div className="text-2xl flex-shrink-0">⚠️</div>
                                <div>
                                    <h3 className="font-semibold text-amber-900 mb-2">Zero Daily Rate</h3>
                                    <p className="text-xs text-amber-800 mb-3">
                                        {zeroRateEmployees.length} employee(s) have a daily rate of ₱0.00:
                                    </p>
                                    <ul className="space-y-1 text-xs text-amber-800">
                                        {zeroRateEmployees.map((emp) => (
                                            <li key={emp.id} className="flex items-center gap-2">
                                                <span>•</span>
                                                <span>{emp.first_name} {emp.last_name}</span>
                                            </li>
                                        ))}
                                    </ul>
                                    <p className="mt-3 text-xs text-amber-900 font-medium">
                                        Update their daily rates before generating payroll.
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </AdminLayout>
    );
}
