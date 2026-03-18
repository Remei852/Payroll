import { useState, Fragment } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { router } from '@inertiajs/react';

export default function ViolationDetailsModal({ 
    violation, 
    isOpen, 
    onClose, 
    onStatusUpdate, 
    onNotesUpdate, 
    onDismiss 
}) {
    const [notes, setNotes] = useState(violation?.notes || '');
    const [status, setStatus] = useState(violation?.status || 'Pending');
    const [showDismissConfirm, setShowDismissConfirm] = useState(false);
    const [notesModified, setNotesModified] = useState(false);

    const maxNotesLength = 2000;

    // Severity color mapping
    const getSeverityColor = (severity) => {
        const colors = {
            'Critical': 'bg-red-900 text-white',
            'High': 'bg-red-600 text-white',
            'Medium': 'bg-yellow-500 text-white',
            'Low': 'bg-blue-600 text-white',
        };
        return colors[severity] || 'bg-slate-500 text-white';
    };

    // Handle notes change
    const handleNotesChange = (e) => {
        const value = e.target.value;
        if (value.length <= maxNotesLength) {
            setNotes(value);
            setNotesModified(true);
        }
    };

    // Handle save notes
    const handleSaveNotes = () => {
        onNotesUpdate(violation.id, notes);
        setNotesModified(false);
    };

    // Handle status change
    const handleStatusChange = (e) => {
        const newStatus = e.target.value;
        setStatus(newStatus);
        onStatusUpdate(violation.id, newStatus);
    };

    // Handle dismiss
    const handleDismissConfirm = () => {
        onDismiss(violation.id);
        setShowDismissConfirm(false);
    };

    // Handle print
    const handlePrint = () => {
        window.open(route('admin.violations.print', violation.id), '_blank');
    };

    // Format metadata based on violation type
    const renderMetadata = () => {
        if (!violation.metadata) return null;

        const metadata = typeof violation.metadata === 'string' 
            ? JSON.parse(violation.metadata) 
            : violation.metadata;

        switch (violation.violation_type) {
            case 'Cumulative Grace Period Exceeded':
                return (
                    <div className="space-y-3">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="rounded-lg bg-slate-50 p-3">
                                <div className="text-xs text-slate-500">Total Late Minutes</div>
                                <div className="text-lg font-semibold text-slate-900">{metadata.total_late_minutes} min</div>
                            </div>
                            <div className="rounded-lg bg-slate-50 p-3">
                                <div className="text-xs text-slate-500">Grace Period Limit</div>
                                <div className="text-lg font-semibold text-slate-900">{metadata.grace_period_limit} min</div>
                            </div>
                            <div className="rounded-lg bg-red-50 p-3">
                                <div className="text-xs text-red-600">Deductible Minutes</div>
                                <div className="text-lg font-semibold text-red-700">{metadata.deductible_minutes} min</div>
                            </div>
                            <div className="rounded-lg bg-slate-50 p-3">
                                <div className="text-xs text-slate-500">Tracking Period</div>
                                <div className="text-sm font-medium text-slate-900 capitalize">{metadata.tracking_period}</div>
                            </div>
                        </div>
                        {metadata.affected_dates && metadata.affected_dates.length > 0 && (
                            <div>
                                <div className="text-xs font-medium text-slate-700 mb-2">Affected Dates:</div>
                                <div className="space-y-1 max-h-40 overflow-y-auto">
                                    {metadata.affected_dates.map((date, idx) => (
                                        <div key={idx} className="flex items-center justify-between text-xs bg-slate-50 rounded px-3 py-2">
                                            <span className="text-slate-700">{date.date}</span>
                                            <span className="text-slate-900 font-medium">
                                                AM: {date.late_am || 0} min, PM: {date.late_pm || 0} min
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                );

            case 'AWOL':
                return (
                    <div className="space-y-2">
                        <div className="text-xs font-medium text-slate-700">Consecutive Absence Dates:</div>
                        <div className="space-y-1">
                            {metadata.consecutive_dates?.map((date, idx) => (
                                <div key={idx} className="text-sm bg-red-50 text-red-700 rounded px-3 py-2">
                                    {new Date(date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
                                </div>
                            ))}
                        </div>
                    </div>
                );

            case 'Biometrics Policy Violation':
                return (
                    <div className="space-y-2">
                        <div className="text-xs font-medium text-slate-700">Missing Timestamps:</div>
                        <div className="flex flex-wrap gap-2">
                            {metadata.missing_timestamps?.map((timestamp, idx) => (
                                <span key={idx} className="inline-flex items-center rounded-full bg-yellow-100 px-3 py-1 text-xs font-medium text-yellow-800">
                                    {timestamp.replace(/_/g, ' ').toUpperCase()}
                                </span>
                            ))}
                        </div>
                    </div>
                );

            case 'Excessive Logs':
                return (
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <div className="text-xs font-medium text-slate-700">Log Count:</div>
                            <span className="text-sm font-semibold text-red-600">{metadata.log_count} logs (expected: 4)</span>
                        </div>
                        {metadata.log_timestamps && metadata.log_timestamps.length > 0 && (
                            <div>
                                <div className="text-xs font-medium text-slate-700 mb-2">Log Timestamps:</div>
                                <div className="flex flex-wrap gap-2">
                                    {metadata.log_timestamps.map((time, idx) => (
                                        <span key={idx} className="inline-flex items-center rounded bg-slate-100 px-2 py-1 text-xs text-slate-700">
                                            {time}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                );

            case 'Missing Logs':
                return (
                    <div className="space-y-3">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="rounded-lg bg-slate-50 p-3">
                                <div className="text-xs text-slate-500">Occurrences</div>
                                <div className="text-lg font-semibold text-slate-900">{metadata.occurrences_count}</div>
                            </div>
                            <div className="rounded-lg bg-slate-50 p-3">
                                <div className="text-xs text-slate-500">Total Missed Logs</div>
                                <div className="text-lg font-semibold text-slate-900">{metadata.total_missed_logs}</div>
                            </div>
                        </div>
                        {metadata.affected_dates && metadata.affected_dates.length > 0 && (
                            <div>
                                <div className="text-xs font-medium text-slate-700 mb-2">Affected Dates:</div>
                                <div className="space-y-1 max-h-40 overflow-y-auto">
                                    {metadata.affected_dates.map((date, idx) => (
                                        <div key={idx} className="flex items-center justify-between text-xs bg-slate-50 rounded px-3 py-2">
                                            <span className="text-slate-700">{date.date}</span>
                                            <span className="text-slate-900 font-medium">{date.missed_count} missed</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                );

            case 'Unauthorized Work':
            case 'Excessive Undertime':
            case 'Frequent Half Day':
                return (
                    <div className="space-y-3">
                        <div className="rounded-lg bg-slate-50 p-3">
                            <div className="text-xs text-slate-500">Occurrences (30 days)</div>
                            <div className="text-lg font-semibold text-slate-900">{metadata.occurrences_count}</div>
                        </div>
                        {metadata.total_undertime_minutes && (
                            <div className="rounded-lg bg-slate-50 p-3">
                                <div className="text-xs text-slate-500">Total Undertime</div>
                                <div className="text-lg font-semibold text-slate-900">{metadata.total_undertime_minutes} min</div>
                            </div>
                        )}
                        {(metadata.unauthorized_dates || metadata.affected_dates || metadata.half_day_dates) && (
                            <div>
                                <div className="text-xs font-medium text-slate-700 mb-2">Dates:</div>
                                <div className="flex flex-wrap gap-2">
                                    {(metadata.unauthorized_dates || metadata.affected_dates || metadata.half_day_dates)?.map((item, idx) => {
                                        const date = typeof item === 'string' ? item : item.date;
                                        return (
                                            <span key={idx} className="inline-flex items-center rounded bg-slate-100 px-2 py-1 text-xs text-slate-700">
                                                {date}
                                                {item.undertime_minutes && ` (${item.undertime_minutes} min)`}
                                            </span>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                    </div>
                );

            default:
                return (
                    <pre className="text-xs bg-slate-50 rounded p-3 overflow-auto">
                        {JSON.stringify(metadata, null, 2)}
                    </pre>
                );
        }
    };

    if (!violation) return null;

    return (
        <>
            <Transition appear show={isOpen} as={Fragment}>
                <Dialog as="div" className="relative z-50" onClose={onClose}>
                    <Transition.Child
                        as={Fragment}
                        enter="ease-out duration-300"
                        enterFrom="opacity-0"
                        enterTo="opacity-100"
                        leave="ease-in duration-200"
                        leaveFrom="opacity-100"
                        leaveTo="opacity-0"
                    >
                        <div className="fixed inset-0 bg-black bg-opacity-25" />
                    </Transition.Child>

                    <div className="fixed inset-0 overflow-y-auto">
                        <div className="flex min-h-full items-center justify-center p-4">
                            <Transition.Child
                                as={Fragment}
                                enter="ease-out duration-300"
                                enterFrom="opacity-0 scale-95"
                                enterTo="opacity-100 scale-100"
                                leave="ease-in duration-200"
                                leaveFrom="opacity-100 scale-100"
                                leaveTo="opacity-0 scale-95"
                            >

                                <Dialog.Panel className="w-full max-w-3xl transform overflow-hidden rounded-lg bg-white shadow-xl transition-all">
                                    {/* Header */}
                                    <div className="border-b border-slate-200 bg-gradient-to-r from-slate-50 to-white px-6 py-4">
                                        <div className="flex items-start justify-between">
                                            <div>
                                                <Dialog.Title className="text-lg font-semibold text-slate-900">
                                                    Violation Details
                                                </Dialog.Title>
                                                <p className="mt-1 text-sm text-slate-600">
                                                    Review and manage violation information
                                                </p>
                                            </div>
                                            <button
                                                onClick={onClose}
                                                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition"
                                            >
                                                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                                                </svg>
                                            </button>
                                        </div>
                                    </div>

                                    {/* Content */}
                                    <div className="max-h-[calc(100vh-200px)] overflow-y-auto p-6 space-y-6">
                                        {/* Employee Information */}
                                        <div className="rounded-lg border border-slate-200 bg-slate-50/50 p-4">
                                            <div className="text-xs font-semibold text-slate-700 uppercase tracking-wider mb-3">Employee Information</div>
                                            <div className="grid grid-cols-2 gap-4">
                                                <div>
                                                    <div className="text-xs text-slate-500">Name</div>
                                                    <div className="text-sm font-medium text-slate-900">
                                                        {violation.employee.first_name} {violation.employee.last_name}
                                                    </div>
                                                </div>
                                                <div>
                                                    <div className="text-xs text-slate-500">Employee ID</div>
                                                    <div className="text-sm font-medium text-slate-900">{violation.employee.employee_code}</div>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Violation Information */}
                                        <div className="rounded-lg border border-slate-200 bg-slate-50/50 p-4">
                                            <div className="text-xs font-semibold text-slate-700 uppercase tracking-wider mb-3">Violation Information</div>
                                            <div className="grid grid-cols-2 gap-4">
                                                <div>
                                                    <div className="text-xs text-slate-500">Violation Date</div>
                                                    <div className="text-sm font-medium text-slate-900">
                                                        {new Date(violation.violation_date).toLocaleDateString('en-US', {
                                                            year: 'numeric',
                                                            month: 'long',
                                                            day: 'numeric'
                                                        })}
                                                    </div>
                                                </div>
                                                <div>
                                                    <div className="text-xs text-slate-500">Violation Type</div>
                                                    <div className="text-sm font-medium text-slate-900">{violation.violation_type}</div>
                                                </div>
                                                <div>
                                                    <div className="text-xs text-slate-500">Severity</div>
                                                    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${getSeverityColor(violation.severity)}`}>
                                                        {violation.severity}
                                                    </span>
                                                </div>
                                                <div>
                                                    <div className="text-xs text-slate-500 mb-2">Status</div>
                                                    <select
                                                        value={status}
                                                        onChange={handleStatusChange}
                                                        className="w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-900 transition focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                                                    >
                                                        <option value="Pending">Pending</option>
                                                        <option value="Reviewed">Reviewed</option>
                                                        <option value="Letter Sent">Letter Sent</option>
                                                    </select>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Details */}
                                        {violation.details && (
                                            <div className="rounded-lg border border-slate-200 bg-slate-50/50 p-4">
                                                <div className="text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">Details</div>
                                                <div className="text-sm text-slate-700">{violation.details}</div>
                                            </div>
                                        )}

                                        {/* Metadata */}
                                        {violation.metadata && (
                                            <div className="rounded-lg border border-slate-200 bg-slate-50/50 p-4">
                                                <div className="text-xs font-semibold text-slate-700 uppercase tracking-wider mb-3">Additional Information</div>
                                                {renderMetadata()}
                                            </div>
                                        )}

                                        {/* Notes */}
                                        <div className="rounded-lg border border-slate-200 bg-slate-50/50 p-4">
                                            <div className="flex items-center justify-between mb-2">
                                                <div className="text-xs font-semibold text-slate-700 uppercase tracking-wider">Admin Notes</div>
                                                <div className="text-xs text-slate-500">
                                                    {notes.length} / {maxNotesLength} characters
                                                </div>
                                            </div>
                                            <textarea
                                                value={notes}
                                                onChange={handleNotesChange}
                                                rows={4}
                                                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 transition focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                                                placeholder="Add notes about this violation (e.g., context, explanations, follow-up actions)..."
                                            />
                                            {notesModified && (
                                                <button
                                                    onClick={handleSaveNotes}
                                                    className="mt-2 inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-primary/90"
                                                >
                                                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                                    </svg>
                                                    Save Notes
                                                </button>
                                            )}
                                        </div>
                                    </div>

                                    {/* Footer Actions */}
                                    <div className="flex items-center justify-between border-t border-slate-200 bg-gradient-to-r from-slate-50 to-white px-6 py-4">
                                        <button
                                            onClick={() => setShowDismissConfirm(true)}
                                            className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-red-700"
                                        >
                                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                            </svg>
                                            Dismiss Violation
                                        </button>

                                        <div className="flex items-center gap-2">
                                            <button
                                                onClick={handlePrint}
                                                className="inline-flex items-center gap-2 rounded-lg bg-slate-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-slate-700"
                                            >
                                                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                                                </svg>
                                                Print Notice
                                            </button>
                                        </div>
                                    </div>
                                </Dialog.Panel>
                            </Transition.Child>
                        </div>
                    </div>
                </Dialog>
            </Transition>

            {/* Dismiss Confirmation Dialog */}
            <Transition appear show={showDismissConfirm} as={Fragment}>
                <Dialog as="div" className="relative z-50" onClose={() => setShowDismissConfirm(false)}>
                    <Transition.Child
                        as={Fragment}
                        enter="ease-out duration-300"
                        enterFrom="opacity-0"
                        enterTo="opacity-100"
                        leave="ease-in duration-200"
                        leaveFrom="opacity-100"
                        leaveTo="opacity-0"
                    >
                        <div className="fixed inset-0 bg-black bg-opacity-25" />
                    </Transition.Child>

                    <div className="fixed inset-0 overflow-y-auto">
                        <div className="flex min-h-full items-center justify-center p-4">
                            <Transition.Child
                                as={Fragment}
                                enter="ease-out duration-300"
                                enterFrom="opacity-0 scale-95"
                                enterTo="opacity-100 scale-100"
                                leave="ease-in duration-200"
                                leaveFrom="opacity-100 scale-100"
                                leaveTo="opacity-0 scale-95"
                            >
                                <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-lg bg-white shadow-xl transition-all">
                                    <div className="p-6">
                                        <div className="flex items-center gap-4">
                                            <div className="flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-red-100">
                                                <svg className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                                </svg>
                                            </div>
                                            <div className="flex-1">
                                                <Dialog.Title className="text-lg font-semibold text-slate-900">
                                                    Dismiss Violation
                                                </Dialog.Title>
                                                <p className="mt-2 text-sm text-slate-600">
                                                    Are you sure you want to dismiss this violation? This action will remove it from the violations list.
                                                </p>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex items-center justify-end gap-3 bg-slate-50 px-6 py-4">
                                        <button
                                            onClick={() => setShowDismissConfirm(false)}
                                            className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50"
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            onClick={handleDismissConfirm}
                                            className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-red-700"
                                        >
                                            Confirm Dismiss
                                        </button>
                                    </div>
                                </Dialog.Panel>
                            </Transition.Child>
                        </div>
                    </div>
                </Dialog>
            </Transition>
        </>
    );
}
