import { useState } from 'react';
import AdminLayout from '@/Layouts/AdminLayout';
import { Head, router } from '@inertiajs/react';
import ViolationFilters from '@/Components/ViolationFilters';
import ViolationDetailsModal from '@/Components/ViolationDetailsModal';

export default function ViolationsIndex({ violations, filters, departments }) {
    const [selectedViolation, setSelectedViolation] = useState(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedIds, setSelectedIds] = useState([]);
    const [searchQuery, setSearchQuery] = useState(filters.search || '');

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

    // Handle filter changes
    const handleFilterChange = (newFilters) => {
        router.get(route('admin.violations.index'), newFilters, {
            preserveState: true,
            preserveScroll: true,
        });
    };

    // Handle search
    const handleSearch = (e) => {
        const value = e.target.value;
        setSearchQuery(value);
        
        // Debounce search
        if (window.searchTimeout) {
            clearTimeout(window.searchTimeout);
        }
        window.searchTimeout = setTimeout(() => {
            handleFilterChange({ ...filters, search: value });
        }, 300);
    };

    // Handle row click
    const handleRowClick = (violation) => {
        setSelectedViolation(violation);
        setIsModalOpen(true);
    };

    // Handle status update
    const handleStatusUpdate = (id, status) => {
        router.patch(route('admin.violations.update-status', id), { status }, {
            preserveState: true,
            onSuccess: () => {
                setIsModalOpen(false);
            },
        });
    };

    // Handle notes update
    const handleNotesUpdate = (id, notes) => {
        router.patch(route('admin.violations.update-notes', id), { notes }, {
            preserveState: true,
        });
    };

    // Handle dismiss
    const handleDismiss = (id) => {
        router.post(route('admin.violations.dismiss', id), {}, {
            preserveState: true,
            onSuccess: () => {
                setIsModalOpen(false);
            },
        });
    };

    // Handle export
    const handleExport = () => {
        window.location.href = route('admin.violations.export', filters);
    };

    // Handle bulk print
    const handleBulkPrint = () => {
        if (selectedIds.length === 0) return;
        
        router.post(route('admin.violations.bulk-print'), { violation_ids: selectedIds }, {
            onSuccess: () => {
                window.print();
            },
        });
    };

    // Handle select all
    const handleSelectAll = (e) => {
        if (e.target.checked) {
            setSelectedIds(violations.data.map(v => v.id));
        } else {
            setSelectedIds([]);
        }
    };

    // Handle individual select
    const handleSelect = (id) => {
        setSelectedIds(prev => 
            prev.includes(id) 
                ? prev.filter(i => i !== id)
                : [...prev, id]
        );
    };

    return (
        <AdminLayout title="Attendance Violations">
            <Head title="Attendance Violations" />

            <div className="mb-6">
                <h2 className="text-lg font-semibold text-[#334155]">Attendance Violations</h2>
                <p className="mt-1 text-sm text-slate-500">
                    Monitor and manage employee attendance policy violations
                </p>
            </div>

            {/* Filters */}
            <div className="mb-4">
                <ViolationFilters
                    filters={filters}
                    onFilterChange={handleFilterChange}
                    departments={departments}
                />
            </div>

            {/* Search and Actions Bar */}
            <div className="mb-4 flex items-center justify-between gap-4">
                <div className="flex-1 max-w-md">
                    <div className="relative">
                        <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                            <svg className="h-4 w-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                            </svg>
                        </div>
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={handleSearch}
                            className="block w-full rounded-lg border border-slate-300 bg-white py-2 pl-10 pr-3 text-sm placeholder-slate-400 transition focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                            placeholder="Search by employee name or details..."
                        />
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    {selectedIds.length > 0 && (
                        <button
                            onClick={handleBulkPrint}
                            className="inline-flex items-center gap-2 rounded-lg bg-slate-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-slate-700"
                        >
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                            </svg>
                            Print Selected ({selectedIds.length})
                        </button>
                    )}
                    
                    <button
                        onClick={handleExport}
                        className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-primary/90"
                    >
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        Export CSV
                    </button>
                </div>
            </div>

            {/* Violations Table */}
            <div className="rounded-lg border border-slate-200 bg-white shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-slate-200">
                        <thead className="bg-slate-50">
                            <tr>
                                <th scope="col" className="w-12 px-4 py-3">
                                    <input
                                        type="checkbox"
                                        checked={selectedIds.length === violations.data.length && violations.data.length > 0}
                                        onChange={handleSelectAll}
                                        className="h-4 w-4 rounded border-slate-300 text-primary transition focus:ring-2 focus:ring-primary/20"
                                    />
                                </th>
                                <th scope="col" className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                                    Employee
                                </th>
                                <th scope="col" className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                                    Violation Date
                                </th>
                                <th scope="col" className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                                    Violation Type
                                </th>
                                <th scope="col" className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                                    Severity
                                </th>
                                <th scope="col" className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                                    Status
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200 bg-white">
                            {violations.data.length === 0 ? (
                                <tr>
                                    <td colSpan="6" className="px-4 py-12 text-center">
                                        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-slate-100">
                                            <svg className="h-8 w-8 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                            </svg>
                                        </div>
                                        <h4 className="mt-4 text-sm font-medium text-slate-900">No violations found</h4>
                                        <p className="mt-1 text-xs text-slate-500">
                                            {Object.keys(filters).length > 0 ? 'Try adjusting your filters' : 'No attendance violations have been detected'}
                                        </p>
                                    </td>
                                </tr>
                            ) : (
                                violations.data.map((violation) => (
                                    <tr
                                        key={violation.id}
                                        className="hover:bg-slate-50 cursor-pointer transition"
                                        onClick={(e) => {
                                            if (e.target.type !== 'checkbox') {
                                                handleRowClick(violation);
                                            }
                                        }}
                                    >
                                        <td className="px-4 py-3">
                                            <input
                                                type="checkbox"
                                                checked={selectedIds.includes(violation.id)}
                                                onChange={() => handleSelect(violation.id)}
                                                onClick={(e) => e.stopPropagation()}
                                                className="h-4 w-4 rounded border-slate-300 text-primary transition focus:ring-2 focus:ring-primary/20"
                                            />
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="text-sm font-medium text-slate-900">
                                                {violation.employee.first_name} {violation.employee.last_name}
                                            </div>
                                            <div className="text-xs text-slate-500">
                                                {violation.employee.employee_code}
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 text-sm text-slate-700">
                                            {new Date(violation.violation_date).toLocaleDateString('en-US', {
                                                year: 'numeric',
                                                month: 'short',
                                                day: 'numeric'
                                            })}
                                        </td>
                                        <td className="px-4 py-3 text-sm text-slate-700">
                                            {violation.violation_type}
                                        </td>
                                        <td className="px-4 py-3">
                                            <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${getSeverityColor(violation.severity)}`}>
                                                {violation.severity}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3">
                                            <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                                                violation.status === 'Pending' ? 'bg-yellow-100 text-yellow-800' :
                                                violation.status === 'Reviewed' ? 'bg-blue-100 text-blue-800' :
                                                'bg-green-100 text-green-800'
                                            }`}>
                                                {violation.status}
                                            </span>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                {violations.last_page > 1 && (
                    <div className="flex items-center justify-between border-t border-slate-200 bg-white px-4 py-3">
                        <div className="flex items-center gap-2">
                            <span className="text-sm text-slate-700">
                                Showing <span className="font-medium">{violations.from}</span> to <span className="font-medium">{violations.to}</span> of{' '}
                                <span className="font-medium">{violations.total}</span> results
                            </span>
                        </div>
                        <div className="flex items-center gap-2">
                            {violations.links.map((link, index) => (
                                <button
                                    key={index}
                                    onClick={() => {
                                        if (link.url) {
                                            router.get(link.url, {}, { preserveState: true });
                                        }
                                    }}
                                    disabled={!link.url}
                                    className={`px-3 py-1 text-sm rounded-md transition ${
                                        link.active
                                            ? 'bg-primary text-white font-medium'
                                            : link.url
                                            ? 'bg-white text-slate-700 border border-slate-300 hover:bg-slate-50'
                                            : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                                    }`}
                                    dangerouslySetInnerHTML={{ __html: link.label }}
                                />
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* Violation Details Modal */}
            {selectedViolation && (
                <ViolationDetailsModal
                    violation={selectedViolation}
                    isOpen={isModalOpen}
                    onClose={() => setIsModalOpen(false)}
                    onStatusUpdate={handleStatusUpdate}
                    onNotesUpdate={handleNotesUpdate}
                    onDismiss={handleDismiss}
                />
            )}
        </AdminLayout>
    );
}
