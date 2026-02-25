import AdminLayout from '@/Layouts/AdminLayout';
import { Head } from '@inertiajs/react';
import axios from 'axios';
import { useEffect, useMemo, useState } from 'react';

export default function Manage() {
    const [departments, setDepartments] = useState([]);
    const [stats, setStats] = useState(null);
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [selectedDepartmentId, setSelectedDepartmentId] = useState(null);
    const [selectedDepartment, setSelectedDepartment] = useState(null);
    const [loadingDepartment, setLoadingDepartment] = useState(false);
    const [drawerMode, setDrawerMode] = useState('view'); // view | edit | create
    const [showEmployeesModal, setShowEmployeesModal] = useState(false);
    const [modalEmployees, setModalEmployees] = useState([]);
    const [modalDepartmentName, setModalDepartmentName] = useState('');
    const [formData, setFormData] = useState({
        name: '',
        payrollFrequency: '',
        isActive: true,
        // Work schedule fields
        workStartTime: '08:00',
        workEndTime: '17:00',
        breakStartTime: '12:00',
        breakEndTime: '13:00',
        gracePeriodMinutes: 15,
    });
    const [submitting, setSubmitting] = useState(false);

    const PAYROLL_FREQUENCIES = [
        { value: 'WEEKLY', label: 'Weekly' },
        { value: 'SEMI_MONTHLY', label: 'Semi-Monthly (Twice a Month)' },
        { value: 'MONTHLY', label: 'Monthly' },
    ];

    useEffect(() => {
        fetchDepartments();
        fetchStats();
    }, []);

    useEffect(() => {
        if (selectedDepartmentId && drawerMode === 'view') {
            fetchDepartmentDetails(selectedDepartmentId);
        }
    }, [selectedDepartmentId, drawerMode]);

    async function fetchDepartments() {
        try {
            const response = await axios.get('/api/departments');
            setDepartments(response.data || []);
        } catch (error) {
            console.error('Error fetching departments:', error);
            alert('Failed to load departments');
        }
    }

    async function fetchStats() {
        try {
            const response = await axios.get('/api/departments/stats');
            setStats(response.data || null);
        } catch (error) {
            console.error('Error fetching stats:', error);
        }
    }

    async function fetchDepartmentDetails(id) {
        setLoadingDepartment(true);
        try {
            const response = await axios.get(`/api/departments/${id}`);
            const dept = response.data;
            setSelectedDepartment({
                id: dept.id,
                name: dept.name,
                payrollFrequency: dept.payroll_frequency,
                isActive: dept.is_active,
                createdAt: dept.created_at,
                updatedAt: dept.updated_at,
                employeesCount: dept.employees_count || 0,
                employees: dept.employees || [],
            });
        } catch (error) {
            console.error('Error fetching department:', error);
            alert('Failed to load department details');
        } finally {
            setLoadingDepartment(false);
        }
    }

    const filteredDepartments = useMemo(() => {
        return departments.filter((dept) => {
            if (statusFilter === 'active' && !dept.is_active) return false;
            if (statusFilter === 'inactive' && dept.is_active) return false;
            if (search) {
                const q = search.toLowerCase();
                if (!dept.name.toLowerCase().includes(q)) return false;
            }
            return true;
        });
    }, [departments, statusFilter, search]);

    function openCreateDrawer() {
        setSelectedDepartmentId(null);
        setSelectedDepartment(null);
        setDrawerMode('create');
        setFormData({
            name: '',
            payrollFrequency: '',
            isActive: true,
            workStartTime: '08:00',
            workEndTime: '17:00',
            breakStartTime: '12:00',
            breakEndTime: '13:00',
            gracePeriodMinutes: 15,
        });
    }

    function openEditDrawer(dept) {
        setSelectedDepartmentId(dept.id);
        setDrawerMode('edit');
        setFormData({
            name: dept.name,
            payrollFrequency: dept.payroll_frequency || '',
            isActive: dept.is_active,
            workStartTime: dept.work_schedule?.work_start_time || '08:00',
            workEndTime: dept.work_schedule?.work_end_time || '17:00',
            breakStartTime: dept.work_schedule?.break_start_time || '12:00',
            breakEndTime: dept.work_schedule?.break_end_time || '13:00',
            gracePeriodMinutes: dept.work_schedule?.grace_period_minutes || 15,
        });
        setSelectedDepartment({
            id: dept.id,
            name: dept.name,
            payrollFrequency: dept.payroll_frequency,
            isActive: dept.is_active,
        });
    }

    function closeDrawer() {
        setSelectedDepartmentId(null);
        setSelectedDepartment(null);
        setDrawerMode('view');
    }

    async function handleSubmit(e) {
        e.preventDefault();
        setSubmitting(true);

        try {
            const payload = {
                name: formData.name,
                payroll_frequency: formData.payrollFrequency || null,
                is_active: formData.isActive,
                // Work schedule data
                work_schedule: {
                    work_start_time: formData.workStartTime,
                    work_end_time: formData.workEndTime,
                    break_start_time: formData.breakStartTime || null,
                    break_end_time: formData.breakEndTime || null,
                    grace_period_minutes: formData.gracePeriodMinutes,
                },
            };

            if (drawerMode === 'create') {
                await axios.post('/api/departments', payload);
                alert('Department created successfully');
            } else {
                await axios.put(`/api/departments/${selectedDepartmentId}`, payload);
                alert('Department updated successfully');
            }

            await fetchDepartments();
            closeDrawer();
        } catch (error) {
            console.error('Error saving department:', error);
            alert(error.response?.data?.message || 'Failed to save department');
        } finally {
            setSubmitting(false);
        }
    }

    async function handleDelete() {
        if (!selectedDepartmentId) return;

        if (!confirm('Are you sure you want to delete this department? This action cannot be undone.')) {
            return;
        }

        try {
            await axios.delete(`/api/departments/${selectedDepartmentId}`);
            alert('Department deleted successfully');
            await fetchDepartments();
            closeDrawer();
        } catch (error) {
            console.error('Error deleting department:', error);
            alert(error.response?.data?.message || 'Failed to delete department');
        }
    }

    function getPayrollFrequencyLabel(value) {
        const freq = PAYROLL_FREQUENCIES.find(f => f.value === value);
        return freq ? freq.label : value || 'Not Set';
    }

    function showEmployees(dept) {
        setModalDepartmentName(dept.name);
        setModalEmployees(dept.employees || []);
        setShowEmployeesModal(true);
    }

    function closeEmployeesModal() {
        setShowEmployeesModal(false);
        setModalEmployees([]);
        setModalDepartmentName('');
    }

    return (
        <AdminLayout title="Manage Departments">
            <Head title="Manage Departments" />

            <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
                <div>
                    <h2 className="text-lg font-semibold text-[#334155]">Departments</h2>
                    <p className="mt-1 text-sm text-slate-500">
                        Manage department information, payroll frequency, and status.
                    </p>
                </div>
                <button
                    type="button"
                    onClick={openCreateDrawer}
                    className="inline-flex items-center gap-2 rounded-md bg-[#1E3A8A] px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-[#1E3A8A]/90"
                >
                    <span className="text-base leading-none">+</span>
                    <span>Add Department</span>
                </button>
            </div>

            {stats && (
                <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-xs font-medium text-slate-600">Total Departments</p>
                                <p className="mt-1 text-2xl font-semibold text-slate-900">{stats.total_departments}</p>
                            </div>
                            <div className="rounded-full bg-blue-100 p-3">
                                <svg className="h-6 w-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                                </svg>
                            </div>
                        </div>
                    </div>

                    <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-xs font-medium text-slate-600">Active Departments</p>
                                <p className="mt-1 text-2xl font-semibold text-green-600">{stats.active_departments}</p>
                            </div>
                            <div className="rounded-full bg-green-100 p-3">
                                <svg className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                            </div>
                        </div>
                    </div>

                    <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-xs font-medium text-slate-600">Inactive Departments</p>
                                <p className="mt-1 text-2xl font-semibold text-slate-600">{stats.inactive_departments}</p>
                            </div>
                            <div className="rounded-full bg-slate-100 p-3">
                                <svg className="h-6 w-6 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                                </svg>
                            </div>
                        </div>
                    </div>

                    <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-xs font-medium text-slate-600">Total Employees</p>
                                <p className="mt-1 text-2xl font-semibold text-[#1E3A8A]">{stats.total_employees}</p>
                            </div>
                            <div className="rounded-full bg-blue-50 p-3">
                                <svg className="h-6 w-6 text-[#1E3A8A]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                                </svg>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <div className="mb-4 flex flex-wrap items-center gap-3">
                <div className="w-full max-w-xs">
                    <label className="mb-1 block text-xs font-medium text-slate-600">
                        Status
                    </label>
                    <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm focus:border-[#1E3A8A] focus:outline-none focus:ring-1 focus:ring-[#1E3A8A]"
                    >
                        <option value="all">All Departments</option>
                        <option value="active">Active Only</option>
                        <option value="inactive">Inactive Only</option>
                    </select>
                </div>
                <div className="w-full max-w-sm">
                    <label className="mb-1 block text-xs font-medium text-slate-600">
                        Search department
                    </label>
                    <input
                        type="text"
                        placeholder="Search by name"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm focus:border-[#1E3A8A] focus:outline-none focus:ring-1 focus:ring-[#1E3A8A]"
                    />
                </div>
            </div>

            <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white shadow-sm">
                <table className="min-w-full text-left text-sm">
                    <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                        <tr>
                            <th className="px-4 py-3 font-medium">Department Name</th>
                            <th className="px-4 py-3 font-medium">Payroll Frequency</th>
                            <th className="px-4 py-3 font-medium">No. of Employees</th>
                            <th className="px-4 py-3 font-medium">Status</th>
                            <th className="px-4 py-3 font-medium">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {filteredDepartments.map((dept) => (
                            <tr
                                key={dept.id}
                                className="cursor-pointer transition hover:bg-slate-50"
                                onClick={() => {
                                    setSelectedDepartmentId(dept.id);
                                    setDrawerMode('view');
                                }}
                            >
                                <td className="whitespace-nowrap px-4 py-3 font-medium text-slate-900">
                                    {dept.name}
                                </td>
                                <td className="whitespace-nowrap px-4 py-3 text-slate-700">
                                    {getPayrollFrequencyLabel(dept.payroll_frequency)}
                                </td>
                                <td className="whitespace-nowrap px-4 py-3">
                                    <button
                                        onClick={async (e) => {
                                            e.stopPropagation();
                                            const response = await axios.get(`/api/departments/${dept.id}`);
                                            showEmployees({
                                                ...dept,
                                                employees: response.data.employees || []
                                            });
                                        }}
                                        className="inline-flex items-center gap-1 rounded-md bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700 transition hover:bg-blue-100"
                                    >
                                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                                        </svg>
                                        <span>{dept.employees_count || 0}</span>
                                    </button>
                                </td>
                                <td className="whitespace-nowrap px-4 py-3">
                                    <span
                                        className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${
                                            dept.is_active
                                                ? 'bg-green-100 text-green-700'
                                                : 'bg-slate-100 text-slate-600'
                                        }`}
                                    >
                                        {dept.is_active ? 'Active' : 'Inactive'}
                                    </span>
                                </td>
                                <td
                                    className="whitespace-nowrap px-4 py-3 text-xs"
                                    onClick={(e) => e.stopPropagation()}
                                >
                                    <button
                                        onClick={() => openEditDrawer(dept)}
                                        className="text-[#1E3A8A] hover:underline"
                                    >
                                        Edit
                                    </button>
                                </td>
                            </tr>
                        ))}
                        {filteredDepartments.length === 0 && (
                            <tr>
                                <td
                                    colSpan={5}
                                    className="px-4 py-6 text-center text-sm text-slate-500"
                                >
                                    No departments found for the selected filters.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {(drawerMode === 'create' || selectedDepartmentId) && (
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
                                        ? 'New Department'
                                        : drawerMode === 'edit'
                                          ? 'Edit Department'
                                          : selectedDepartment?.name || 'Loading...'}
                                </div>
                                <div className="text-xs text-slate-500">
                                    {drawerMode === 'create'
                                        ? 'Fill in the details below'
                                        : drawerMode === 'edit'
                                          ? 'Update department information'
                                          : 'Department details'}
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

                        {drawerMode === 'view' && (
                            <div className="flex-1 overflow-y-auto px-5 py-5">
                                {loadingDepartment ? (
                                    <div className="py-12 text-center text-sm text-slate-500">
                                        Loading department details...
                                    </div>
                                ) : selectedDepartment ? (
                                    <div className="space-y-6">
                                        <div>
                                            <label className="mb-1.5 block text-xs font-medium text-slate-600">
                                                Department Name
                                            </label>
                                            <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900">
                                                {selectedDepartment.name}
                                            </div>
                                        </div>

                                        <div>
                                            <label className="mb-1.5 block text-xs font-medium text-slate-600">
                                                Payroll Frequency
                                            </label>
                                            <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900">
                                                {getPayrollFrequencyLabel(selectedDepartment.payrollFrequency)}
                                            </div>
                                        </div>

                                        <div>
                                            <label className="mb-1.5 block text-xs font-medium text-slate-600">
                                                Status
                                            </label>
                                            <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                                                <span
                                                    className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${
                                                        selectedDepartment.isActive
                                                            ? 'bg-green-100 text-green-700'
                                                            : 'bg-slate-100 text-slate-600'
                                                    }`}
                                                >
                                                    {selectedDepartment.isActive ? 'Active' : 'Inactive'}
                                                </span>
                                            </div>
                                        </div>

                                        <div>
                                            <label className="mb-1.5 block text-xs font-medium text-slate-600">
                                                Number of Employees
                                            </label>
                                            <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                                                <button
                                                    onClick={() => showEmployees(selectedDepartment)}
                                                    className="inline-flex items-center gap-2 text-sm font-medium text-[#1E3A8A] transition hover:underline"
                                                >
                                                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                                                    </svg>
                                                    <span>{selectedDepartment.employeesCount || 0} {selectedDepartment.employeesCount === 1 ? 'employee' : 'employees'}</span>
                                                </button>
                                            </div>
                                        </div>

                                        {selectedDepartment.createdAt && (
                                            <div>
                                                <label className="mb-1.5 block text-xs font-medium text-slate-600">
                                                    Created At
                                                </label>
                                                <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
                                                    {new Date(selectedDepartment.createdAt).toLocaleString()}
                                                </div>
                                            </div>
                                        )}

                                        {selectedDepartment.updatedAt && (
                                            <div>
                                                <label className="mb-1.5 block text-xs font-medium text-slate-600">
                                                    Last Updated
                                                </label>
                                                <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
                                                    {new Date(selectedDepartment.updatedAt).toLocaleString()}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                ) : null}
                            </div>
                        )}

                        {(drawerMode === 'create' || drawerMode === 'edit') && (
                            <form className="flex min-h-0 flex-1 flex-col" onSubmit={handleSubmit}>
                                <div className="flex-1 overflow-y-auto px-5 py-5">
                                    <div className="space-y-4">
                                        <div>
                                            <label className="mb-1.5 block text-xs font-medium text-slate-600">
                                                Department Name <span className="text-red-500">*</span>
                                            </label>
                                            <input
                                                type="text"
                                                required
                                                value={formData.name}
                                                onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                                                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm focus:border-[#1E3A8A] focus:outline-none focus:ring-2 focus:ring-[#1E3A8A]/20"
                                                placeholder="e.g., Human Resources"
                                            />
                                        </div>

                                        <div>
                                            <label className="mb-1.5 block text-xs font-medium text-slate-600">
                                                Payroll Frequency <span className="text-red-500">*</span>
                                            </label>
                                            <select
                                                required
                                                value={formData.payrollFrequency}
                                                onChange={(e) => setFormData((prev) => ({ ...prev, payrollFrequency: e.target.value }))}
                                                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm focus:border-[#1E3A8A] focus:outline-none focus:ring-2 focus:ring-[#1E3A8A]/20"
                                            >
                                                <option value="">Select frequency</option>
                                                {PAYROLL_FREQUENCIES.map((freq) => (
                                                    <option key={freq.value} value={freq.value}>
                                                        {freq.label}
                                                    </option>
                                                ))}
                                            </select>
                                            <p className="mt-1 text-xs text-slate-500">
                                                How often employees in this department are paid
                                            </p>
                                        </div>

                                        <div>
                                            <label className="mb-1.5 flex items-center gap-2 text-xs font-medium text-slate-600">
                                                <input
                                                    type="checkbox"
                                                    checked={formData.isActive}
                                                    onChange={(e) => setFormData((prev) => ({ ...prev, isActive: e.target.checked }))}
                                                    className="h-4 w-4 rounded border-slate-300 text-[#1E3A8A] focus:ring-2 focus:ring-[#1E3A8A]/20"
                                                />
                                                <span>Active Department</span>
                                            </label>
                                            <p className="ml-6 mt-1 text-xs text-slate-500">
                                                Inactive departments won't appear in employee assignment dropdowns
                                            </p>
                                        </div>

                                        {/* Work Schedule Section */}
                                        <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 mt-6">
                                            <h4 className="text-sm font-semibold text-slate-900 mb-4">Work Schedule</h4>
                                            
                                            {/* Work Hours */}
                                            <div className="grid grid-cols-2 gap-4 mb-4">
                                                <div>
                                                    <label className="mb-1.5 block text-xs font-medium text-slate-600">
                                                        Work Start Time <span className="text-red-500">*</span>
                                                    </label>
                                                    <input
                                                        type="time"
                                                        required
                                                        value={formData.workStartTime}
                                                        onChange={(e) => setFormData((prev) => ({ ...prev, workStartTime: e.target.value }))}
                                                        className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm focus:border-[#1E3A8A] focus:outline-none focus:ring-2 focus:ring-[#1E3A8A]/20"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="mb-1.5 block text-xs font-medium text-slate-600">
                                                        Work End Time <span className="text-red-500">*</span>
                                                    </label>
                                                    <input
                                                        type="time"
                                                        required
                                                        value={formData.workEndTime}
                                                        onChange={(e) => setFormData((prev) => ({ ...prev, workEndTime: e.target.value }))}
                                                        className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm focus:border-[#1E3A8A] focus:outline-none focus:ring-2 focus:ring-[#1E3A8A]/20"
                                                    />
                                                </div>
                                            </div>

                                            {/* Break Times */}
                                            <div className="grid grid-cols-2 gap-4 mb-4">
                                                <div>
                                                    <label className="mb-1.5 block text-xs font-medium text-slate-600">
                                                        Break Start Time
                                                    </label>
                                                    <input
                                                        type="time"
                                                        value={formData.breakStartTime}
                                                        onChange={(e) => setFormData((prev) => ({ ...prev, breakStartTime: e.target.value }))}
                                                        className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm focus:border-[#1E3A8A] focus:outline-none focus:ring-2 focus:ring-[#1E3A8A]/20"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="mb-1.5 block text-xs font-medium text-slate-600">
                                                        Break End Time
                                                    </label>
                                                    <input
                                                        type="time"
                                                        value={formData.breakEndTime}
                                                        onChange={(e) => setFormData((prev) => ({ ...prev, breakEndTime: e.target.value }))}
                                                        className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm focus:border-[#1E3A8A] focus:outline-none focus:ring-2 focus:ring-[#1E3A8A]/20"
                                                    />
                                                </div>
                                            </div>

                                            {/* Grace Period */}
                                            <div>
                                                <label className="mb-1.5 block text-xs font-medium text-slate-600">
                                                    Grace Period (minutes)
                                                </label>
                                                <input
                                                    type="number"
                                                    min="0"
                                                    max="60"
                                                    value={formData.gracePeriodMinutes}
                                                    onChange={(e) => setFormData((prev) => ({ ...prev, gracePeriodMinutes: parseInt(e.target.value) || 0 }))}
                                                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm focus:border-[#1E3A8A] focus:outline-none focus:ring-2 focus:ring-[#1E3A8A]/20"
                                                />
                                                <p className="mt-1 text-xs text-slate-500">
                                                    Late grace period for disciplinary letters (not for payroll)
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="shrink-0 border-t border-slate-200 px-5 py-4">
                                    <div className="flex items-center justify-between gap-3">
                                        {drawerMode === 'edit' && (
                                            <button
                                                type="button"
                                                onClick={handleDelete}
                                                className="rounded-md border border-red-300 bg-white px-4 py-2 text-sm font-medium text-red-600 shadow-sm transition hover:bg-red-50"
                                            >
                                                Delete
                                            </button>
                                        )}
                                        <div className="ml-auto flex gap-3">
                                            <button
                                                type="button"
                                                onClick={closeDrawer}
                                                className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50"
                                            >
                                                Cancel
                                            </button>
                                            <button
                                                type="submit"
                                                disabled={submitting}
                                                className="rounded-md bg-[#1E3A8A] px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-[#1E3A8A]/90 disabled:opacity-50"
                                            >
                                                {submitting ? 'Saving...' : drawerMode === 'create' ? 'Create' : 'Update'}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </form>
                        )}

                        {drawerMode === 'view' && selectedDepartment && (
                            <div className="shrink-0 border-t border-slate-200 px-5 py-4">
                                <div className="flex items-center justify-between gap-3">
                                    <button
                                        type="button"
                                        onClick={handleDelete}
                                        className="rounded-md border border-red-300 bg-white px-4 py-2 text-sm font-medium text-red-600 shadow-sm transition hover:bg-red-50"
                                    >
                                        Delete
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => openEditDrawer(selectedDepartment)}
                                        className="rounded-md bg-[#1E3A8A] px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-[#1E3A8A]/90"
                                    >
                                        Edit Department
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </>
            )}

            {showEmployeesModal && (
                <>
                    <div
                        className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm"
                        onClick={closeEmployeesModal}
                    />
                    <div className="fixed left-1/2 top-1/2 z-50 w-full max-w-2xl -translate-x-1/2 -translate-y-1/2 rounded-lg border border-slate-200 bg-white shadow-xl">
                        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
                            <div>
                                <h3 className="text-lg font-semibold text-slate-900">
                                    Employees in {modalDepartmentName}
                                </h3>
                                <p className="mt-1 text-sm text-slate-500">
                                    {modalEmployees.length} {modalEmployees.length === 1 ? 'employee' : 'employees'}
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={closeEmployeesModal}
                                className="rounded-md p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
                            >
                                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        <div className="max-h-96 overflow-y-auto p-6">
                            {modalEmployees.length === 0 ? (
                                <div className="py-12 text-center text-sm text-slate-500">
                                    No employees in this department
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    {modalEmployees.map((emp) => (
                                        <div
                                            key={emp.id}
                                            className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 transition hover:bg-slate-100"
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#1E3A8A] text-sm font-medium text-white">
                                                    {emp.first_name?.[0]}{emp.last_name?.[0]}
                                                </div>
                                                <div>
                                                    <p className="text-sm font-medium text-slate-900">
                                                        {emp.last_name}, {emp.first_name}
                                                    </p>
                                                    <p className="text-xs text-slate-500">
                                                        {emp.employee_code}
                                                    </p>
                                                </div>
                                            </div>
                                            <span
                                                className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${
                                                    emp.employment_status === 'ACTIVE'
                                                        ? 'bg-green-100 text-green-700'
                                                        : 'bg-slate-100 text-slate-600'
                                                }`}
                                            >
                                                {emp.employment_status}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        <div className="border-t border-slate-200 px-6 py-4">
                            <button
                                type="button"
                                onClick={closeEmployeesModal}
                                className="w-full rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </>
            )}
        </AdminLayout>
    );
}
