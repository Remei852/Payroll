import { useState, useMemo } from 'react';
import { router } from '@inertiajs/react';

export default function WorkSchedulesTab({ workSchedules = [], departments = [] }) {
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedSchedule, setSelectedSchedule] = useState(null);
    const [form, setForm] = useState({
        name: '',
        work_start_time: '08:00',
        work_end_time: '17:00',
        break_start_time: '12:00',
        break_end_time: '13:00',
        grace_period_minutes: 15,
        is_working_day: true,
    });

    const filteredSchedules = useMemo(() => {
        if (!searchQuery.trim()) return workSchedules;
        const query = searchQuery.toLowerCase();
        return workSchedules.filter(schedule => 
            schedule.name.toLowerCase().includes(query) ||
            schedule.department_name?.toLowerCase().includes(query)
        );
    }, [workSchedules, searchQuery]);

    function handleSelectSchedule(schedule) {
        setSelectedSchedule(schedule);
        setForm({
            name: schedule.name,
            work_start_time: schedule.work_start_time || '08:00',
            work_end_time: schedule.work_end_time || '17:00',
            break_start_time: schedule.break_start_time || '12:00',
            break_end_time: schedule.break_end_time || '13:00',
            grace_period_minutes: schedule.grace_period_minutes || 15,
            is_working_day: schedule.is_working_day ?? true,
        });
    }

    function handleSubmit(e) {
        e.preventDefault();
        
        if (selectedSchedule) {
            router.put(route('admin.settings.work-schedules.update', selectedSchedule.id), form);
        }
    }

    function calculateWorkHours(start, end, breakStart, breakEnd) {
        if (!start || !end) return '0h';
        
        const [startH, startM] = start.split(':').map(Number);
        const [endH, endM] = end.split(':').map(Number);
        
        let totalMinutes = (endH * 60 + endM) - (startH * 60 + startM);
        
        if (breakStart && breakEnd) {
            const [breakStartH, breakStartM] = breakStart.split(':').map(Number);
            const [breakEndH, breakEndM] = breakEnd.split(':').map(Number);
            const breakMinutes = (breakEndH * 60 + breakEndM) - (breakStartH * 60 + breakStartM);
            totalMinutes -= breakMinutes;
        }
        
        const hours = Math.floor(totalMinutes / 60);
        const minutes = totalMinutes % 60;
        
        return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
    }

    return (
        <div className="flex gap-6 h-[calc(100vh-280px)]">
            {/* Left Panel - Department Schedule List */}
            <div className="w-96 flex-shrink-0">
                <div className="rounded-lg border border-slate-200 bg-white shadow-sm h-full flex flex-col">
                    {/* Header */}
                    <div className="border-b border-slate-200 p-5">
                        <div className="flex items-center justify-between mb-4">
                            <div>
                                <h3 className="text-lg font-semibold text-slate-900">Department Schedules</h3>
                                <p className="mt-0.5 text-xs text-slate-500">
                                    {workSchedules.length} {workSchedules.length === 1 ? 'department' : 'departments'}
                                </p>
                            </div>
                        </div>
                        
                        {/* Search Bar */}
                        <div className="relative">
                            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                                <svg className="h-4 w-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                </svg>
                            </div>
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="block w-full rounded-lg border border-slate-300 bg-white py-2 pl-10 pr-3 text-sm placeholder-slate-400 transition focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                                placeholder="Search departments..."
                            />
                        </div>
                    </div>

                    {/* Schedule List */}
                    <div className="flex-1 overflow-y-auto">
                        {filteredSchedules.length === 0 ? (
                            <div className="p-12 text-center">
                                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-slate-100">
                                    <svg className="h-8 w-8 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                    </svg>
                                </div>
                                <h4 className="mt-4 text-sm font-medium text-slate-900">
                                    {searchQuery ? 'No departments found' : 'No departments yet'}
                                </h4>
                                <p className="mt-1 text-xs text-slate-500">
                                    {searchQuery ? 'Try a different search term' : 'Create departments to manage their work schedules'}
                                </p>
                                {!searchQuery && (
                                    <p className="mt-4 text-xs text-slate-600">
                                        Schedules are automatically created when you add a new department
                                    </p>
                                )}
                            </div>
                        ) : (
                            <div className="divide-y divide-slate-100">
                                {filteredSchedules.map((schedule) => {
                                    const isSelected = selectedSchedule?.id === schedule.id;
                                    const workHours = calculateWorkHours(
                                        schedule.work_start_time,
                                        schedule.work_end_time,
                                        schedule.break_start_time,
                                        schedule.break_end_time
                                    );
                                    
                                    return (
                                        <div
                                            key={schedule.id}
                                            className={`group relative cursor-pointer p-4 transition ${
                                                isSelected
                                                    ? 'bg-primary/5 border-l-4 border-primary'
                                                    : 'hover:bg-slate-50 border-l-4 border-transparent'
                                            }`}
                                            onClick={() => handleSelectSchedule(schedule)}
                                        >
                                            <div className="flex items-start justify-between gap-3">
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <span className="inline-flex items-center gap-1.5 rounded-md bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary ring-1 ring-inset ring-primary/20">
                                                            <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                                                <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                                                            </svg>
                                                            {schedule.department_name}
                                                        </span>
                                                        {isSelected && (
                                                            <span className="flex-shrink-0 inline-flex items-center rounded-full bg-success px-2 py-0.5 text-xs font-medium text-white">
                                                                Editing
                                                            </span>
                                                        )}
                                                    </div>
                                                    <h4 className="text-sm font-semibold text-slate-900 truncate">
                                                        {schedule.name}
                                                    </h4>
                                                    
                                                    <div className="mt-2 space-y-1.5">
                                                        <div className="flex items-center gap-2 text-xs text-slate-600">
                                                            <svg className="h-3.5 w-3.5 text-success" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                            </svg>
                                                            <span>{schedule.work_start_time} - {schedule.work_end_time}</span>
                                                        </div>
                                                        {schedule.break_start_time && schedule.break_end_time && (
                                                            <div className="flex items-center gap-2 text-xs text-slate-600">
                                                                <svg className="h-3.5 w-3.5 text-warning" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                                </svg>
                                                                <span>Break: {schedule.break_start_time} - {schedule.break_end_time}</span>
                                                            </div>
                                                        )}
                                                    </div>
                                                    
                                                    <div className="mt-2.5 flex flex-wrap gap-2">
                                                        <span className="inline-flex items-center gap-1 rounded-md bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary ring-1 ring-inset ring-primary/20">
                                                            <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                                                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                            </svg>
                                                            {workHours} work
                                                        </span>
                                                        <span className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
                                                            <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                            </svg>
                                                            {schedule.grace_period_minutes || 0} min grace
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Right Panel - Schedule Form */}
            <div className="flex-1 min-w-0 overflow-hidden">
                <form onSubmit={handleSubmit} className="flex flex-col h-full rounded-lg border border-slate-200 bg-white shadow-sm">
                    {/* Header */}
                    <div className="flex-shrink-0 border-b border-slate-200 bg-gradient-to-r from-slate-50 to-white px-6 py-5">
                        <div className="flex items-center justify-between">
                            <div>
                                <h3 className="text-lg font-semibold text-slate-900">
                                    {selectedSchedule ? 'Edit Department Schedule' : 'Select a Department'}
                                </h3>
                                <p className="mt-1 text-sm text-slate-600">
                                    {selectedSchedule 
                                        ? `Update work hours for ${selectedSchedule.department_name}`
                                        : 'Choose a department from the list to edit its schedule'
                                    }
                                </p>
                            </div>
                            {selectedSchedule && (
                                <span className="inline-flex items-center gap-1.5 rounded-full bg-success/10 px-3 py-1 text-xs font-medium text-success">
                                    <svg className="h-3.5 w-3.5" fill="currentColor" viewBox="0 0 24 24">
                                        <circle cx="12" cy="12" r="3" />
                                    </svg>
                                    Editing
                                </span>
                            )}
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto p-6 space-y-6">
                        {!selectedSchedule ? (
                            <div className="flex items-center justify-center h-full">
                                <div className="text-center">
                                    <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-slate-100">
                                        <svg className="h-10 w-10 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                        </svg>
                                    </div>
                                    <h4 className="mt-4 text-base font-medium text-slate-900">
                                        No Department Selected
                                    </h4>
                                    <p className="mt-2 text-sm text-slate-600 max-w-sm">
                                        Select a department from the list on the left to view and edit its work schedule
                                    </p>
                                </div>
                            </div>
                        ) : (
                            <>
                        {/* Schedule Name */}
                        <div className="rounded-lg border border-slate-200 bg-slate-50/50 p-4">
                            <label className="mb-2 block text-sm font-semibold text-slate-900">
                                Schedule Name <span className="text-danger">*</span>
                            </label>
                            <input
                                type="text"
                                value={form.name}
                                onChange={(e) => setForm({ ...form, name: e.target.value })}
                                className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-900 shadow-sm transition focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                                placeholder="e.g., Regular Office Hours, Night Shift, Flexible Hours"
                                required
                            />
                            <p className="mt-2 text-xs text-slate-500">
                                Give this schedule a descriptive name
                            </p>
                        </div>

                        {/* Work Hours */}
                        <div className="rounded-lg border border-slate-200 bg-slate-50/50 p-4">
                            <label className="mb-3 block text-sm font-semibold text-slate-900">
                                Work Hours <span className="text-danger">*</span>
                            </label>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <label className="flex items-center gap-1.5 text-xs font-medium text-slate-700">
                                        <svg className="h-3.5 w-3.5 text-success" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                        Start Time
                                    </label>
                                    <input
                                        type="time"
                                        value={form.work_start_time}
                                        onChange={(e) => setForm({ ...form, work_start_time: e.target.value })}
                                        className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 transition focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                                        required
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="flex items-center gap-1.5 text-xs font-medium text-slate-700">
                                        <svg className="h-3.5 w-3.5 text-success" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                        End Time
                                    </label>
                                    <input
                                        type="time"
                                        value={form.work_end_time}
                                        onChange={(e) => setForm({ ...form, work_end_time: e.target.value })}
                                        className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 transition focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                                        required
                                    />
                                </div>
                            </div>
                            <p className="mt-2 text-xs text-slate-500">
                                Define the standard work hours for this department
                            </p>
                        </div>

                        {/* Break Times */}
                        <div className="rounded-lg border border-slate-200 bg-slate-50/50 p-4">
                            <label className="mb-3 block text-sm font-semibold text-slate-900">
                                Break Time (Optional)
                            </label>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <label className="flex items-center gap-1.5 text-xs font-medium text-slate-700">
                                        <svg className="h-3.5 w-3.5 text-warning" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                        Break Start
                                    </label>
                                    <input
                                        type="time"
                                        value={form.break_start_time}
                                        onChange={(e) => setForm({ ...form, break_start_time: e.target.value })}
                                        className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 transition focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="flex items-center gap-1.5 text-xs font-medium text-slate-700">
                                        <svg className="h-3.5 w-3.5 text-warning" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                        Break End
                                    </label>
                                    <input
                                        type="time"
                                        value={form.break_end_time}
                                        onChange={(e) => setForm({ ...form, break_end_time: e.target.value })}
                                        className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 transition focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                                    />
                                </div>
                            </div>
                            <p className="mt-2 text-xs text-slate-500">
                                Break time will be deducted from total work hours
                            </p>
                        </div>

                        {/* Grace Period */}
                        <div className="rounded-lg border border-slate-200 bg-slate-50/50 p-4">
                            <label className="mb-2 block text-sm font-semibold text-slate-900">
                                Grace Period
                            </label>
                            <div className="flex items-center gap-3">
                                <input
                                    type="number"
                                    min="0"
                                    max="60"
                                    value={form.grace_period_minutes}
                                    onChange={(e) => setForm({ ...form, grace_period_minutes: parseInt(e.target.value) || 0 })}
                                    className="w-32 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-900 shadow-sm transition focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                                />
                                <span className="text-sm text-slate-600">minutes</span>
                            </div>
                            <p className="mt-2 text-xs text-slate-500">
                                Late grace period for disciplinary letters (not for payroll deductions)
                            </p>
                        </div>

                        {/* Working Day Toggle */}
                        <div className="rounded-lg border border-slate-200 bg-slate-50/50 p-4">
                            <label className="flex items-center justify-between cursor-pointer">
                                <div>
                                    <span className="text-sm font-semibold text-slate-900">Working Day</span>
                                    <p className="mt-1 text-xs text-slate-500">
                                        Mark if this is a regular working schedule
                                    </p>
                                </div>
                                <input
                                    type="checkbox"
                                    checked={form.is_working_day}
                                    onChange={(e) => setForm({ ...form, is_working_day: e.target.checked })}
                                    className="h-5 w-5 rounded border-slate-300 text-primary transition focus:ring-2 focus:ring-primary/20 focus:ring-offset-0"
                                />
                            </label>
                        </div>
                        </>
                        )}
                    </div>

                    {/* Footer Actions */}
                    {selectedSchedule && (
                        <div className="flex-shrink-0 flex items-center justify-between border-t border-slate-200 bg-gradient-to-r from-slate-50 to-white px-6 py-4">
                            <div className="text-xs text-slate-500">
                                <span>Editing schedule for: <span className="font-medium text-slate-700">{selectedSchedule.department_name}</span></span>
                            </div>
                            <div className="flex items-center gap-3">
                                <button
                                    type="submit"
                                    className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-primary/90 hover:shadow-md"
                                >
                                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                    </svg>
                                    Update Schedule
                                </button>
                            </div>
                        </div>
                    )}
                </form>
            </div>
        </div>
    );
}
