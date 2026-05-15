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
        if (!file.name.endsWith('.csv')) { alert('Please select a CSV file'); return; }
        const formData = new FormData();
        formData.append('file', file);
        setUploading(true);
        router.post(route('admin.attendance.store-upload'), formData, {
            onFinish: () => {
                setUploading(false);
                if (fileInputRef.current) { fileInputRef.current.value = ''; }
            },
        });
    }

    function formatTime(minutes) {
        if (!minutes || minutes === 0) return '00:00';
        const hours = Math.floor(Math.abs(minutes) / 60);
        const mins = Math.abs(minutes) % 60;
        return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
    }

    function viewDetails(employee) { setSelectedEmployee(employee); setShowDetailModal(true); }
    function closeModal() { setShowDetailModal(false); setSelectedEmployee(null); }

    function getStatusBadge(status) {
        const badges = {
            'COMPLETE': 'bg-emerald-50 text-emerald-700 shadow-sm shadow-emerald-100',
            'LATE': 'bg-amber-50 text-amber-700 shadow-sm shadow-amber-100',
            'ABSENT': 'bg-rose-50 text-rose-700 shadow-sm shadow-rose-100',
            'ABSENT_AM': 'bg-orange-50 text-orange-700',
            'ABSENT_PM': 'bg-orange-50 text-orange-700',
        };
        const labels = { 'COMPLETE': 'COMPLETE', 'LATE': 'LATE', 'ABSENT': 'ABSENT', 'ABSENT_AM': 'ABSENT AM', 'ABSENT_PM': 'ABSENT PM' };
        return (
            <span className={`inline-flex rounded-lg px-2.5 py-1 text-[9px] font-bold uppercase tracking-wider ${badges[status] || 'bg-slate-50 text-slate-500'}`}>
                {labels[status] || status}
            </span>
        );
    }

    return (
        <AdminLayout title="Upload Logs">
            <Head title="Attendance Records" />

            <div className="mb-8 flex flex-wrap items-center justify-between gap-4 px-1">
                <div>
                    <p className="text-[11px] font-bold text-[#1E3A8A] uppercase tracking-widest">
                        Attendance Records
                    </p>
                    <p className="mt-1.5 text-[13px] font-medium text-slate-500 max-w-xl">
                        Upload CSV files to process attendance data. The system will automatically map logs to employee identifiers.
                    </p>
                </div>
                <button type="button" onClick={handleUploadClick} disabled={uploading}
                    className="inline-flex items-center gap-3 rounded-2xl bg-[#1E3A8A] px-6 py-3 text-[12px] font-bold text-white uppercase tracking-widest shadow-xl shadow-blue-900/20 transition-all hover:bg-blue-800 active:scale-95 disabled:opacity-50">
                    {uploading ? (
                        <>
                            <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" /></svg>
                            <span>Processing...</span>
                        </>
                    ) : (
                        <>
                            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" /></svg>
                            <span>Upload CSV</span>
                        </>
                    )}
                </button>
                <input ref={fileInputRef} type="file" accept=".csv" onChange={handleFileChange} className="hidden" />
            </div>

            {flash?.success && (
                <div className="mb-6 rounded-2xl border border-emerald-100 bg-emerald-50/50 p-4 animate-in slide-in-from-top duration-300">
                    <p className="text-[11px] font-bold text-emerald-800 uppercase tracking-widest flex items-center gap-2">
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                        {flash.success.message}
                    </p>
                </div>
            )}

            {attendanceSummary && attendanceSummary.length > 0 ? (
                <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="min-w-full text-left">
                            <thead className="bg-[#1E3A8A] text-[9px] font-bold uppercase text-white tracking-widest">
                                <tr>
                                    <th className="px-6 py-4">Employee</th>
                                    <th className="px-6 py-4">Department</th>
                                    <th className="px-6 py-4 text-center">Workdays</th>
                                    <th className="px-6 py-4 text-center">Absences</th>
                                    <th className="px-6 py-4 text-center">Late (HH:MM)</th>
                                    <th className="px-6 py-4 text-center">Undertime</th>
                                    <th className="px-6 py-4 text-center">Overtime</th>
                                    <th className="px-6 py-4 text-center">Missed Logs</th>
                                    <th className="px-6 py-4 text-center">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 text-[11px] font-medium">
                                {attendanceSummary.map((emp) => (
                                    <tr key={emp.employee_id} className="transition hover:bg-slate-50/80">
                                        <td className="px-6 py-4">
                                            <div className="font-bold text-[#1E3A8A] uppercase tracking-tight">{emp.employee_name}</div>
                                            <div className="text-[9px] font-bold text-slate-300 mt-0.5">{emp.employee_code}</div>
                                        </td>
                                        <td className="px-6 py-4 text-slate-500 uppercase tracking-tight">{emp.department}</td>
                                        <td className="px-6 py-4 text-center font-bold text-slate-800">{emp.total_workdays}</td>
                                        <td className="px-6 py-4 text-center text-slate-600">{emp.total_absences}</td>
                                        <td className="px-6 py-4 text-center text-slate-600">{formatTime(emp.total_late_minutes)}</td>
                                        <td className="px-6 py-4 text-center text-slate-600">{formatTime(emp.total_undertime_minutes)}</td>
                                        <td className="px-6 py-4 text-center text-slate-600">{formatTime(emp.total_overtime_minutes)}</td>
                                        <td className="px-6 py-4 text-center">
                                            <span className={`inline-flex rounded-lg px-2 py-1 text-[10px] font-bold ${emp.total_missed_logs > 0 ? 'bg-rose-50 text-rose-700' : 'bg-emerald-50 text-emerald-700 opacity-30'}`}>
                                                {emp.total_missed_logs}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <button onClick={() => viewDetails(emp)}
                                                className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-[10px] font-bold text-slate-600 uppercase tracking-widest hover:border-[#1E3A8A] hover:text-[#1E3A8A] transition-all active:scale-95 shadow-sm">
                                                View
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            ) : (
                <div className="rounded-3xl border-2 border-dashed border-slate-100 bg-white py-24 text-center shadow-sm">
                    <div className="h-20 w-20 rounded-3xl bg-slate-50 flex items-center justify-center text-slate-200 mx-auto mb-6">
                        <svg className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                    </div>
                    <h3 className="text-[14px] font-bold text-slate-400 uppercase tracking-widest">No attendance data</h3>
                    <p className="mt-2 text-[11px] font-medium text-slate-300 uppercase tracking-tight">Upload a CSV file to get started</p>
                </div>
            )}

            {showDetailModal && selectedEmployee && (
                <>
                    <div className="fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-sm" onClick={closeModal} />
                    <div className="fixed left-1/2 top-1/2 z-50 w-full max-w-7xl -translate-x-1/2 -translate-y-1/2 rounded-3xl border border-slate-200 bg-white shadow-2xl animate-in zoom-in-95 duration-200 overflow-hidden">
                        <div className="flex h-24 items-center justify-between border-b border-slate-100 px-8 bg-slate-50/50">
                            <div className="flex items-center gap-5">
                                <div className="h-14 w-14 rounded-2xl bg-[#1E3A8A] flex items-center justify-center text-white shadow-xl shadow-blue-900/20">
                                    <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                                </div>
                                <div>
                                    <h3 className="text-[16px] font-bold text-slate-800 uppercase tracking-tight leading-none">{selectedEmployee.employee_name}</h3>
                                    <p className="mt-2 text-[11px] font-bold text-[#1E3A8A] uppercase tracking-widest">{selectedEmployee.employee_code} • {selectedEmployee.department.toUpperCase()}</p>
                                </div>
                            </div>
                            <button onClick={closeModal} className="h-12 w-12 rounded-2xl border border-slate-200 text-slate-400 transition-all hover:bg-white hover:text-slate-900 active:scale-90 flex items-center justify-center shadow-sm"><svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6" /></svg></button>
                        </div>

                        <div className="max-h-[60vh] overflow-y-auto p-8 scrollbar-hide">
                            <table className="min-w-full text-left">
                                <thead className="bg-slate-50 text-[9px] font-bold uppercase text-slate-400 tracking-widest border-b border-slate-100">
                                    <tr>
                                        <th className="px-4 py-3">Date</th>
                                        <th className="px-4 py-3">Time In AM</th>
                                        <th className="px-4 py-3 text-slate-300">Time Out L</th>
                                        <th className="px-4 py-3 text-slate-300">Time In P</th>
                                        <th className="px-4 py-3">Time Out PM</th>
                                        <th className="px-4 py-3 text-center">Late AM</th>
                                        <th className="px-4 py-3 text-center">Late PM</th>
                                        <th className="px-4 py-3 text-center">Total Late</th>
                                        <th className="px-4 py-3 text-center">OT</th>
                                        <th className="px-4 py-3">Status</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 text-[11px] font-medium">
                                    {selectedEmployee.records && selectedEmployee.records.map((record) => (
                                        <tr key={record.id} className="hover:bg-slate-50/50">
                                            <td className="px-4 py-4 font-bold text-slate-800">{new Date(record.attendance_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).toUpperCase()}</td>
                                            <td className="px-4 py-4 text-[#1E3A8A] font-bold">{record.time_in_am || '—'}</td>
                                            <td className="px-4 py-4 text-slate-300">{record.time_out_lunch || '—'}</td>
                                            <td className="px-4 py-4 text-slate-300">{record.time_in_pm || '—'}</td>
                                            <td className="px-4 py-4 text-slate-700">{record.time_out_pm || '—'}</td>
                                            <td className="px-4 py-4 text-center text-slate-500">{formatTime(record.late_minutes_am)}</td>
                                            <td className="px-4 py-4 text-center text-slate-500">{formatTime(record.late_minutes_pm)}</td>
                                            <td className="px-4 py-4 text-center font-bold text-slate-800">{formatTime(record.total_late_minutes)}</td>
                                            <td className="px-4 py-4 text-center text-emerald-600">{formatTime(record.overtime_minutes)}</td>
                                            <td className="px-4 py-4">{getStatusBadge(record.status)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        <div className="border-t border-slate-100 p-8 flex justify-end bg-slate-50/30">
                            <button onClick={closeModal} className="px-8 py-3.5 bg-slate-800 text-white rounded-2xl text-[11px] font-bold uppercase tracking-widest shadow-xl shadow-slate-900/20 active:scale-95 transition-all">Close</button>
                        </div>
                    </div>
                </>
            )}
        </AdminLayout>
    );
}
