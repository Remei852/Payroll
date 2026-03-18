import AdminLayout from '@/Layouts/AdminLayout';
import { Head, router, usePage } from '@inertiajs/react';
import { useState, useRef, useEffect } from 'react';
import ViolationLetterModal from '@/Components/ViolationLetterModal';

export default function AttendanceRecords() {
    const { flash, attendanceSummary, dateRange, gapInfo } = usePage().props;
    const fileInputRef = useRef(null);
    const [uploading, setUploading] = useState(false);
    const [selectedEmployee, setSelectedEmployee] = useState(null);
    const [showDetailModal, setShowDetailModal] = useState(false);
    const [showGapWarningModal, setShowGapWarningModal] = useState(false);
    const [gapWarningData, setGapWarningData] = useState(null);
    const [dateRangeError, setDateRangeError] = useState(null);
    const [showLetterModal, setShowLetterModal] = useState(false);
    const [selectedEmployeeForLetter, setSelectedEmployeeForLetter] = useState(null);
    const [filters, setFilters] = useState({
        search: '',
        department: '',
        status: '',
        dateFrom: '',
        dateTo: '',
    });

    // Show gap warning modal after CSV upload if gaps detected
    useEffect(() => {
        if (flash?.success && flash?.gapInfo && flash.gapInfo.has_gaps) {
            setGapWarningData(flash.gapInfo);
            setShowGapWarningModal(true);
        }
    }, [flash]);

    function handleUploadClick() {
        fileInputRef.current?.click();
    }

    function handleFileChange(e) {
        const file = e.target.files[0];
        if (!file) return;

        // Validate file type
        if (!file.name.endsWith('.csv')) {
            alert('Please select a CSV file');
            return;
        }

        // Auto-upload
        const formData = new FormData();
        formData.append('file', file);
        setUploading(true);

        router.post(route('admin.attendance.store-upload'), formData, {
            onFinish: () => {
                setUploading(false);
                // Reset file input
                if (fileInputRef.current) {
                    fileInputRef.current.value = '';
                }
            },
        });
    }

    // Get unique departments for filter
    const departments = attendanceSummary 
        ? [...new Set(attendanceSummary.map(emp => emp.department))].sort()
        : [];

    // Filter employees based on search and filters
    const filteredEmployees = attendanceSummary ? attendanceSummary.filter(emp => {
        // Search filter (name or code)
        if (filters.search) {
            const searchLower = filters.search.toLowerCase();
            const matchesSearch = 
                emp.employee_name.toLowerCase().includes(searchLower) ||
                emp.employee_code.toLowerCase().includes(searchLower);
            if (!matchesSearch) return false;
        }

        // Department filter
        if (filters.department && emp.department !== filters.department) {
            return false;
        }

        // Status filter (check if any record has this status)
        if (filters.status) {
            const hasStatus = emp.records.some(record => 
                record.status.toLowerCase().includes(filters.status.toLowerCase())
            );
            if (!hasStatus) return false;
        }

        // Date range filter
        if (filters.dateFrom || filters.dateTo) {
            const hasRecordInRange = emp.records.some(record => {
                const recordDate = new Date(record.attendance_date);
                const fromDate = filters.dateFrom ? new Date(filters.dateFrom) : null;
                const toDate = filters.dateTo ? new Date(filters.dateTo) : null;

                if (fromDate && recordDate < fromDate) return false;
                if (toDate && recordDate > toDate) return false;
                return true;
            });
            if (!hasRecordInRange) return false;
        }

        return true;
    }).map(emp => {
        // If date filters are active, recalculate summary statistics for the filtered date range
        if (filters.dateFrom || filters.dateTo) {
            const filteredRecords = emp.records.filter(record => {
                const recordDate = new Date(record.attendance_date);
                const fromDate = filters.dateFrom ? new Date(filters.dateFrom) : null;
                const toDate = filters.dateTo ? new Date(filters.dateTo) : null;

                if (fromDate && recordDate < fromDate) return false;
                if (toDate && recordDate > toDate) return false;
                return true;
            });

            // Recalculate totals based on filtered records
            const totalWorkdays = filteredRecords.reduce((sum, r) => sum + (parseFloat(r.rendered) || 0), 0);
            const totalAbsences = filteredRecords.filter(r => r.status === 'Absent').length;
            const halfDayCount = filteredRecords.filter(r => r.status.includes('Half Day')).length;
            const totalAbsenceDays = totalAbsences + (halfDayCount * 0.5);
            const totalLateMinutes = filteredRecords.reduce((sum, r) => sum + (r.total_late_minutes || 0), 0);
            const totalOvertimeMinutes = filteredRecords.reduce((sum, r) => sum + (r.overtime_minutes || 0), 0);
            const totalMissedLogs = filteredRecords.filter(r => r.missed_logs_count > 0 && r.status !== 'Absent').length;
            const lateFrequency = filteredRecords.filter(r => r.total_late_minutes > 0).length;

            return {
                ...emp,
                total_workdays: totalWorkdays.toFixed(2),
                total_absences: totalAbsenceDays,
                total_late_minutes: totalLateMinutes,
                total_overtime_minutes: totalOvertimeMinutes,
                total_missed_logs: totalMissedLogs,
                late_frequency: lateFrequency,
                records: filteredRecords
            };
        }

        return emp;
    }) : [];

    function clearFilters() {
        setFilters({
            search: '',
            department: '',
            status: '',
            dateFrom: '',
            dateTo: '',
        });
        setDateRangeError(null);
    }

    // Validate date range against gaps
    function validateDateFilter(dateFrom, dateTo) {
        if (!dateFrom || !dateTo) {
            return true;
        }

        if (!gapInfo || !gapInfo.has_gaps) {
            return true;
        }

        // Check if selected range spans across any gap
        const selectedStart = new Date(dateFrom);
        const selectedEnd = new Date(dateTo);

        for (const gap of gapInfo.gaps) {
            const gapStart = new Date(gap.start);
            const gapEnd = new Date(gap.end);

            // Check if the selected range overlaps with this gap
            if (selectedStart <= gapEnd && selectedEnd >= gapStart) {
                // Show popup error
                alert(`❌ Cannot filter across date gap!\n\nMissing data: ${gap.start_formatted} - ${gap.end_formatted}\n\nPlease select a date range within one of these continuous periods:\n${gapInfo.continuous_ranges.map(r => `• ${r.start_formatted} - ${r.end_formatted}`).join('\n')}`);
                
                // Clear the invalid date filters
                setFilters({
                    ...filters,
                    dateFrom: '',
                    dateTo: ''
                });
                
                return false;
            }
        }

        return true;
    }

    // Handle date filter changes with validation
    function handleDateFilterChange(field, value) {
        const newFilters = { ...filters, [field]: value };
        setFilters(newFilters);
    }

    // Validate when user finishes entering both dates (onBlur)
    function handleDateBlur() {
        // Removed - validation now happens on Apply Filter button click
    }

    // Apply filters with validation
    function applyFilters() {
        if (filters.dateFrom && filters.dateTo) {
            const isValid = validateDateFilter(filters.dateFrom, filters.dateTo);
            if (!isValid) {
                return; // Don't apply if invalid
            }
        }
        // Filters are already set in state, just trigger re-render
        // The filteredEmployees will automatically update
    }

    function getRowColorClass(emp) {
        // Priority 1: Missing logs - RED
        if (emp.total_missed_logs > 0) {
            return 'bg-red-50 hover:bg-red-100';
        }
        // Priority 2: Has lates - ORANGE
        if (emp.late_frequency > 0 || emp.total_late_minutes > 0) {
            return 'bg-orange-50 hover:bg-orange-100';
        }
        // Priority 3: Complete/Normal - WHITE (default)
        return 'hover:bg-slate-50';
    }

    function formatTime(minutes) {
        if (!minutes || minutes === 0) return '00:00';
        const hours = Math.floor(Math.abs(minutes) / 60);
        const mins = Math.abs(minutes) % 60;
        return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
    }

    function viewDetails(employee) {
        // Records are already filtered by the main filter logic
        // Just sort them by date in ascending order (oldest first)
        const sortedRecords = [...employee.records].sort((a, b) => {
            return new Date(a.attendance_date) - new Date(b.attendance_date);
        });
        
        setSelectedEmployee({
            ...employee,
            records: sortedRecords
        });
        setShowDetailModal(true);
    }

    function closeModal() {
        setShowDetailModal(false);
        setSelectedEmployee(null);
    }

    function getStatusBadge(status) {
        // Handle multiple statuses (e.g., "Late, Undertime")
        const statusParts = status.split(',').map(s => s.trim());
        
        return (
            <div className="flex flex-wrap gap-1">
                {statusParts.map((part, idx) => {
                    const badges = {
                        'Present': 'bg-green-100 text-green-700',
                        'Late': 'bg-yellow-100 text-yellow-700',
                        'Absent': 'bg-red-100 text-red-700',
                        'Half Day': 'bg-orange-100 text-orange-700',
                        'Undertime': 'bg-purple-100 text-purple-700',
                        'Missed Log': 'bg-pink-100 text-pink-700',
                        'Present - Holiday': 'bg-blue-100 text-blue-700',
                        'Absent - Holiday': 'bg-slate-100 text-slate-700',
                        'Absent - Holiday Pay': 'bg-slate-100 text-slate-700',
                        'Present - Sunday Work': 'bg-indigo-100 text-indigo-700',
                        'Present - Unauthorized Work Day': 'bg-amber-100 text-amber-700',
                    };

                    return (
                        <span 
                            key={idx}
                            className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${badges[part] || 'bg-slate-100 text-slate-600'}`}
                        >
                            {part}
                        </span>
                    );
                })}
            </div>
        );
    }

    function getDetailRowColorClass(record) {
        const status = record.status.toLowerCase();
        
        // Priority 1: Missing logs - RED
        if (record.missed_logs_count > 0 || status.includes('missed log')) {
            return 'bg-red-50';
        }
        // Priority 2: Has lates - ORANGE
        if (status.includes('late') || record.total_late_minutes > 0) {
            return 'bg-orange-50';
        }
        // Priority 3: Complete/Normal - WHITE (default)
        return 'hover:bg-slate-50';
    }

    return (
        <AdminLayout title="Attendance Records">
            <Head title="Attendance Records" />

            <div className="mb-6 flex items-center justify-between">
                <div>
                    <h2 className="text-lg font-semibold text-[#334155]">Attendance Records</h2>
                    <p className="mt-1 text-sm text-slate-500">
                        Upload CSV files to process attendance data
                    </p>
                    {dateRange && dateRange.start && dateRange.end && (
                        <div className="mt-2 inline-flex items-center gap-2 rounded-md bg-blue-50 px-3 py-1.5 text-sm">
                            <svg className="h-4 w-4 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                            <span className="font-medium text-blue-900">
                                Data Range: {dateRange.start_formatted} - {dateRange.end_formatted}
                            </span>
                            <span className="text-blue-700">
                                ({dateRange.total_days} days)
                            </span>
                        </div>
                    )}
                </div>
                <div className="flex items-center gap-3">
                    <button
                        type="button"
                        onClick={handleUploadClick}
                        disabled={uploading}
                        className="inline-flex items-center gap-2 rounded-md bg-[#1E3A8A] px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-[#1E3A8A]/90 disabled:opacity-50"
                    >
                        {uploading ? (
                            <>
                                <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                </svg>
                                <span>Processing...</span>
                            </>
                        ) : (
                            <>
                                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                                </svg>
                                <span>Upload CSV</span>
                            </>
                        )}
                    </button>
                </div>
                <input
                    ref={fileInputRef}
                    type="file"
                    accept=".csv"
                    onChange={handleFileChange}
                    className="hidden"
                />
            </div>

            {flash?.success && (
                <div className="mb-4 rounded-md border border-green-200 bg-green-50 p-4">
                    <p className="text-sm font-medium text-green-800">{flash.success.message}</p>
                    {flash.success.uploadResults && (
                        <div className="mt-2 text-xs text-green-700">
                            <p>Uploaded: {flash.success.uploadResults.success} logs</p>
                            {flash.success.uploadResults.errors > 0 && (
                                <p>Errors: {flash.success.uploadResults.errors}</p>
                            )}
                        </div>
                    )}
                </div>
            )}

            {flash?.errors?.file && (
                <div className="mb-4 rounded-md border border-red-200 bg-red-50 p-4">
                    <p className="text-sm font-medium text-red-800">{flash.errors.file}</p>
                </div>
            )}

            {/* Filters Section */}
            <div className="mb-4 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
                <div className="mb-3 flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-slate-700">Filters</h3>
                    <button
                        onClick={clearFilters}
                        className="text-xs text-[#1E3A8A] hover:underline"
                    >
                        Clear All
                    </button>
                </div>
                <div className="flex flex-wrap items-end gap-3">
                    <div className="flex-1 min-w-[200px]">
                        <label className="mb-1 block text-xs font-medium text-slate-600">
                            Search Employee
                        </label>
                        <input
                            type="text"
                            value={filters.search}
                            onChange={(e) => setFilters({...filters, search: e.target.value})}
                            placeholder="Name or Code"
                            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-[#1E3A8A] focus:outline-none focus:ring-1 focus:ring-[#1E3A8A]"
                        />
                    </div>
                    <div className="flex-1 min-w-[200px]">
                        <label className="mb-1 block text-xs font-medium text-slate-600">
                            Department
                        </label>
                        <select
                            value={filters.department}
                            onChange={(e) => setFilters({...filters, department: e.target.value})}
                            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-[#1E3A8A] focus:outline-none focus:ring-1 focus:ring-[#1E3A8A]"
                        >
                            <option value="">All Departments</option>
                            {departments.map(dept => (
                                <option key={dept} value={dept}>{dept}</option>
                            ))}
                        </select>
                    </div>
                    <div className="flex-1 min-w-[160px]">
                        <label className="mb-1 block text-xs font-medium text-slate-600">
                            Date From
                        </label>
                        <input
                            type="date"
                            value={filters.dateFrom}
                            onChange={(e) => handleDateFilterChange('dateFrom', e.target.value)}
                            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-[#1E3A8A] focus:outline-none focus:ring-1 focus:ring-[#1E3A8A]"
                        />
                    </div>
                    <div className="flex-1 min-w-[160px]">
                        <label className="mb-1 block text-xs font-medium text-slate-600">
                            Date To
                        </label>
                        <input
                            type="date"
                            value={filters.dateTo}
                            onChange={(e) => handleDateFilterChange('dateTo', e.target.value)}
                            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-[#1E3A8A] focus:outline-none focus:ring-1 focus:ring-[#1E3A8A]"
                        />
                    </div>
                    <div>
                        <button
                            type="button"
                            onClick={applyFilters}
                            className="flex h-[38px] w-[38px] items-center justify-center rounded-md border border-slate-300 bg-white text-[#1E3A8A] shadow-sm transition hover:bg-slate-50"
                            title="Apply Filters"
                        >
                            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                            </svg>
                        </button>
                    </div>
                </div>

                <div className="mt-3 text-xs text-slate-500">
                    Showing {filteredEmployees.length} of {attendanceSummary?.length || 0} employees
                </div>
            </div>

            {/* Summary Table */}
            {attendanceSummary && attendanceSummary.length > 0 ? (
                <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white shadow-sm">
                    <table className="min-w-full text-left text-sm">
                        <thead className="bg-[#1E3A8A] text-xs uppercase text-white">
                            <tr>
                                <th className="px-4 py-3 font-medium">Employee</th>
                                <th className="px-4 py-3 font-medium">Department</th>
                                <th className="px-4 py-3 font-medium text-center">Workday Rendered</th>
                                <th className="px-4 py-3 font-medium text-center">Total Absences</th>
                                <th className="px-4 py-3 font-medium text-center">Total Late (HH:MM)</th>
                                <th className="px-4 py-3 font-medium text-center">Total Undertime</th>
                                <th className="px-4 py-3 font-medium text-center">Total Overtime</th>
                                <th className="px-4 py-3 font-medium text-center">Total Missed Logs</th>
                                <th className="px-4 py-3 font-medium text-center">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {filteredEmployees.map((emp) => (
                                <tr key={emp.employee_id} className={`transition ${getRowColorClass(emp)}`}>
                                    <td className="whitespace-nowrap px-4 py-3">
                                        <div className="font-medium text-slate-900">{emp.employee_name}</div>
                                        <div className="text-xs text-slate-500">{emp.employee_code}</div>
                                    </td>
                                    <td className="whitespace-nowrap px-4 py-3 text-slate-700">
                                        {emp.department}
                                    </td>
                                    <td className="whitespace-nowrap px-4 py-3 text-center font-medium text-slate-900">
                                        {emp.total_workdays}
                                    </td>
                                    <td className="whitespace-nowrap px-4 py-3 text-center text-slate-700">
                                        {emp.total_absences}
                                    </td>
                                    <td className="whitespace-nowrap px-4 py-3 text-center text-slate-700">
                                        {formatTime(emp.total_late_minutes)}
                                    </td>
                                    <td className="whitespace-nowrap px-4 py-3 text-center text-slate-700">
                                        {formatTime(emp.total_undertime_minutes)}
                                    </td>
                                    <td className="whitespace-nowrap px-4 py-3 text-center text-slate-700">
                                        {formatTime(emp.total_overtime_minutes)}
                                    </td>
                                    <td className="whitespace-nowrap px-4 py-3 text-center">
                                        <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${
                                            emp.total_missed_logs > 0 ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'
                                        }`}>
                                            {emp.total_missed_logs}
                                        </span>
                                    </td>
                                    <td className="whitespace-nowrap px-4 py-3 text-center">
                                        <div className="flex items-center justify-center gap-3">
                                            <button
                                                onClick={() => viewDetails(emp)}
                                                className="text-[#1E3A8A] transition hover:text-[#1E3A8A]/80"
                                                title="View Details"
                                            >
                                                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                                </svg>
                                            </button>
                                            <button
                                                onClick={() => {
                                                    setSelectedEmployeeForLetter(emp.employee_id);
                                                    setShowLetterModal(true);
                                                }}
                                                className="text-green-600 transition hover:text-green-700"
                                                title="Generate Letter"
                                            >
                                                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                                </svg>
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            ) : (
                <div className="rounded-lg border border-slate-200 bg-white p-12 text-center shadow-sm">
                    <svg className="mx-auto h-12 w-12 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <h3 className="mt-2 text-sm font-medium text-slate-900">No attendance data</h3>
                    <p className="mt-1 text-sm text-slate-500">Upload a CSV file to get started</p>
                </div>
            )}

            {/* Detail Modal */}
            {showDetailModal && selectedEmployee && (
                <>
                    <div
                        className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm"
                        onClick={closeModal}
                    />
                    <div className="fixed left-1/2 top-1/2 z-50 w-full max-w-6xl -translate-x-1/2 -translate-y-1/2 rounded-lg border border-slate-200 bg-white shadow-xl">
                        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
                            <div>
                                <h3 className="text-lg font-semibold text-slate-900">
                                    {selectedEmployee.employee_name}
                                </h3>
                                <p className="mt-1 text-sm text-slate-500">
                                    {selectedEmployee.employee_code} • {selectedEmployee.department}
                                </p>
                                {(filters.dateFrom || filters.dateTo) && (
                                    <p className="mt-1 text-xs text-blue-600">
                                        Filtered: {filters.dateFrom || 'Start'} to {filters.dateTo || 'End'}
                                    </p>
                                )}
                            </div>
                            <button
                                type="button"
                                onClick={closeModal}
                                className="rounded-md p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
                            >
                                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        <div className="max-h-[70vh] overflow-y-auto p-6">
                            <div className="overflow-x-auto">
                                <table className="min-w-full text-left text-sm">
                                    <thead className="bg-[#1E3A8A] text-xs uppercase text-white">
                                        <tr>
                                            <th className="px-3 py-2 font-medium">Date</th>
                                            <th className="px-3 py-2 font-medium">Time In AM</th>
                                            <th className="px-3 py-2 font-medium">Time Out Lunch</th>
                                            <th className="px-3 py-2 font-medium">Time In PM</th>
                                            <th className="px-3 py-2 font-medium">Time Out PM</th>
                                            <th className="px-3 py-2 font-medium text-center">Late AM</th>
                                            <th className="px-3 py-2 font-medium text-center">Late PM</th>
                                            <th className="px-3 py-2 font-medium text-center">Total Late</th>
                                            <th className="px-3 py-2 font-medium text-center">Undertime</th>
                                            <th className="px-3 py-2 font-medium text-center">Overtime</th>
                                            <th className="px-3 py-2 font-medium text-center">Missed Logs</th>
                                            <th className="px-3 py-2 font-medium">Status</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {selectedEmployee.records && selectedEmployee.records.map((record) => (
                                            <tr key={record.id} className={getDetailRowColorClass(record)}>
                                                <td className="whitespace-nowrap px-3 py-2 font-medium text-slate-900">
                                                    {new Date(record.attendance_date).toLocaleDateString()}
                                                </td>
                                                <td className="whitespace-nowrap px-3 py-2 text-slate-700">
                                                    {record.time_in_am || '-'}
                                                </td>
                                                <td className="whitespace-nowrap px-3 py-2 text-slate-700">
                                                    {record.time_out_lunch || '-'}
                                                </td>
                                                <td className="whitespace-nowrap px-3 py-2 text-slate-700">
                                                    {record.time_in_pm || '-'}
                                                </td>
                                                <td className="whitespace-nowrap px-3 py-2 text-slate-700">
                                                    {record.time_out_pm || '-'}
                                                </td>
                                                <td className="whitespace-nowrap px-3 py-2 text-center text-slate-700">
                                                    {formatTime(record.late_minutes_am)}
                                                </td>
                                                <td className="whitespace-nowrap px-3 py-2 text-center text-slate-700">
                                                    {formatTime(record.late_minutes_pm)}
                                                </td>
                                                <td className="whitespace-nowrap px-3 py-2 text-center text-slate-700">
                                                    {formatTime(record.total_late_minutes)}
                                                </td>
                                                <td className="whitespace-nowrap px-3 py-2 text-center text-slate-700">
                                                    {formatTime(record.undertime_minutes)}
                                                </td>
                                                <td className="whitespace-nowrap px-3 py-2 text-center text-slate-700">
                                                    {formatTime(record.overtime_minutes)}
                                                </td>
                                                <td className="whitespace-nowrap px-3 py-2 text-center">
                                                    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${
                                                        record.missed_logs_count > 0 ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'
                                                    }`}>
                                                        {record.missed_logs_count}
                                                    </span>
                                                </td>
                                                <td className="whitespace-nowrap px-3 py-2">
                                                    {getStatusBadge(record.status)}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        <div className="border-t border-slate-200 px-6 py-4">
                            <button
                                type="button"
                                onClick={closeModal}
                                className="w-full rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </>
            )}

            {/* Gap Warning Modal (shown after CSV upload) */}
            {showGapWarningModal && gapWarningData && (
                <>
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
                        <div className="w-full max-w-2xl rounded-lg bg-white shadow-xl">
                            {/* Modal Header */}
                            <div className="border-b border-yellow-200 bg-yellow-50 px-6 py-4">
                                <div className="flex items-center gap-3">
                                    <svg className="h-8 w-8 flex-shrink-0 text-yellow-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                    </svg>
                                    <div>
                                        <h2 className="text-xl font-bold text-yellow-900">⚠️ Date Gaps Detected</h2>
                                        <p className="text-sm text-yellow-700">CSV uploaded successfully, but gaps remain in attendance data</p>
                                    </div>
                                </div>
                            </div>

                            {/* Modal Body */}
                            <div className="max-h-96 overflow-y-auto px-6 py-4">
                                <div className="rounded-lg border-2 border-yellow-300 bg-yellow-50 p-4">
                                    <p className="text-sm font-medium text-yellow-900">
                                        Missing attendance data for the following date ranges:
                                    </p>
                                    <div className="mt-3 space-y-2">
                                        {gapWarningData.gaps.map((gap, idx) => (
                                            <div key={idx} className="flex items-center justify-between rounded-md bg-white p-3 shadow-sm">
                                                <div className="flex items-center gap-3">
                                                    <svg className="h-5 w-5 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                                    </svg>
                                                    <span className="font-semibold text-slate-900">
                                                        {gap.start_formatted} - {gap.end_formatted}
                                                    </span>
                                                </div>
                                                <span className="rounded-full bg-red-100 px-3 py-1 text-sm font-medium text-red-800">
                                                    {gap.days} {gap.days === 1 ? 'day' : 'days'} missing
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <div className="mt-4 rounded-lg border-2 border-blue-300 bg-blue-50 p-4">
                                    <p className="text-sm font-medium text-blue-900">
                                        📌 Valid continuous date ranges (no gaps):
                                    </p>
                                    <div className="mt-3 space-y-2">
                                        {gapWarningData.continuous_ranges.map((range, idx) => (
                                            <div key={idx} className="flex items-center gap-3 rounded-md bg-white p-3 shadow-sm">
                                                <svg className="h-5 w-5 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                                </svg>
                                                <span className="font-semibold text-slate-900">
                                                    {range.start_formatted} - {range.end_formatted}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <div className="mt-4 rounded-lg border border-slate-300 bg-slate-50 p-4">
                                    <h3 className="font-semibold text-slate-900">⚠️ Important:</h3>
                                    <ul className="mt-2 space-y-1 text-sm text-slate-700">
                                        <li className="flex items-start gap-2">
                                            <span className="text-slate-400">•</span>
                                            <span>Attendance totals may be inaccurate until all missing data is uploaded</span>
                                        </li>
                                        <li className="flex items-start gap-2">
                                            <span className="text-slate-400">•</span>
                                            <span>You cannot filter across date gaps - only within continuous ranges</span>
                                        </li>
                                        <li className="flex items-start gap-2">
                                            <span className="text-slate-400">•</span>
                                            <span>Upload the missing CSV files to fill the gaps</span>
                                        </li>
                                    </ul>
                                </div>
                            </div>

                            {/* Modal Footer */}
                            <div className="border-t border-slate-200 px-6 py-4">
                                <button
                                    type="button"
                                    onClick={() => setShowGapWarningModal(false)}
                                    className="w-full rounded-md bg-yellow-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-yellow-700"
                                >
                                    I Understand
                                </button>
                            </div>
                        </div>
                    </div>
                </>
            )}

            {/* Violation Letter Modal */}
            <ViolationLetterModal
                isOpen={showLetterModal}
                onClose={() => {
                    setShowLetterModal(false);
                    setSelectedEmployeeForLetter(null);
                }}
                employeeId={selectedEmployeeForLetter}
                dateFilters={{
                    dateFrom: filters.dateFrom,
                    dateTo: filters.dateTo
                }}
            />
        </AdminLayout>
    );
}
