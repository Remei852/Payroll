import AdminLayout from '@/Layouts/AdminLayout';
import { Head } from '@inertiajs/react';
import { useEffect, useMemo, useState } from 'react';

function formatCurrency(value) {
    return new Intl.NumberFormat('en-PH', {
        style: 'currency',
        currency: 'PHP',
        minimumFractionDigits: 2,
    }).format(value);
}

const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—';

// ─── Cash Advances Tab ────────────────────────────────────────────────────────
function CashAdvancesTab({ employeeId }) {
    const [advances, setAdvances] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [form, setForm] = useState({ amount: '', reason: '' });
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState(null);

    async function load() {
        setLoading(true);
        try {
            const res = await fetch(`/api/employees/${employeeId}/cash-advances`);
            const data = await res.json();
            // Show all advances (deductible + remaining)
            const all = [...(data.deductible ?? []), ...(data.remaining ?? [])];
            // Deduplicate by id
            const seen = new Set();
            setAdvances(all.filter(a => { if (seen.has(a.id)) return false; seen.add(a.id); return true; })
                .sort((a, b) => new Date(b.created_at) - new Date(a.created_at)));
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => { load(); }, [employeeId]);

    async function handleAdd(e) {
        e.preventDefault();
        setSaving(true);
        setError(null);
        try {
            const res = await fetch(`/api/employees/${employeeId}/cash-advances`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.content },
                body: JSON.stringify({ amount: parseFloat(form.amount), reason: form.reason || null }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.message || 'Failed');
            setForm({ amount: '', reason: '' });
            setShowForm(false);
            load();
        } catch (err) {
            setError(err.message);
        } finally {
            setSaving(false);
        }
    }

    async function handleRemove(id) {
        if (!confirm('Remove this cash advance?')) return;
        await fetch(`/api/cash-advances/${id}`, {
            method: 'DELETE',
            headers: { 'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.content },
        });
        load();
    }

    const pending  = advances.filter(a => a.status === 'Active');
    const deducted = advances.filter(a => a.status === 'Deducted');
    const totalPending = pending.reduce((s, a) => s + parseFloat(a.amount), 0);

    return (
        <div className="space-y-4">
            {/* Summary + Add button */}
            <div className="flex items-center justify-between">
                <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Cash Advances</p>
                    {totalPending > 0 && (
                        <p className="mt-0.5 text-xs text-amber-600 font-medium">
                            {formatCurrency(totalPending)} pending deduction
                        </p>
                    )}
                </div>
                <button onClick={() => setShowForm(s => !s)}
                    className="inline-flex items-center gap-1 rounded-md bg-[#1E3A8A]/10 px-2.5 py-1.5 text-xs font-medium text-[#1E3A8A] hover:bg-[#1E3A8A]/20 transition">
                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15"/></svg>
                    Add
                </button>
            </div>

            {/* Add form */}
            {showForm && (
                <form onSubmit={handleAdd} className="rounded-lg border border-slate-200 bg-slate-50 p-3 space-y-2">
                    <div className="grid grid-cols-2 gap-2">
                        <div>
                            <label className="mb-1 block text-[11px] font-medium text-slate-500">Amount</label>
                            <input required type="number" min="0.01" step="0.01" placeholder="0.00"
                                value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
                                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-[#1E3A8A] focus:outline-none" />
                        </div>
                        <div>
                            <label className="mb-1 block text-[11px] font-medium text-slate-500">Reason</label>
                            <input type="text" placeholder="Optional"
                                value={form.reason} onChange={e => setForm(f => ({ ...f, reason: e.target.value }))}
                                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-[#1E3A8A] focus:outline-none" />
                        </div>
                    </div>
                    {error && <p className="text-xs text-red-600">{error}</p>}
                    <div className="flex justify-end gap-2">
                        <button type="button" onClick={() => setShowForm(false)}
                            className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100">Cancel</button>
                        <button type="submit" disabled={saving}
                            className="rounded-lg bg-[#1E3A8A] px-3 py-1.5 text-xs font-medium text-white hover:bg-[#1E3A8A]/90 disabled:opacity-50">
                            {saving ? 'Saving…' : 'Save'}
                        </button>
                    </div>
                </form>
            )}

            {loading ? (
                <p className="text-xs text-slate-400">Loading…</p>
            ) : advances.length === 0 ? (
                <div className="rounded-lg border border-dashed border-slate-300 px-4 py-8 text-center text-xs text-slate-500">
                    No cash advances recorded.
                </div>
            ) : (
                <div className="space-y-4">
                    {/* Pending */}
                    {pending.length > 0 && (
                        <div>
                            <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-amber-600">Pending ({pending.length})</p>
                            <div className="space-y-2">
                                {pending.map(a => (
                                    <div key={a.id} className="flex items-center justify-between rounded-lg border border-amber-100 bg-amber-50 px-3 py-2">
                                        <div>
                                            <p className="text-sm font-semibold text-amber-800">{formatCurrency(a.amount)}</p>
                                            <p className="text-xs text-amber-600">{a.reason || 'No reason'} · {fmtDate(a.created_at)}</p>
                                        </div>
                                        <button onClick={() => handleRemove(a.id)}
                                            className="rounded p-1 text-amber-400 hover:bg-amber-100 hover:text-red-500 transition" title="Remove">
                                            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Deducted history */}
                    {deducted.length > 0 && (
                        <div>
                            <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-slate-400">Deducted History</p>
                            <div className="space-y-2">
                                {deducted.map(a => (
                                    <div key={a.id} className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-3 py-2">
                                        <div>
                                            <p className="text-sm font-medium text-slate-700 line-through">{formatCurrency(a.amount)}</p>
                                            <p className="text-xs text-slate-400">
                                                {a.reason || 'No reason'} · Deducted {fmtDate(a.deducted_at)}
                                                {a.payroll_period && (
                                                    <span className="ml-1 text-slate-400">
                                                        ({new Date(a.payroll_period.start_date).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })})
                                                    </span>
                                                )}
                                            </p>
                                        </div>
                                        <span className="rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-semibold text-green-700">Deducted</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

export default function Index({
    employees: initialEmployees = [],
    departments: initialDepartments = [],
    departmentsList: initialDepartmentsList = [],
}) {
    const [employees, setEmployees] = useState(initialEmployees);
    const [departments] = useState(initialDepartments);
    const [departmentFilter, setDepartmentFilter] = useState('');
    const [search, setSearch] = useState('');
    const [selectedEmployeeId, setSelectedEmployeeId] = useState(null);
    const [selectedEmployee, setSelectedEmployee] = useState(null);
    const [selectedContributions, setSelectedContributions] = useState([]);
    const [contributionTypes, setContributionTypes] = useState([]);
    const [loadingEmployee, setLoadingEmployee] = useState(false);
    const [activeTab, setActiveTab] = useState('basic');
    const [drawerMode, setDrawerMode] = useState('view'); // view | edit | create
    const [formEmployee, setFormEmployee] = useState({
        employeeCode: '',
        firstName: '',
        lastName: '',
        departmentId: '',
        dailyRate: '',
        status: 'ACTIVE',
        position: '',
        hireDate: '',
    });
    const [formContributions, setFormContributions] = useState([]);
    const [submitting, setSubmitting] = useState(false);
    const [deletingId, setDeletingId] = useState(null);

    const OTHER_TYPE_VALUE = '__other__';

    const filteredEmployees = useMemo(() => {
        return employees.filter((e) => {
            if (departmentFilter && e.department !== departmentFilter) return false;
            if (search) {
                const q = search.toLowerCase();
                const fullName = `${e.firstName} ${e.lastName}`.toLowerCase();
                if (
                    !e.employeeCode.toLowerCase().includes(q) &&
                    !fullName.includes(q)
                ) {
                    return false;
                }
            }
            return true;
        });
    }, [employees, departmentFilter, search]);

    const contributions = useMemo(
        () => (drawerMode === 'view' ? selectedContributions : formContributions),
        [drawerMode, selectedContributions, formContributions],
    );

    useEffect(() => {
        fetchContributionTypes();
    }, []);

    useEffect(() => {
        if (selectedEmployeeId && drawerMode === 'view') {
            fetchEmployeeDetails(selectedEmployeeId);
        }
    }, [selectedEmployeeId, drawerMode]);

    async function fetchEmployeeDetails(id) {
        setLoadingEmployee(true);
        try {
            const response = await window.axios.get(`/api/employees/${id}`, {
                headers: {
                    'Accept': 'application/json',
                    'X-Requested-With': 'XMLHttpRequest',
                }
            });
            const emp = response.data;
            setSelectedEmployee({
                id: emp.id,
                employeeCode: emp.employee_code,
                firstName: emp.first_name,
                lastName: emp.last_name,
                department: emp.department?.name ?? '',
                departmentId: emp.department_id,
                dailyRate: parseFloat(emp.daily_rate),
                status: emp.employment_status,
                position: emp.position,
                hireDate: emp.hire_date,
            });
            setSelectedContributions(
                (emp.contributions || []).map((c) => ({
                    id: c.id,
                    contributionTypeId: c.contribution_type_id,
                    contributionTypeName: c.contribution_type?.name ?? '',
                    amountOrRate: parseFloat(c.amount_or_rate),
                    active: c.is_active,
                })),
            );
        } catch (error) {
            console.error('Error fetching employee:', error);
            console.error('Response status:', error.response?.status);
            console.error('Response data:', error.response?.data);
            alert('Failed to load employee details');
        } finally {
            setLoadingEmployee(false);
        }
    }

    async function fetchContributionTypes() {
        try {
            const response = await window.axios.get('/api/contribution-types');
            setContributionTypes(response.data || []);
        } catch (error) {
            console.error('Error fetching contribution types:', error);
        }
    }

    function openCreateDrawer() {
        setSelectedEmployeeId(null);
        setSelectedEmployee(null);
        setSelectedContributions([]);
        setDrawerMode('create');
        setActiveTab('basic');
        setFormEmployee({
            employeeCode: '',
            firstName: '',
            lastName: '',
            departmentId: '',
            dailyRate: '',
            status: 'ACTIVE',
            position: '',
            hireDate: '',
        });
        setFormContributions([]);
    }

    async function deleteEmployee(emp) {
        if (!confirm(`Delete ${emp.firstName} ${emp.lastName}? This cannot be undone.`)) return;
        setDeletingId(emp.id);
        try {
            await window.axios.delete(`/api/employees/${emp.id}`);
            setEmployees(prev => prev.filter(e => e.id !== emp.id));
            if (selectedEmployeeId === emp.id) {
                setSelectedEmployeeId(null);
                setSelectedEmployee(null);
            }
        } catch (err) {
            alert(err.response?.data?.message || 'Failed to delete employee');
        } finally {
            setDeletingId(null);
        }
    }

    async function openEditDrawer(emp) {
        setSelectedEmployeeId(emp.id);
        setDrawerMode('edit');
        setActiveTab('basic');
        setFormEmployee({
            employeeCode: emp.employeeCode,
            firstName: emp.firstName,
            lastName: emp.lastName,
            departmentId: String(emp.departmentId),
            dailyRate: String(emp.dailyRate),
            status: emp.status,
            position: emp.position ?? '',
            hireDate: emp.hireDate ?? '',
        });
        // Fetch full employee details including contributions
        const response = await window.axios.get(`/api/employees/${emp.id}`);
        const empData = response.data;
        setSelectedEmployee({
            id: empData.id,
            employeeCode: empData.employee_code,
            firstName: empData.first_name,
            lastName: empData.last_name,
            department: empData.department?.name ?? '',
            departmentId: empData.department_id,
            dailyRate: parseFloat(empData.daily_rate),
            status: empData.employment_status,
            position: empData.position,
            hireDate: empData.hire_date,
        });
        const contribs = (empData.contributions || []).map((c) => ({
            id: c.id,
            contributionTypeId: c.contribution_type_id,
            contributionTypeName: c.contribution_type?.name ?? '',
            amountOrRate: parseFloat(c.amount_or_rate),
            active: c.is_active,
        }));
        setSelectedContributions(contribs);
        setFormContributions(contribs.map((c) => ({ ...c })));
    }

    function closeDrawer() {
        setSelectedEmployeeId(null);
        setSelectedEmployee(null);
        setSelectedContributions([]);
        setDrawerMode('view');
        setActiveTab('basic');
    }

    async function handleBasicSubmit(e) {
        e.preventDefault();
        setSubmitting(true);

        try {
            const resolvedContributions = [];

            for (const c of formContributions) {
                if (!c.contributionTypeId || c.amountOrRate === '') continue;

                let contributionTypeId = c.contributionTypeId;
                let contributionTypeName = c.contributionTypeName;

                if (contributionTypeId === OTHER_TYPE_VALUE) {
                    const customName = (c.customContributionName || '').trim();

                    if (!customName) {
                        alert('Please enter a contribution name for Other.');
                        setSubmitting(false);
                        return;
                    }

                    const resp = await window.axios.post('/api/contribution-types', {
                        name: customName,
                        category: 'Other',
                        frequency: 'Monthly',
                        is_active: true,
                    });

                    contributionTypeId = String(resp.data?.id);
                    contributionTypeName = resp.data?.name ?? customName;

                    setContributionTypes((prev) => {
                        const exists = prev.some((t) => String(t.id) === String(contributionTypeId));
                        if (exists) return prev;
                        return [...prev, resp.data].sort((a, b) => String(a.name).localeCompare(String(b.name)));
                    });
                }

                resolvedContributions.push({
                    contributionTypeId,
                    contributionTypeName,
                    amountOrRate: c.amountOrRate,
                    active: c.active,
                });
            }

            const payload = {
                employee_code: String(formEmployee.employeeCode || '').trim(),
                first_name: String(formEmployee.firstName || '').trim(),
                last_name: String(formEmployee.lastName || '').trim(),
                department_id: Number(formEmployee.departmentId),
                position: formEmployee.position || null,
                daily_rate: Number(formEmployee.dailyRate || 0),
                hire_date: formEmployee.hireDate || null,
                employment_status: formEmployee.status || 'ACTIVE',
                contributions: resolvedContributions.map((c) => ({
                        contribution_type_id: Number(c.contributionTypeId),
                        calculation_type: 'FIXED',
                        amount_or_rate: Number(c.amountOrRate),
                        employer_share_amount: null,
                        effective_date: new Date().toISOString().slice(0, 10),
                        is_active: c.active ?? true,
                    })),
            };

            if (drawerMode === 'create') {
                await window.axios.post('/api/employees', payload);
                alert('Employee created successfully');
                window.location.reload(); // Refresh to get updated list
            } else {
                await window.axios.put(`/api/employees/${selectedEmployeeId}`, payload);
                alert('Employee updated successfully');
                window.location.reload();
            }
            closeDrawer();
        } catch (error) {
            console.error('Error saving employee:', error);
            alert(error.response?.data?.message || 'Failed to save employee');
        } finally {
            setSubmitting(false);
        }
    }

    function toggleContributionActive(id) {
        setFormContributions((prev) =>
            prev.map((c) =>
                c.id === id ? { ...c, active: !c.active } : c,
            ),
        );
    }

    function updateContributionField(id, field, value) {
        setFormContributions((prev) =>
            prev.map((c) =>
                c.id === id ? { ...c, [field]: value } : c,
            ),
        );
    }

    function removeContributionRow(id) {
        setFormContributions((prev) => prev.filter((c) => c.id !== id));
    }

    function addContributionRow() {
        setFormContributions((prev) => [
            ...prev,
            {
                id: Date.now(),
                contributionTypeId: '',
                contributionTypeName: '',
                customContributionName: '',
                amountOrRate: '',
                active: true,
            },
        ]);
    }

    return (
        <AdminLayout title="Employee List">
            <Head title="Employee List" />

            <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
                <div>
                    <h2 className="text-lg font-semibold text-[#334155]">Employees</h2>
                    <p className="mt-1 text-sm text-slate-500">
                        Manage employee information, status, and contributions.
                    </p>
                </div>
                <button
                    type="button"
                    onClick={openCreateDrawer}
                    className="inline-flex items-center gap-2 rounded-md bg-[#1E3A8A] px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-[#1E3A8A]/90"
                >
                    <span className="text-base leading-none">+</span>
                    <span>Add Employee</span>
                </button>
            </div>

            <div className="mb-4 flex flex-wrap items-center gap-3">
                <div className="w-full max-w-xs">
                    <label className="mb-1 block text-xs font-medium text-slate-600">
                        Department
                    </label>
                    <select
                        value={departmentFilter}
                        onChange={(e) => setDepartmentFilter(e.target.value)}
                        className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm focus:border-[#1E3A8A] focus:outline-none focus:ring-1 focus:ring-[#1E3A8A]"
                    >
                        <option value="">All Departments</option>
                        {departments.map((dept) => (
                            <option key={dept} value={dept}>
                                {dept}
                            </option>
                        ))}
                    </select>
                </div>
                <div className="w-full max-w-sm">
                    <label className="mb-1 block text-xs font-medium text-slate-600">
                        Search employee
                    </label>
                    <input
                        type="text"
                        placeholder="Search by code or name"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm focus:border-[#1E3A8A] focus:outline-none focus:ring-1 focus:ring-[#1E3A8A]"
                    />
                </div>
            </div>

            <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white shadow-sm" style={{ maxHeight: '500px', overflowY: 'auto' }}>
                <table className="min-w-full text-left text-sm">
                    <thead className="sticky top-0 bg-slate-50 text-xs uppercase text-slate-500 z-10">
                        <tr>
                            <th className="px-4 py-3 font-medium">Employee Code</th>
                            <th className="px-4 py-3 font-medium">Full Name</th>
                            <th className="px-4 py-3 font-medium">Department</th>
                            <th className="px-4 py-3 font-medium">Daily Rate</th>
                            <th className="px-4 py-3 font-medium">Status</th>
                            <th className="px-4 py-3 font-medium">Edit</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {filteredEmployees.map((emp) => (
                            <tr
                                key={emp.id}
                                className="cursor-pointer transition hover:bg-slate-50"
                                onClick={() => {
                                    setSelectedEmployeeId(emp.id);
                                    setDrawerMode('view');
                                    setActiveTab('basic');
                                }}
                            >
                                <td className="whitespace-nowrap px-4 py-3 font-medium text-slate-900">
                                    {emp.employeeCode}
                                </td>
                                <td className="whitespace-nowrap px-4 py-3 text-slate-700">
                                    {emp.lastName}, {emp.firstName}
                                </td>
                                <td className="whitespace-nowrap px-4 py-3 text-slate-600">
                                    {emp.department}
                                </td>
                                <td className="whitespace-nowrap px-4 py-3 text-slate-700">
                                    {formatCurrency(emp.dailyRate)}
                                </td>
                                <td className="whitespace-nowrap px-4 py-3">
                                    <span
                                        className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${
                                            emp.status === 'ACTIVE'
                                                ? 'bg-green-100 text-green-700'
                                                : 'bg-slate-100 text-slate-600'
                                        }`}
                                    >
                                        {emp.status}
                                    </span>
                                </td>
                                <td
                                    className="whitespace-nowrap px-4 py-3 text-xs"
                                >
                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={(e) => { e.stopPropagation(); openEditDrawer(emp); }}
                                            className="text-[#1E3A8A] hover:underline"
                                        >
                                            Edit
                                        </button>
                                        <button
                                            onClick={(e) => { e.stopPropagation(); deleteEmployee(emp); }}
                                            disabled={deletingId === emp.id}
                                            className="text-red-500 hover:underline disabled:opacity-50"
                                        >
                                            {deletingId === emp.id ? '…' : 'Delete'}
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                        {filteredEmployees.length === 0 && (
                            <tr>
                                <td
                                    colSpan={6}
                                    className="px-4 py-6 text-center text-sm text-slate-500"
                                >
                                    No employees found for the selected filters.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {(drawerMode === 'create' || selectedEmployeeId) && (
                <>
                    <div
                        className="fixed inset-0 z-20 bg-black/20 backdrop-blur-sm"
                        onClick={closeDrawer}
                    />
                    <div className="fixed inset-y-0 right-0 z-30 flex w-full max-w-lg flex-col border-l border-slate-200 bg-white shadow-xl">
                        <div className="flex h-14 shrink-0 items-center justify-between border-b border-slate-200 px-5">
                            <div>
                                <div className="text-sm font-semibold text-slate-900">
                                    {drawerMode === 'create'
                                        ? 'New Employee'
                                        : drawerMode === 'edit'
                                          ? 'Edit Employee'
                                          : selectedEmployee?.employeeCode || 'Loading...'}
                                </div>
                                <div className="text-xs text-slate-500">
                                    {drawerMode === 'create'
                                        ? 'Fill in the details below'
                                        : selectedEmployee
                                            ? `${selectedEmployee.firstName} ${selectedEmployee.lastName}`
                                            : 'Loading...'}
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={closeDrawer}
                                className="rounded-md p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
                            >
                                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        <div className="shrink-0 border-b border-slate-200 px-5">
                            <nav className="flex gap-6 text-sm">
                                <button
                                    type="button"
                                    onClick={() => setActiveTab('basic')}
                                    className={`border-b-2 py-2.5 text-sm font-medium transition ${
                                        activeTab === 'basic'
                                            ? 'border-[#1E3A8A] text-[#1E3A8A]'
                                            : 'border-transparent text-slate-500 hover:text-slate-700'
                                    }`}
                                >
                                    Basic Info
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setActiveTab('contributions')}
                                    className={`border-b-2 py-2.5 text-sm font-medium transition ${
                                        activeTab === 'contributions'
                                            ? 'border-[#1E3A8A] text-[#1E3A8A]'
                                            : 'border-transparent text-slate-500 hover:text-slate-700'
                                    }`}
                                >
                                    Contributions
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setActiveTab('advances')}
                                    className={`border-b-2 py-2.5 text-sm font-medium transition ${
                                        activeTab === 'advances'
                                            ? 'border-[#1E3A8A] text-[#1E3A8A]'
                                            : 'border-transparent text-slate-500 hover:text-slate-700'
                                    }`}
                                >
                                    Cash Advances
                                </button>
                            </nav>
                        </div>

                        <form
                            className="flex min-h-0 flex-1 flex-col"
                            onSubmit={handleBasicSubmit}
                        >
                            <div className="flex-1 overflow-y-auto px-5 py-5">
                                {loadingEmployee && drawerMode === 'view' && (
                                    <div className="py-12 text-center text-sm text-slate-500">
                                        Loading employee details...
                                    </div>
                                )}

                                {activeTab === 'basic' && drawerMode !== 'view' && (
                                    <div className="space-y-4">
                                        <div>
                                            <label className="mb-1.5 block text-xs font-medium text-slate-600">Employee Code</label>
                                            <input
                                                type="text"
                                                required
                                                value={formEmployee.employeeCode}
                                                onChange={(e) => setFormEmployee((prev) => ({ ...prev, employeeCode: e.target.value }))}
                                                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm focus:border-[#1E3A8A] focus:outline-none focus:ring-2 focus:ring-[#1E3A8A]/20"
                                            />
                                        </div>
                                        <div className="grid grid-cols-2 gap-3">
                                            <div>
                                                <label className="mb-1.5 block text-xs font-medium text-slate-600">First Name</label>
                                                <input
                                                    type="text"
                                                    required
                                                    value={formEmployee.firstName}
                                                    onChange={(e) => setFormEmployee((prev) => ({ ...prev, firstName: e.target.value }))}
                                                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm focus:border-[#1E3A8A] focus:outline-none focus:ring-2 focus:ring-[#1E3A8A]/20"
                                                />
                                            </div>
                                            <div>
                                                <label className="mb-1.5 block text-xs font-medium text-slate-600">Last Name</label>
                                                <input
                                                    type="text"
                                                    required
                                                    value={formEmployee.lastName}
                                                    onChange={(e) => setFormEmployee((prev) => ({ ...prev, lastName: e.target.value }))}
                                                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm focus:border-[#1E3A8A] focus:outline-none focus:ring-2 focus:ring-[#1E3A8A]/20"
                                                />
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-2 gap-3">
                                            <div>
                                                <label className="mb-1.5 block text-xs font-medium text-slate-600">Department</label>
                                                <select
                                                    required
                                                    value={formEmployee.departmentId}
                                                    onChange={(e) => setFormEmployee((prev) => ({ ...prev, departmentId: e.target.value }))}
                                                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm focus:border-[#1E3A8A] focus:outline-none focus:ring-2 focus:ring-[#1E3A8A]/20"
                                                >
                                                    <option value="">Select department</option>
                                                    {initialDepartmentsList.map((dept) => (
                                                        <option key={dept.id} value={dept.id}>{dept.name}</option>
                                                    ))}
                                                </select>
                                            </div>
                                            <div>
                                                <label className="mb-1.5 block text-xs font-medium text-slate-600">Position</label>
                                                <input
                                                    type="text"
                                                    value={formEmployee.position}
                                                    onChange={(e) => setFormEmployee((prev) => ({ ...prev, position: e.target.value }))}
                                                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm focus:border-[#1E3A8A] focus:outline-none focus:ring-2 focus:ring-[#1E3A8A]/20"
                                                />
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-2 gap-3">
                                            <div>
                                                <label className="mb-1.5 block text-xs font-medium text-slate-600">Daily Rate</label>
                                                <input
                                                    type="number"
                                                    min="0"
                                                    step="0.01"
                                                    required
                                                    value={formEmployee.dailyRate}
                                                    onChange={(e) => setFormEmployee((prev) => ({ ...prev, dailyRate: e.target.value }))}
                                                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm focus:border-[#1E3A8A] focus:outline-none focus:ring-2 focus:ring-[#1E3A8A]/20"
                                                />
                                            </div>
                                            <div>
                                                <label className="mb-1.5 block text-xs font-medium text-slate-600">Hire Date</label>
                                                <input
                                                    type="date"
                                                    value={formEmployee.hireDate}
                                                    onChange={(e) => setFormEmployee((prev) => ({ ...prev, hireDate: e.target.value }))}
                                                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm focus:border-[#1E3A8A] focus:outline-none focus:ring-2 focus:ring-[#1E3A8A]/20"
                                                />
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-2 gap-3">
                                            <div>
                                                <label className="mb-1.5 block text-xs font-medium text-slate-600">Employment Status</label>
                                                <select
                                                    value={formEmployee.status}
                                                    onChange={(e) => setFormEmployee((prev) => ({ ...prev, status: e.target.value }))}
                                                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm focus:border-[#1E3A8A] focus:outline-none focus:ring-2 focus:ring-[#1E3A8A]/20"
                                                >
                                                    <option value="ACTIVE">ACTIVE</option>
                                                    <option value="INACTIVE">INACTIVE</option>
                                                </select>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {activeTab === 'basic' && drawerMode === 'view' && selectedEmployee && (
                                    <div className="space-y-5">
                                        <div>
                                            <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">Basic Information</div>
                                            <dl className="mt-3 space-y-2">
                                                {[
                                                    ['Full Name', `${selectedEmployee.firstName} ${selectedEmployee.lastName}`],
                                                    ['Department', selectedEmployee.department],
                                                    ['Position', selectedEmployee.position || 'N/A'],
                                                    ['Daily Rate', formatCurrency(selectedEmployee.dailyRate)],
                                                    ['Hire Date', selectedEmployee.hireDate || 'N/A'],
                                                ].map(([label, value]) => (
                                                    <div key={label} className="flex items-center justify-between rounded-md bg-slate-50 px-3 py-2">
                                                        <dt className="text-xs text-slate-500">{label}</dt>
                                                        <dd className="text-xs font-medium text-slate-800">{value}</dd>
                                                    </div>
                                                ))}
                                            </dl>
                                        </div>
                                        <div>
                                            <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">Status</div>
                                            <div className="mt-3 flex items-center justify-between rounded-md bg-slate-50 px-3 py-2">
                                                <span className="text-xs text-slate-500">Employment Status</span>
                                                <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                                                    selectedEmployee.status === 'ACTIVE' ? 'bg-green-100 text-green-700' : 'bg-slate-200 text-slate-600'
                                                }`}>
                                                    {selectedEmployee.status}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {activeTab === 'contributions' && (
                                    <div className="space-y-3">
                                        <div className="flex items-center justify-between">
                                            <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                                                Contributions
                                            </div>
                                            {(drawerMode === 'create' || drawerMode === 'edit') && (
                                                <button
                                                    type="button"
                                                    onClick={addContributionRow}
                                                    className="inline-flex items-center gap-1 rounded-md bg-[#1E3A8A]/10 px-2.5 py-1.5 text-xs font-medium text-[#1E3A8A] transition hover:bg-[#1E3A8A]/20"
                                                >
                                                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                                                    </svg>
                                                    Add
                                                </button>
                                            )}
                                        </div>

                                        {contributions.length === 0 && (
                                            <div className="rounded-lg border border-dashed border-slate-300 px-4 py-8 text-center text-xs text-slate-500">
                                                No contributions configured.
                                                {(drawerMode === 'create' || drawerMode === 'edit') && ' Click "Add" to get started.'}
                                            </div>
                                        )}

                                        <div className="space-y-3">
                                            {contributions.map((item) => (
                                                <div key={item.id} className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm">
                                                    {drawerMode === 'view' ? (
                                                        <div className="flex items-center justify-between">
                                                            <div>
                                                                <div className="text-sm font-medium text-slate-800">{item.contributionTypeName}</div>
                                                                <div className="mt-0.5 text-xs text-slate-500">{formatCurrency(item.amountOrRate)}</div>
                                                            </div>
                                                            <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                                                                item.active ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'
                                                            }`}>
                                                                {item.active ? 'Active' : 'Inactive'}
                                                            </span>
                                                        </div>
                                                    ) : (
                                                        <div className="space-y-3">
                                                            <div className="grid grid-cols-2 gap-3">
                                                                <div className="col-span-2">
                                                                    <label className="mb-1 block text-[11px] font-medium text-slate-500">Contribution Type</label>
                                                                    <select
                                                                        value={item.contributionTypeId}
                                                                        onChange={(e) => {
                                                                            const selectedId = e.target.value;
                                                                            if (selectedId === OTHER_TYPE_VALUE) {
                                                                                updateContributionField(item.id, 'contributionTypeId', OTHER_TYPE_VALUE);
                                                                                updateContributionField(item.id, 'contributionTypeName', 'Other');
                                                                                return;
                                                                            }
                                                                            const selected = contributionTypes.find((t) => String(t.id) === String(selectedId));
                                                                            updateContributionField(item.id, 'contributionTypeId', selectedId);
                                                                            updateContributionField(item.id, 'contributionTypeName', selected?.name ?? '');
                                                                            updateContributionField(item.id, 'customContributionName', '');
                                                                        }}
                                                                        className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm focus:border-[#1E3A8A] focus:outline-none focus:ring-2 focus:ring-[#1E3A8A]/20"
                                                                    >
                                                                        <option value="">Select type</option>
                                                                        {contributionTypes.map((t) => (
                                                                            <option key={t.id} value={t.id}>{t.name}</option>
                                                                        ))}
                                                                        <option value={OTHER_TYPE_VALUE}>Other...</option>
                                                                    </select>
                                                                </div>

                                                                {item.contributionTypeId === OTHER_TYPE_VALUE && (
                                                                    <div className="col-span-2">
                                                                        <label className="mb-1 block text-[11px] font-medium text-slate-500">Custom Name</label>
                                                                        <input
                                                                            type="text"
                                                                            value={item.customContributionName || ''}
                                                                            onChange={(e) => updateContributionField(item.id, 'customContributionName', e.target.value)}
                                                                            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm focus:border-[#1E3A8A] focus:outline-none focus:ring-2 focus:ring-[#1E3A8A]/20"
                                                                            placeholder="Enter contribution name"
                                                                        />
                                                                    </div>
                                                                )}

                                                                <div>
                                                                    <label className="mb-1 block text-[11px] font-medium text-slate-500">Amount</label>
                                                                    <input
                                                                        type="number"
                                                                        step="0.01"
                                                                        value={item.amountOrRate}
                                                                        onChange={(e) => updateContributionField(item.id, 'amountOrRate', e.target.value)}
                                                                        className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm focus:border-[#1E3A8A] focus:outline-none focus:ring-2 focus:ring-[#1E3A8A]/20"
                                                                        placeholder="0.00"
                                                                    />
                                                                </div>

                                                                <div className="flex items-end justify-between gap-2">
                                                                    <div>
                                                                        <label className="mb-1 block text-[11px] font-medium text-slate-500">Status</label>
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => toggleContributionActive(item.id)}
                                                                            className={`inline-flex h-7 items-center gap-1.5 rounded-full border px-2.5 text-[11px] font-semibold transition ${
                                                                                item.active
                                                                                    ? 'border-green-200 bg-green-50 text-green-700'
                                                                                    : 'border-slate-200 bg-slate-50 text-slate-500'
                                                                            }`}
                                                                        >
                                                                            <span className={`h-2 w-2 rounded-full ${item.active ? 'bg-green-500' : 'bg-slate-400'}`} />
                                                                            {item.active ? 'Active' : 'Inactive'}
                                                                        </button>
                                                                    </div>
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => removeContributionRow(item.id)}
                                                                        className="mb-0.5 rounded-md p-1.5 text-slate-400 transition hover:bg-red-50 hover:text-red-500"
                                                                        title="Remove contribution"
                                                                    >
                                                                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                                                            <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                                                                        </svg>
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {activeTab === 'advances' && selectedEmployee && (
                                    <CashAdvancesTab employeeId={selectedEmployee.id} />
                                )}
                            </div>

                            {(drawerMode === 'create' || drawerMode === 'edit') && (
                                <div className="shrink-0 border-t border-slate-200 bg-slate-50 px-5 py-3">
                                    <div className="flex items-center justify-end gap-3">
                                        <button
                                            type="button"
                                            onClick={closeDrawer}
                                            className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50"
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            type="submit"
                                            disabled={submitting}
                                            className="rounded-lg bg-[#1E3A8A] px-5 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-[#1E3A8A]/90 disabled:cursor-not-allowed disabled:opacity-50"
                                        >
                                            {submitting
                                                ? 'Saving...'
                                                : drawerMode === 'create'
                                                  ? 'Create Employee'
                                                  : 'Save Changes'}
                                        </button>
                                    </div>
                                </div>
                            )}
                        </form>
                    </div>
                </>
            )}
        </AdminLayout>
    );
}

