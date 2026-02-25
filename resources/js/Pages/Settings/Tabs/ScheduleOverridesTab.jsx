import { useState, useMemo } from 'react';
import { router } from '@inertiajs/react';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';

// Monthly View Component
function MonthlyView({ monthName, year, stats, overrides, onEditOverride, onDeleteOverride }) {
    const getOverrideColor = (type) => {
        switch (type) {
            case 'regular_holiday': return 'bg-danger';
            case 'special_holiday': return 'bg-warning';
            case 'company_holiday': return 'bg-primary';
            case 'no_work': return 'bg-slate-500';
            case 'sunday_work': return 'bg-success';
            case 'special_schedule': return 'bg-purple-500';
            case 'half_day': return 'bg-blue-400';
            default: return 'bg-slate-400';
        }
    };

    const getTypeLabel = (type) => {
        const labels = {
            regular_holiday: 'Regular Holiday',
            special_holiday: 'Special Holiday',
            company_holiday: 'Company Holiday',
            no_work: 'No Work',
            sunday_work: 'Sunday Work',
            special_schedule: 'Special Schedule',
            half_day: 'Half Day',
        };
        return labels[type] || type;
    };

    const holidays = overrides.filter(o => 
        o.is_from_holidays_table || ['regular_holiday', 'special_holiday', 'company_holiday'].includes(o.override_type)
    );
    const scheduleChanges = overrides.filter(o => 
        !o.is_from_holidays_table && !['regular_holiday', 'special_holiday', 'company_holiday'].includes(o.override_type)
    );

    return (
        <div className="flex flex-col h-full">
            {/* Header */}
            <div className="border-b border-slate-200 bg-slate-50 px-6 py-4">
                <h3 className="text-section-title text-slate-800">{monthName} {year} - All Entries</h3>
            </div>

            {/* Stats */}
            <div className="border-b border-slate-200 bg-white px-6 py-4">
                <div className="grid grid-cols-3 gap-4">
                    <div className="text-center">
                        <div className="text-2xl font-bold text-primary">{stats.total}</div>
                        <div className="text-xs text-slate-600">Total Entries</div>
                    </div>
                    <div className="text-center">
                        <div className="text-2xl font-bold text-danger">{stats.holidays}</div>
                        <div className="text-xs text-slate-600">Holidays</div>
                    </div>
                    <div className="text-center">
                        <div className="text-2xl font-bold text-success">{stats.scheduleChanges}</div>
                        <div className="text-xs text-slate-600">Custom Overrides</div>
                    </div>
                </div>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
                {overrides.length === 0 ? (
                    <div className="text-center py-12 text-slate-500">
                        <svg className="mx-auto h-12 w-12 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        <p className="mt-2 text-sm">No entries for this month</p>
                    </div>
                ) : (
                    <>
                        {holidays.length > 0 && (
                            <div>
                                <h4 className="text-sm font-semibold text-slate-700 mb-3">Holidays</h4>
                                <div className="space-y-2">
                                    {holidays.map(override => (
                                        <OverrideCard 
                                            key={override.id}
                                            override={override}
                                            getOverrideColor={getOverrideColor}
                                            getTypeLabel={getTypeLabel}
                                            onEdit={onEditOverride}
                                            onDelete={onDeleteOverride}
                                        />
                                    ))}
                                </div>
                            </div>
                        )}
                        {scheduleChanges.length > 0 && (
                            <div>
                                <h4 className="text-sm font-semibold text-slate-700 mb-3">Custom Schedule Overrides</h4>
                                <div className="space-y-2">
                                    {scheduleChanges.map(override => (
                                        <OverrideCard 
                                            key={override.id}
                                            override={override}
                                            getOverrideColor={getOverrideColor}
                                            getTypeLabel={getTypeLabel}
                                            onEdit={onEditOverride}
                                            onDelete={onDeleteOverride}
                                        />
                                    ))}
                                </div>
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
}

// Date View Component
function DateView({ date, overrides, onBack, onAddOverride, onEditOverride, onDeleteOverride }) {
    const getOverrideColor = (type) => {
        switch (type) {
            case 'regular_holiday': return 'bg-danger';
            case 'special_holiday': return 'bg-warning';
            case 'company_holiday': return 'bg-primary';
            case 'no_work': return 'bg-slate-500';
            case 'sunday_work': return 'bg-success';
            case 'special_schedule': return 'bg-purple-500';
            case 'half_day': return 'bg-blue-400';
            default: return 'bg-slate-400';
        }
    };

    const getTypeLabel = (type) => {
        const labels = {
            regular_holiday: 'Regular Holiday',
            special_holiday: 'Special Holiday',
            company_holiday: 'Company Holiday',
            no_work: 'No Work',
            sunday_work: 'Sunday Work',
            special_schedule: 'Special Schedule',
            half_day: 'Half Day',
        };
        return labels[type] || type;
    };

    const dateStr = date.toLocaleDateString('en-US', { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
    });

    // Separate holidays from custom overrides
    const holidays = overrides.filter(o => o.is_from_holidays_table);
    const customOverrides = overrides.filter(o => !o.is_from_holidays_table);

    return (
        <div className="flex flex-col h-full">
            {/* Header */}
            <div className="border-b border-slate-200 bg-slate-50 px-6 py-4">
                <button
                    onClick={onBack}
                    className="flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900 mb-2"
                >
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                    </svg>
                    Back to Monthly View
                </button>
                <h3 className="text-section-title text-slate-800">{dateStr}</h3>
            </div>

            {/* Add Button */}
            <div className="border-b border-slate-200 bg-white px-6 py-4">
                <button
                    onClick={() => onAddOverride(date)}
                    className="w-full flex items-center justify-center gap-2 rounded-md border-2 border-dashed border-slate-300 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-700 transition hover:border-primary hover:bg-primary/5 hover:text-primary"
                >
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                    </svg>
                    {holidays.length > 0 ? 'Add Custom Operating Hours' : 'Add Schedule Override'}
                </button>
                {holidays.length > 0 && (
                    <p className="mt-2 text-xs text-center text-slate-500">
                        Set custom operating hours for specific departments or employees on this holiday
                    </p>
                )}
            </div>

            {/* Overrides List */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
                {/* Holidays Section */}
                {holidays.length > 0 && (
                    <div>
                        <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">National Holiday</h4>
                        <div className="space-y-2">
                            {holidays.map(override => (
                                <OverrideCard 
                                    key={override.id}
                                    override={override}
                                    getOverrideColor={getOverrideColor}
                                    getTypeLabel={getTypeLabel}
                                    onEdit={onEditOverride}
                                    onDelete={onDeleteOverride}
                                    detailed={true}
                                />
                            ))}
                        </div>
                    </div>
                )}

                {/* Custom Overrides Section */}
                {customOverrides.length > 0 && (
                    <div>
                        <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Custom Schedule Overrides</h4>
                        <div className="space-y-2">
                            {customOverrides.map(override => (
                                <OverrideCard 
                                    key={override.id}
                                    override={override}
                                    getOverrideColor={getOverrideColor}
                                    getTypeLabel={getTypeLabel}
                                    onEdit={onEditOverride}
                                    onDelete={onDeleteOverride}
                                    detailed={true}
                                />
                            ))}
                        </div>
                    </div>
                )}

                {/* Empty State */}
                {overrides.length === 0 && (
                    <div className="text-center py-12 text-slate-500">
                        <svg className="mx-auto h-12 w-12 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                        </svg>
                        <p className="mt-2 text-sm">No entries for this date</p>
                        <p className="mt-1 text-xs text-slate-400">Click "Add Schedule Override" above to create one</p>
                    </div>
                )}
            </div>
        </div>
    );
}

// Override Card Component
function OverrideCard({ override, getOverrideColor, getTypeLabel, onEdit, onDelete, detailed = false }) {
    const colorClass = getOverrideColor(override.override_type);
    const isFromHolidaysTable = override.is_from_holidays_table || false;
    
    return (
        <div className={`rounded-lg border ${isFromHolidaysTable ? 'border-slate-300 bg-slate-50' : 'border-slate-200 bg-white'} p-4 hover:shadow-md transition`}>
            <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                        <span className={`inline-flex items-center rounded-full ${colorClass} px-2.5 py-0.5 text-xs font-medium text-white`}>
                            {getTypeLabel(override.override_type)}
                        </span>
                        {isFromHolidaysTable && (
                            <span className="inline-flex items-center rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-700">
                                National Holiday
                            </span>
                        )}
                    </div>
                    <h4 className="text-sm font-semibold text-slate-900 mb-1">{override.reason}</h4>
                    {isFromHolidaysTable && (
                        <p className="text-xs text-slate-500 mb-2">
                            Click "Add Override" to set custom operating hours for specific departments or employees
                        </p>
                    )}
                    <div className="space-y-1 text-xs text-slate-600">
                        {!detailed && (
                            <div className="flex items-center gap-1">
                                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                </svg>
                                {new Date(override.override_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                            </div>
                        )}
                        {!isFromHolidaysTable && (
                            <>
                                <div className="flex items-center gap-1">
                                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                                    </svg>
                                    {override.department ? override.department.name : 
                                     override.employees && override.employees.length > 0 ? `${override.employees.length} employee(s)` :
                                     'All Departments'}
                                </div>
                                {override.opening_time && override.closing_time && (
                                    <div className="flex items-center gap-1">
                                        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                        {override.opening_time} - {override.closing_time}
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                </div>
                {!isFromHolidaysTable && (
                    <div className="flex gap-2">
                        <button
                            onClick={() => onEdit(override)}
                            className="rounded-md p-2 text-slate-400 hover:bg-slate-100 hover:text-primary transition"
                            title="Edit"
                        >
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                        </button>
                        <button
                            onClick={() => onDelete(override.id)}
                            className="rounded-md p-2 text-slate-400 hover:bg-danger/10 hover:text-danger transition"
                            title="Delete"
                        >
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}

export default function ScheduleOverridesTab({ scheduleOverrides = [], departments = [] }) {
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
    const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
    const [selectedDate, setSelectedDate] = useState(null);
    const [viewMode, setViewMode] = useState('monthly'); // 'monthly' or 'date'
    const [showDrawer, setShowDrawer] = useState(false);
    const [editingOverride, setEditingOverride] = useState(null);
    const [employees, setEmployees] = useState([]);
    const [loadingEmployees, setLoadingEmployees] = useState(false);
    const [showTypeDropdown, setShowTypeDropdown] = useState(false);
    const [showAppliesToDropdown, setShowAppliesToDropdown] = useState(false);
    const [errors, setErrors] = useState({});
    const [processing, setProcessing] = useState(false);
    const [form, setForm] = useState({
        override_date: '',
        override_type: 'special_schedule',
        reason: '',
        applies_to: 'all',
        department_id: '',
        employee_id: '',
        employee_ids: [],
        schedule_id: '',
        opening_time: '08:00',
        closing_time: '17:00',
        is_paid: true,
        is_recurring: false,
    });

    const years = useMemo(() => {
        const current = new Date().getFullYear();
        return Array.from({ length: 5 }, (_, i) => current - 1 + i);
    }, []);

    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 
                        'July', 'August', 'September', 'October', 'November', 'December'];

    // Group overrides by date for calendar display
    const overridesByDate = useMemo(() => {
        const map = new Map();
        scheduleOverrides.forEach(o => {
            const date = new Date(o.override_date).toDateString();
            if (!map.has(date)) {
                map.set(date, []);
            }
            map.get(date).push(o);
        });
        return map;
    }, [scheduleOverrides]);

    // Get overrides for current month
    const currentMonthOverrides = useMemo(() => {
        return scheduleOverrides.filter(o => {
            const date = new Date(o.override_date);
            return date.getFullYear() === selectedYear && date.getMonth() === selectedMonth;
        }).sort((a, b) => new Date(a.override_date) - new Date(b.override_date));
    }, [scheduleOverrides, selectedYear, selectedMonth]);

    // Get overrides for selected date
    const selectedDateOverrides = useMemo(() => {
        if (!selectedDate) return [];
        const dateStr = selectedDate.toDateString();
        return overridesByDate.get(dateStr) || [];
    }, [selectedDate, overridesByDate]);

    // Statistics for current month
    const monthStats = useMemo(() => {
        const holidays = currentMonthOverrides.filter(o => 
            ['regular_holiday', 'special_holiday', 'company_holiday'].includes(o.override_type)
        ).length;
        const scheduleChanges = currentMonthOverrides.length - holidays;
        return { total: currentMonthOverrides.length, holidays, scheduleChanges };
    }, [currentMonthOverrides]);

    function getOverrideColor(type) {
        switch (type) {
            case 'regular_holiday':
                return { bg: 'bg-danger', text: 'text-white' };
            case 'special_holiday':
                return { bg: 'bg-warning', text: 'text-white' };
            case 'company_holiday':
                return { bg: 'bg-primary', text: 'text-white' };
            case 'no_work':
                return { bg: 'bg-slate-500', text: 'text-white' };
            case 'special_schedule':
                return { bg: 'bg-purple-500', text: 'text-white' };
            case 'sunday_work':
                return { bg: 'bg-success', text: 'text-white' };
            case 'half_day':
                return { bg: 'bg-blue-400', text: 'text-white' };
            default:
                return { bg: 'bg-slate-400', text: 'text-white' };
        }
    }

    function getTileContent({ date, view }) {
        if (view === 'month') {
            const dateStr = date.toDateString();
            const dayOverrides = overridesByDate.get(dateStr);
            
            if (dayOverrides && dayOverrides.length > 0) {
                return (
                    <div className="mt-1 space-y-0.5">
                        {dayOverrides.slice(0, 2).map((o, idx) => {
                            const colors = getOverrideColor(o.override_type);
                            return (
                                <div
                                    key={idx}
                                    className={`text-[9px] font-semibold px-1 py-0.5 rounded truncate ${colors.bg} ${colors.text}`}
                                    title={`${o.reason}${o.department ? ` (${o.department.name})` : ''}`}
                                >
                                    {o.reason}
                                </div>
                            );
                        })}
                        {dayOverrides.length > 2 && (
                            <div className="text-[8px] text-slate-500 font-medium">
                                +{dayOverrides.length - 2} more
                            </div>
                        )}
                    </div>
                );
            }
        }
        return null;
    }

    function getTileClassName({ date, view }) {
        if (view === 'month') {
            const dateStr = date.toDateString();
            if (overridesByDate.has(dateStr)) {
                return 'has-override-events';
            }
        }
        return null;
    }

    // Fetch employees when department is selected
    async function fetchEmployees(departmentId) {
        if (!departmentId) {
            setEmployees([]);
            return;
        }
        
        setLoadingEmployees(true);
        try {
            const response = await fetch(`/api/employees?department_id=${departmentId}`, {
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json',
                },
                credentials: 'same-origin',
            });
            
            const data = await response.json();
            
            if (response.ok) {
                setEmployees(data.data || []);
            } else {
                setEmployees([]);
            }
        } catch (error) {
            setEmployees([]);
        } finally {
            setLoadingEmployees(false);
        }
    }

    function handleDateClick(date) {
        setSelectedDate(date);
        setSelectedMonth(date.getMonth());
        setViewMode('date');
    }

    function handleAddOverride(date = null) {
        const targetDate = date || selectedDate;
        const year = targetDate.getFullYear();
        const month = String(targetDate.getMonth() + 1).padStart(2, '0');
        const day = String(targetDate.getDate()).padStart(2, '0');
        const localDateStr = `${year}-${month}-${day}`;
        
        setEditingOverride(null);
        setForm({
            override_date: localDateStr,
            override_type: 'special_schedule',
            reason: '',
            applies_to: 'all',
            department_id: '',
            employee_id: '',
            employee_ids: [],
            schedule_id: '',
            opening_time: '08:00',
            closing_time: '17:00',
            is_paid: true,
            is_recurring: false,
        });
        setShowDrawer(true);
    }

    function handleBackToMonthly() {
        setSelectedDate(null);
        setViewMode('monthly');
    }

    function handleEditOverride(override) {
        // Prevent editing holidays from holidays table
        if (override.is_from_holidays_table) {
            alert('Philippine holidays cannot be edited from here. They are managed in the Holidays tab.');
            return;
        }
        
        setEditingOverride(override);
        
        // Determine applies_to based on what's set
        let appliesTo = 'all';
        if (override.employee_id || (override.employees && override.employees.length > 0)) {
            appliesTo = 'employees';
        } else if (override.department_id) {
            appliesTo = 'department';
        }
        
        const employeeIds = override.employees ? override.employees.map(e => e.id) : [];
        
        // Strip seconds from time values (convert HH:MM:SS to HH:MM)
        const openingTime = override.opening_time ? override.opening_time.substring(0, 5) : null;
        const closingTime = override.closing_time ? override.closing_time.substring(0, 5) : null;
        
        setForm({
            override_date: override.override_date,
            override_type: override.override_type,
            reason: override.reason,
            applies_to: appliesTo,
            department_id: override.department_id || '',
            employee_id: override.employee_id || '',
            employee_ids: employeeIds,
            schedule_id: override.schedule_id || '',
            opening_time: openingTime,
            closing_time: closingTime,
            is_paid: override.is_paid || false,
            is_recurring: override.is_recurring || false,
        });
        
        // Fetch employees if department is set
        if (override.department_id) {
            fetchEmployees(override.department_id);
        }
        
        setShowDrawer(true);
    }

    function handleCloseDrawer() {
        setShowDrawer(false);
        setEditingOverride(null);
        setShowTypeDropdown(false);
        setShowAppliesToDropdown(false);
        setErrors({});
        setProcessing(false);
    }

    function handleSubmit(e) {
        e.preventDefault();
        setErrors({});
        setProcessing(true);
        
        const data = {
            ...form,
            department_id: form.applies_to === 'department' || form.applies_to === 'employees' ? form.department_id : null,
            employee_id: null,
            employee_ids: form.applies_to === 'employees' ? form.employee_ids : [],
            // Convert empty strings to null for time fields
            opening_time: form.opening_time && form.opening_time.trim() !== '' ? form.opening_time : null,
            closing_time: form.closing_time && form.closing_time.trim() !== '' ? form.closing_time : null,
        };

        if (editingOverride) {
            router.put(route('admin.settings.schedule-overrides.update', editingOverride.id), data, {
                onSuccess: () => {
                    handleCloseDrawer();
                },
                onError: (errors) => {
                    setErrors(errors);
                    setProcessing(false);
                },
                onFinish: () => {
                    setProcessing(false);
                },
            });
        } else {
            router.post(route('admin.settings.schedule-overrides.store'), data, {
                onSuccess: () => {
                    handleCloseDrawer();
                },
                onError: (errors) => {
                    setErrors(errors);
                    setProcessing(false);
                },
                onFinish: () => {
                    setProcessing(false);
                },
            });
        }
    }

    function handleDelete(overrideId) {
        // Prevent deleting holidays from holidays table
        if (typeof overrideId === 'string' && overrideId.startsWith('holiday_')) {
            alert('Philippine holidays cannot be deleted from here. They are managed in the Holidays tab.');
            return;
        }
        
        if (confirm('Are you sure you want to delete this entry?')) {
            router.delete(route('admin.settings.schedule-overrides.destroy', overrideId), {
                onSuccess: () => {
                    handleCloseDrawer();
                    // If no more overrides for this date, go back to monthly view
                    if (selectedDateOverrides.length <= 1) {
                        handleBackToMonthly();
                    }
                },
            });
        }
    }

    function handleActiveMonthChange({ activeStartDate }) {
        setSelectedMonth(activeStartDate.getMonth());
        setSelectedYear(activeStartDate.getFullYear());
    }

    // Update rate multiplier and other fields based on type
    function handleTypeChange(type) {
        setForm({ ...form, override_type: type });
        setShowTypeDropdown(false);
    }

    function handleAppliesToChange(value) {
        setForm({ ...form, applies_to: value, department_id: '', employee_ids: [] });
        setEmployees([]);
        setShowAppliesToDropdown(false);
    }

    const isHoliday = ['regular_holiday', 'special_holiday', 'company_holiday'].includes(form.override_type);
    const showOperationHours = !['no_work'].includes(form.override_type); // Hide for no_work type

    const typeLabels = {
        regular_holiday: 'Regular Holiday',
        special_holiday: 'Special Holiday',
        company_holiday: 'Company Holiday',
        no_work: 'No Work (Typhoon, emergency, etc.)',
        sunday_work: 'Sunday Work',
        special_schedule: 'Special Schedule (Different hours)',
        half_day: 'Half Day',
    };

    const appliesToLabels = {
        all: 'All Departments',
        department: 'Specific Department',
        employees: 'Specific Employees',
    };

    return (
        <div className="relative">
            <style>{`
                .react-calendar {
                    width: 100%;
                    border: none;
                    font-family: inherit;
                    background: white;
                }
                .react-calendar__tile {
                    padding: 0.75rem 0.25rem;
                    height: auto;
                    min-height: 80px;
                    font-size: 0.875rem;
                    position: relative;
                }
                .react-calendar__tile:enabled:hover {
                    background-color: #e0e7ff;
                    cursor: pointer;
                }
                .react-calendar__tile--active {
                    background-color: #1E3A8A !important;
                    color: white !important;
                }
                .react-calendar__navigation button {
                    font-size: 1rem;
                    font-weight: 600;
                    padding: 0.75rem;
                    color: #1E3A8A;
                }
                .react-calendar__navigation button:enabled:hover {
                    background-color: #e0e7ff;
                }
                .react-calendar__month-view__weekdays {
                    font-size: 0.75rem;
                    font-weight: 600;
                    text-transform: uppercase;
                    color: #64748b;
                }
                .react-calendar__month-view__days__day--weekend {
                    color: #dc2626;
                }
                .has-override-events {
                    background-color: #fef3c7;
                }
                .has-override-events:hover {
                    background-color: #fde68a !important;
                }
            `}</style>

            {/* 2-Panel Layout */}
            <div className="flex gap-6">
                {/* LEFT PANEL: Calendar */}
                <div className="w-3/5 flex-shrink-0">
                    <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
                        <Calendar
                            value={selectedDate || new Date(selectedYear, selectedMonth, 1)}
                            onClickDay={handleDateClick}
                            onActiveStartDateChange={handleActiveMonthChange}
                            tileContent={getTileContent}
                            tileClassName={getTileClassName}
                            showNeighboringMonth={false}
                            minDetail="year"
                            maxDetail="month"
                        />
                    </div>

                    {/* Legend */}
                    <div className="mt-4 flex flex-wrap items-center gap-3 text-xs">
                        <div className="flex items-center gap-1.5">
                            <div className="h-3 w-3 rounded bg-danger"></div>
                            <span className="text-slate-600">Regular Holiday</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                            <div className="h-3 w-3 rounded bg-warning"></div>
                            <span className="text-slate-600">Special Holiday</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                            <div className="h-3 w-3 rounded bg-primary"></div>
                            <span className="text-slate-600">Company Holiday</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                            <div className="h-3 w-3 rounded bg-slate-500"></div>
                            <span className="text-slate-600">No Work</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                            <div className="h-3 w-3 rounded bg-success"></div>
                            <span className="text-slate-600">Sunday Work</span>
                        </div>
                    </div>
                </div>

                {/* RIGHT PANEL: Context-Aware Display */}
                <div className="flex-1">
                    <div className="rounded-lg border border-slate-200 bg-white shadow-sm">
                        {viewMode === 'monthly' ? (
                            <MonthlyView 
                                monthName={monthNames[selectedMonth]}
                                year={selectedYear}
                                stats={monthStats}
                                overrides={currentMonthOverrides}
                                onEditOverride={handleEditOverride}
                                onDeleteOverride={handleDelete}
                            />
                        ) : (
                            <DateView 
                                date={selectedDate}
                                overrides={selectedDateOverrides}
                                onBack={handleBackToMonthly}
                                onAddOverride={handleAddOverride}
                                onEditOverride={handleEditOverride}
                                onDeleteOverride={handleDelete}
                            />
                        )}
                    </div>
                </div>
            </div>

            {/* Right-Side Drawer */}
            {showDrawer && (
                <>
                    {/* Backdrop */}
                    <div 
                        className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm transition-opacity"
                        onClick={handleCloseDrawer}
                    />
                    
                    {/* Drawer */}
                    <div className="fixed right-0 top-0 z-50 h-full w-full max-w-md overflow-y-auto bg-white shadow-2xl">
                        {/* Drawer Header */}
                        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-slate-50 px-6 py-4">
                            <h3 className="text-section-title text-slate-800">
                                {editingOverride ? 'Edit Entry' : 'Add Entry'}
                            </h3>
                            <button
                                type="button"
                                onClick={handleCloseDrawer}
                                className="rounded-md p-2 text-slate-400 transition hover:bg-slate-200 hover:text-slate-600"
                            >
                                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        {/* Drawer Content */}
                        <form onSubmit={handleSubmit} className="flex flex-col h-[calc(100%-73px)]">
                            <div className="flex-1 overflow-y-auto p-6 space-y-5">
                                {/* Recurring Holiday Warning */}
                                {editingOverride?.is_recurring && (
                                    <div className="rounded-md bg-warning/10 border border-warning/20 p-4">
                                        <div className="flex items-start gap-3">
                                            <svg className="h-5 w-5 text-warning flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                            </svg>
                                            <div className="flex-1">
                                                <h4 className="text-sm font-medium text-warning-800 mb-1">Editing Recurring Entry</h4>
                                                <p className="text-xs text-warning-700">
                                                    This is a recurring entry that appears every year. Any changes you make will apply to all years. 
                                                    If you want different settings for a specific year or department, create a new override entry instead.
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Error Display */}
                                {Object.keys(errors).length > 0 && (
                                    <div className="rounded-md bg-danger/10 border border-danger/20 p-4">
                                        <div className="flex items-start gap-3">
                                            <svg className="h-5 w-5 text-danger flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                            </svg>
                                            <div className="flex-1">
                                                <h4 className="text-sm font-medium text-danger mb-1">There were errors with your submission:</h4>
                                                <ul className="text-xs text-danger/80 space-y-1">
                                                    {Object.entries(errors).map(([field, messages]) => (
                                                        <li key={field}>• {Array.isArray(messages) ? messages[0] : messages}</li>
                                                    ))}
                                                </ul>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Date */}
                                <div>
                                    <label className="mb-1.5 block text-card-label text-secondary">
                                        Date <span className="text-danger">*</span>
                                    </label>
                                    <input
                                        type="date"
                                        value={form.override_date}
                                        onChange={(e) => setForm({ ...form, override_date: e.target.value })}
                                        className={`w-full rounded-md border ${errors.override_date ? 'border-danger' : 'border-slate-300'} bg-white px-3 py-2.5 text-sm text-slate-700 shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary`}
                                        required
                                    />
                                    {errors.override_date && (
                                        <p className="mt-1 text-xs text-danger">{errors.override_date}</p>
                                    )}
                                </div>

                                {/* Type */}
                                <div>
                                    <label className="mb-1.5 block text-card-label text-secondary">
                                        Type <span className="text-danger">*</span>
                                    </label>
                                    <div className="relative">
                                        <button
                                            type="button"
                                            onClick={() => setShowTypeDropdown(!showTypeDropdown)}
                                            className="w-full flex items-center justify-between rounded-md border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-700 shadow-sm hover:bg-slate-50 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                                        >
                                            <span>{typeLabels[form.override_type]}</span>
                                            <svg className="h-4 w-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                                            </svg>
                                        </button>
                                        {showTypeDropdown && (
                                            <div className="absolute z-10 mt-1 w-full rounded-md border border-slate-200 bg-white shadow-lg">
                                                <div className="py-1">
                                                    <div className="px-3 py-2 text-xs font-semibold text-slate-500 uppercase">Holidays (No Fixed Date)</div>
                                                    <button
                                                        type="button"
                                                        onClick={() => handleTypeChange('regular_holiday')}
                                                        className="w-full px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-100"
                                                    >
                                                        Regular Holiday
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => handleTypeChange('special_holiday')}
                                                        className="w-full px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-100"
                                                    >
                                                        Special Holiday
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => handleTypeChange('company_holiday')}
                                                        className="w-full px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-100"
                                                    >
                                                        Company Holiday
                                                    </button>
                                                    <div className="border-t border-slate-200 mt-1 pt-1">
                                                        <div className="px-3 py-2 text-xs font-semibold text-slate-500 uppercase">Schedule Changes</div>
                                                        <button
                                                            type="button"
                                                            onClick={() => handleTypeChange('no_work')}
                                                            className="w-full px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-100"
                                                        >
                                                            No Work (Typhoon, emergency, etc.)
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => handleTypeChange('sunday_work')}
                                                            className="w-full px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-100"
                                                        >
                                                            Sunday Work
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => handleTypeChange('special_schedule')}
                                                            className="w-full px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-100"
                                                        >
                                                            Special Schedule (Different hours)
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => handleTypeChange('half_day')}
                                                            className="w-full px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-100"
                                                        >
                                                            Half Day
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                    <p className="mt-1.5 text-xs text-slate-500">
                                        Use holiday types for movable holidays (e.g., Easter, Eid). Fixed-date holidays are managed separately.
                                    </p>
                                </div>

                                {/* Reason/Name */}
                                <div>
                                    <label className="mb-1.5 block text-card-label text-secondary">
                                        {isHoliday ? 'Holiday Name' : 'Reason'} <span className="text-danger">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        value={form.reason}
                                        onChange={(e) => setForm({ ...form, reason: e.target.value })}
                                        className="w-full rounded-md border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-700 shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                                        placeholder={isHoliday ? 'e.g., Christmas Day' : 'e.g., Typhoon Odette'}
                                        required
                                    />
                                </div>

                                {/* Applies To */}
                                <div>
                                    <label className="mb-1.5 block text-card-label text-secondary">
                                        Applies To <span className="text-danger">*</span>
                                    </label>
                                    <div className="relative">
                                        <button
                                            type="button"
                                            onClick={() => setShowAppliesToDropdown(!showAppliesToDropdown)}
                                            className="w-full flex items-center justify-between rounded-md border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-700 shadow-sm hover:bg-slate-50 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                                        >
                                            <span>{appliesToLabels[form.applies_to]}</span>
                                            <svg className="h-4 w-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                                            </svg>
                                        </button>
                                        {showAppliesToDropdown && (
                                            <div className="absolute z-10 mt-1 w-full rounded-md border border-slate-200 bg-white shadow-lg">
                                                <div className="py-1">
                                                    <button
                                                        type="button"
                                                        onClick={() => handleAppliesToChange('all')}
                                                        className="w-full px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-100"
                                                    >
                                                        All Departments
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => handleAppliesToChange('department')}
                                                        className="w-full px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-100"
                                                    >
                                                        Specific Department
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => handleAppliesToChange('employees')}
                                                        className="w-full px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-100"
                                                    >
                                                        Specific Employees
                                                    </button>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Department Dropdown (for department or employees) */}
                                {(form.applies_to === 'department' || form.applies_to === 'employees') && (
                                    <div>
                                        <label className="mb-1.5 block text-card-label text-secondary">
                                            Select Department <span className="text-danger">*</span>
                                        </label>
                                        <select
                                            value={form.department_id}
                                            onChange={(e) => {
                                                const deptId = e.target.value;
                                                setForm({ ...form, department_id: deptId, employee_ids: [] });
                                                if (form.applies_to === 'employees') {
                                                    fetchEmployees(deptId);
                                                }
                                            }}
                                            className="w-full rounded-md border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-700 shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                                            required
                                        >
                                            <option value="">Choose a department...</option>
                                            {departments.map(dept => (
                                                <option key={dept.id} value={dept.id}>
                                                    {dept.name}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                )}

                                {/* Employee Multi-Select */}
                                {form.applies_to === 'employees' && form.department_id && (
                                    <div>
                                        <label className="mb-1.5 block text-card-label text-secondary">
                                            Select Employees <span className="text-danger">*</span>
                                        </label>
                                        
                                        {loadingEmployees ? (
                                            <div className="rounded-md border border-slate-300 bg-slate-50 px-3 py-8 text-center text-sm text-slate-500">
                                                Loading employees...
                                            </div>
                                        ) : employees.length === 0 ? (
                                            <div className="rounded-md border border-slate-300 bg-slate-50 px-3 py-8 text-center text-sm text-slate-500">
                                                No employees in this department
                                            </div>
                                        ) : (
                                            <div className="max-h-48 overflow-y-auto rounded-md border border-slate-300 bg-white">
                                                {employees.map(emp => (
                                                    <label
                                                        key={emp.id}
                                                        className="flex items-center gap-3 border-b border-slate-100 px-3 py-2.5 transition hover:bg-slate-50 last:border-b-0"
                                                    >
                                                        <input
                                                            type="checkbox"
                                                            checked={form.employee_ids.includes(emp.id)}
                                                            onChange={(e) => {
                                                                if (e.target.checked) {
                                                                    setForm({ ...form, employee_ids: [...form.employee_ids, emp.id] });
                                                                } else {
                                                                    setForm({ ...form, employee_ids: form.employee_ids.filter(id => id !== emp.id) });
                                                                }
                                                            }}
                                                            className="h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary"
                                                        />
                                                        <div className="flex-1">
                                                            <div className="text-sm font-medium text-slate-900">
                                                                {emp.first_name} {emp.last_name}
                                                            </div>
                                                            <div className="text-xs text-slate-500">{emp.employee_code}</div>
                                                        </div>
                                                    </label>
                                                ))}
                                            </div>
                                        )}
                                        {form.employee_ids.length > 0 && (
                                            <p className="mt-1.5 text-xs text-slate-600">
                                                {form.employee_ids.length} employee{form.employee_ids.length !== 1 ? 's' : ''} selected
                                            </p>
                                        )}
                                    </div>
                                )}

                                {/* Operation Hours (for all override types) */}
                                {showOperationHours && (
                                    <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 space-y-4">
                                        <div className="flex items-center justify-between">
                                            <div className="text-sm font-medium text-slate-900">Operation Hours</div>
                                            <div className="text-xs text-slate-500">Optional for holidays</div>
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label className="mb-1.5 block text-xs text-slate-600">
                                                    Opening Time
                                                </label>
                                                <input
                                                    type="time"
                                                    value={form.opening_time || ''}
                                                    onChange={(e) => setForm({ ...form, opening_time: e.target.value })}
                                                    className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                                                />
                                            </div>
                                            <div>
                                                <label className="mb-1.5 block text-xs text-slate-600">
                                                    Closing Time
                                                </label>
                                                <input
                                                    type="time"
                                                    value={form.closing_time || ''}
                                                    onChange={(e) => setForm({ ...form, closing_time: e.target.value })}
                                                    className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                                                />
                                            </div>
                                        </div>
                                        <p className="text-xs text-slate-500">
                                            {isHoliday 
                                                ? 'Set operation hours if the company operates with different hours during this holiday.'
                                                : 'Specify the opening and closing times for this override.'}
                                        </p>
                                    </div>
                                )}

                                {/* Recurring Option */}
                                <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                                    <label className="flex items-start gap-3">
                                        <input
                                            type="checkbox"
                                            checked={form.is_recurring}
                                            onChange={(e) => setForm({ ...form, is_recurring: e.target.checked })}
                                            className="mt-0.5 h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary"
                                        />
                                        <div>
                                            <div className="text-sm font-medium text-slate-900">Recurring Yearly</div>
                                            <div className="text-xs text-slate-500">
                                                {editingOverride?.is_recurring 
                                                    ? 'This is a recurring entry. Changes will apply to all years.'
                                                    : 'Automatically appears every year'}
                                            </div>
                                        </div>
                                    </label>
                                </div>
                            </div>

                            {/* Drawer Footer */}
                            <div className="flex-shrink-0 flex items-center justify-between border-t border-slate-200 bg-slate-50 px-6 py-4">
                                {editingOverride ? (
                                    <button
                                        type="button"
                                        onClick={handleDelete}
                                        className="rounded-md bg-danger px-4 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-danger-700"
                                    >
                                        Delete
                                    </button>
                                ) : (
                                    <div></div>
                                )}
                                <button
                                    type="submit"
                                    disabled={processing}
                                    className="rounded-md bg-primary px-6 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                                >
                                    {processing && (
                                        <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                        </svg>
                                    )}
                                    {editingOverride ? 'Save Changes' : 'Add Entry'}
                                </button>
                            </div>
                        </form>
                    </div>
                </>
            )}
        </div>
    );
}
