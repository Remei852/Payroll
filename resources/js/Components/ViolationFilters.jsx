import { useState } from 'react';

export default function ViolationFilters({ filters, onFilterChange, departments }) {
    const [localFilters, setLocalFilters] = useState({
        employee_name: filters.employee_name || '',
        violation_type: filters.violation_type || '',
        severity: filters.severity || '',
        status: filters.status || '',
        start_date: filters.start_date || '',
        end_date: filters.end_date || '',
        department_id: filters.department_id || '',
    });

    const violationTypes = [
        'Cumulative Grace Period Exceeded',
        'Unexcused Absence',
        'AWOL',
        'Biometrics Policy Violation',
        'Missing Logs',
        'Excessive Logs',
        'Unauthorized Work',
        'Excessive Undertime',
        'Frequent Half Day',
    ];

    const severityLevels = ['Low', 'Medium', 'High', 'Critical'];
    const statusOptions = ['Pending', 'Reviewed', 'Letter Sent'];

    const handleChange = (field, value) => {
        const newFilters = { ...localFilters, [field]: value };
        setLocalFilters(newFilters);
        onFilterChange(newFilters);
    };

    const handleClear = () => {
        const clearedFilters = {
            employee_name: '',
            violation_type: '',
            severity: '',
            status: '',
            start_date: '',
            end_date: '',
            department_id: '',
        };
        setLocalFilters(clearedFilters);
        onFilterChange(clearedFilters);
    };

    const hasActiveFilters = Object.values(localFilters).some(value => value !== '');

    return (
        <div className="rounded-lg border border-slate-200 bg-white shadow-sm p-4">
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-slate-900">Filters</h3>
                {hasActiveFilters && (
                    <button
                        onClick={handleClear}
                        className="text-xs text-primary hover:text-primary/80 font-medium transition"
                    >
                        Clear All
                    </button>
                )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">

                {/* Employee Name */}
                <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1.5">
                        Employee Name
                    </label>
                    <input
                        type="text"
                        value={localFilters.employee_name}
                        onChange={(e) => handleChange('employee_name', e.target.value)}
                        className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 transition focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                        placeholder="Search by name..."
                    />
                </div>

                {/* Violation Type */}
                <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1.5">
                        Violation Type
                    </label>
                    <select
                        value={localFilters.violation_type}
                        onChange={(e) => handleChange('violation_type', e.target.value)}
                        className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 transition focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                    >
                        <option value="">All Types</option>
                        {violationTypes.map((type) => (
                            <option key={type} value={type}>
                                {type}
                            </option>
                        ))}
                    </select>
                </div>

                {/* Severity */}
                <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1.5">
                        Severity
                    </label>
                    <select
                        value={localFilters.severity}
                        onChange={(e) => handleChange('severity', e.target.value)}
                        className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 transition focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                    >
                        <option value="">All Severities</option>
                        {severityLevels.map((level) => (
                            <option key={level} value={level}>
                                {level}
                            </option>
                        ))}
                    </select>
                </div>

                {/* Status */}
                <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1.5">
                        Status
                    </label>
                    <select
                        value={localFilters.status}
                        onChange={(e) => handleChange('status', e.target.value)}
                        className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 transition focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                    >
                        <option value="">All Statuses</option>
                        {statusOptions.map((status) => (
                            <option key={status} value={status}>
                                {status}
                            </option>
                        ))}
                    </select>
                </div>

                {/* Start Date */}
                <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1.5">
                        Start Date
                    </label>
                    <input
                        type="date"
                        value={localFilters.start_date}
                        onChange={(e) => handleChange('start_date', e.target.value)}
                        className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 transition focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                    />
                </div>

                {/* End Date */}
                <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1.5">
                        End Date
                    </label>
                    <input
                        type="date"
                        value={localFilters.end_date}
                        onChange={(e) => handleChange('end_date', e.target.value)}
                        className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 transition focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                    />
                </div>

                {/* Department */}
                <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1.5">
                        Department
                    </label>
                    <select
                        value={localFilters.department_id}
                        onChange={(e) => handleChange('department_id', e.target.value)}
                        className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 transition focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                    >
                        <option value="">All Departments</option>
                        {departments.map((dept) => (
                            <option key={dept.id} value={dept.id}>
                                {dept.name}
                            </option>
                        ))}
                    </select>
                </div>
            </div>
        </div>
    );
}
