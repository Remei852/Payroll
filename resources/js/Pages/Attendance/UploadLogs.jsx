import AdminLayout from '@/Layouts/AdminLayout';
import { Head, router, usePage } from '@inertiajs/react';
import { useState, useRef } from 'react';

export default function UploadLogs() {
    const { flash, attendanceSummary } = usePage().props;
    const fileInputRef = useRef(null);
    const [uploading, setUploading] = useState(false);
    const [selectedEmployee, setSelectedEmployee] = useState(null);
    const [showDetailModal, setShowDetailModal] = useState(false);

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

    function formatTime(minutes) {
        if (!minutes || minutes === 0) return '00:00';
        const hours = Math.floor(Math.abs(minutes) / 60);
        const mins = Math.abs(minutes) % 60;
        return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
    }

    function viewDetails(employee) {
        setSelectedEmployee(employee);
        setShowDetailModal(true);
    }

    function closeModal() {
        setShowDetailModal(false);
        setSelectedEmployee(null);
    }

    function getStatusBadge(status) {
        const badges = {
            'COMPLETE': 'bg-green-100 text-green-700',
            'LATE': 'bg-yellow-100 text-yellow-700',
            'ABSENT': 'bg-red-100 text-red-700',
            'ABSENT_AM': 'bg-orange-100 text-orange-700',
            'ABSENT_PM': 'bg-orange-100 text-orange-700',
        };
        
        const labels = {
            'COMPLETE': 'Complete',
            'LATE': 'Late',
            'ABSENT': 'Absent',
            'ABSENT_AM': 'Absent AM',
            'ABSENT_PM': 'Absent PM',
        };

        return (
            <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${badges[status] || 'bg-slate-100 text-slate-600'}`}>
                {labels[status] || status}
            </span>
        );
    }

    return (
        <AdminLayout title="Upload Attendance Logs">
            <Head title="Upload Attendance Logs" />

            <div className="mb-6 flex items-center justify-between">
                <div>
                    <h2 className="text-lg font-semibold text-[#334155]">Attendance Records</h2>
                    <p className="mt-1 text-sm text-slate-500">
                        Upload CSV files to process attendance data
                    </p>
                </div>
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
                </div>
            )}

            {flash?.errors?.file && (
                <div className="mb-4 rounded-md border border-red-200 bg-red-50 p-4">
                    <p className="text-sm font-medium text-red-800">{flash.errors.file}</p>
                </div>
            )}

            {/* Summary Table */}
            {attendanceSummary && attendanceSummary.length > 0 ? (
                <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white shadow-sm">
                    <table className="min-w-full text-left text-sm">
                        <thead className="bg-slate-50 text-xs uppercase text-slate-500">
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
                            {attendanceSummary.map((emp) => (
                                <tr key={emp.employee_id} className="transition hover:bg-slate-50">
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
                                        <button
                                            onClick={() => viewDetails(emp)}
                                            className="text-[#1E3A8A] hover:underline"
                                        >
                                            View
                                        </button>
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
                                    <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                                        <tr>
                                            <th className="px-3 py-2 font-medium">Date</th>
                                            <th className="px-3 py-2 font-medium">Time In AM</th>
                                            <th className="px-3 py-2 font-medium">Time Out Lunch</th>
                                            <th className="px-3 py-2 font-medium">Time In PM</th>
                                            <th className="px-3 py-2 font-medium">Time Out PM</th>
                                            <th className="px-3 py-2 font-medium text-center">Late AM</th>
                                            <th className="px-3 py-2 font-medium text-center">Late PM</th>
                                            <th className="px-3 py-2 font-medium text-center">Total Late</th>
                                            <th className="px-3 py-2 font-medium text-center">Overtime</th>
                                            <th className="px-3 py-2 font-medium">Status</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {selectedEmployee.records && selectedEmployee.records.map((record) => (
                                            <tr key={record.id} className="hover:bg-slate-50">
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
                                                    {formatTime(record.overtime_minutes)}
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
        </AdminLayout>
    );
}
