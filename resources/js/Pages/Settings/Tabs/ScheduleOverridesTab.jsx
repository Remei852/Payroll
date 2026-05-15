import { useState, useMemo } from 'react';
import { router } from '@inertiajs/react';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';

// Monthly View Component
function MonthlyView({ monthName, year, stats, overrides, onEditOverride, onDeleteOverride }) {
    const getOverrideColor = (type) => {
        switch (type) {
            case 'regular_holiday': return 'bg-rose-500';
            case 'special_holiday': return 'bg-amber-500';
            case 'company_holiday': return 'bg-blue-600';
            case 'no_work': return 'bg-slate-600';
            case 'sunday_work': return 'bg-emerald-600';
            case 'special_schedule': return 'bg-indigo-600';
            case 'half_day': return 'bg-sky-500';
            default: return 'bg-slate-500';
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
        <div className="flex flex-col h-full animate-in fade-in duration-500 overflow-hidden">
            {/* Header */}
            <div className="flex-shrink-0 border-b border-slate-100 bg-slate-50/50 px-6 py-4">
                <h3 className="text-[13px] font-bold text-slate-800 tracking-tight uppercase">{monthName} {year}</h3>
                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Monthly Overview</p>
            </div>

            {/* Stats */}
            <div className="flex-shrink-0 border-b border-slate-100 bg-white px-6 py-4">
                <div className="grid grid-cols-3 gap-3">
                    <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 text-center">
                        <div className="text-lg font-bold text-slate-800 leading-none">{stats.total}</div>
                        <div className="text-[8px] font-bold text-slate-400 uppercase tracking-widest mt-1.5">Total</div>
                    </div>
                    <div className="p-3 rounded-xl bg-rose-50 border border-rose-100 text-center">
                        <div className="text-lg font-bold text-rose-600 leading-none">{stats.holidays}</div>
                        <div className="text-[8px] font-bold text-rose-400 uppercase tracking-widest mt-1.5">Holidays</div>
                    </div>
                    <div className="p-3 rounded-xl bg-blue-50 border border-blue-100 text-center">
                        <div className="text-lg font-bold text-blue-700 leading-none">{stats.scheduleChanges}</div>
                        <div className="text-[8px] font-bold text-blue-400 uppercase tracking-widest mt-1.5">Custom</div>
                    </div>
                </div>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-hide">
                {overrides.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 text-center opacity-60">
                        <div className="h-10 w-10 rounded-full bg-slate-50 flex items-center justify-center mb-4 text-slate-200">
                            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                        </div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">No Records</p>
                    </div>
                ) : (
                    <>
                        {holidays.length > 0 && (
                            <div className="space-y-3">
                                <h4 className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-1">Official Holidays</h4>
                                {holidays.map(override => <OverrideCard key={override.id} override={override} getOverrideColor={getOverrideColor} getTypeLabel={getTypeLabel} onEdit={onEditOverride} onDelete={onDeleteOverride} />)}
                            </div>
                        )}
                        {scheduleChanges.length > 0 && (
                            <div className="space-y-3">
                                <h4 className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-1">Manual Overrides</h4>
                                {scheduleChanges.map(override => <OverrideCard key={override.id} override={override} getOverrideColor={getOverrideColor} getTypeLabel={getTypeLabel} onEdit={onEditOverride} onDelete={onDeleteOverride} />)}
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
            case 'regular_holiday': return 'bg-rose-500';
            case 'special_holiday': return 'bg-amber-500';
            case 'company_holiday': return 'bg-blue-600';
            case 'no_work': return 'bg-slate-600';
            case 'sunday_work': return 'bg-emerald-600';
            case 'special_schedule': return 'bg-indigo-600';
            case 'half_day': return 'bg-sky-500';
            default: return 'bg-slate-500';
        }
    };

    const getTypeLabel = (type) => {
        const labels = {
            regular_holiday: 'Regular Holiday', special_holiday: 'Special Holiday', company_holiday: 'Company Holiday', no_work: 'No Work', sunday_work: 'Sunday Work', special_schedule: 'Special Schedule', half_day: 'Half Day',
        };
        return labels[type] || type;
    };

    const dateStr = date.toLocaleDateString('en-US', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' });
    const holidays = overrides.filter(o => o.is_from_holidays_table);
    const customOverrides = overrides.filter(o => !o.is_from_holidays_table);

    return (
        <div className="flex flex-col h-full animate-in slide-in-from-right-2 duration-300 overflow-hidden">
            {/* Header */}
            <div className="flex-shrink-0 border-b border-slate-100 bg-slate-50/50 px-6 py-4">
                <button onClick={onBack} className="flex items-center gap-1.5 text-[9px] font-bold text-[#1E3A8A] uppercase tracking-widest hover:text-blue-800 transition mb-2">
                    <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
                    Monthly View
                </button>
                <h3 className="text-[14px] font-bold text-slate-800 tracking-tight uppercase">{dateStr}</h3>
            </div>

            {/* Add Button */}
            <div className="flex-shrink-0 px-6 py-5">
                <button onClick={() => onAddOverride(date)} className="w-full group flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-slate-200 bg-slate-50/30 p-5 transition-all hover:border-[#1E3A8A] hover:bg-blue-50/30">
                    <div className="h-8 w-8 rounded-lg bg-white shadow-sm flex items-center justify-center text-slate-400 group-hover:text-[#1E3A8A] transition-all"><svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg></div>
                    <span className="text-[11px] font-bold text-slate-600 uppercase tracking-widest group-hover:text-[#1E3A8A] transition">Add Override</span>
                </button>
            </div>

            {/* Overrides List */}
            <div className="flex-1 overflow-y-auto px-6 pb-6 space-y-5 scrollbar-hide">
                {overrides.length === 0 && <p className="text-[10px] text-center text-slate-400 font-black uppercase py-10 tracking-widest">No Active Rules</p>}
                {holidays.length > 0 && (
                    <div className="space-y-2">
                        <h4 className="text-[8px] font-black text-slate-400 uppercase tracking-widest px-1">Official</h4>
                        {holidays.map(override => <OverrideCard key={override.id} override={override} getOverrideColor={getOverrideColor} getTypeLabel={getTypeLabel} onEdit={onEditOverride} onDelete={onDeleteOverride} detailed={true} />)}
                    </div>
                )}
                {customOverrides.length > 0 && (
                    <div className="space-y-2">
                        <h4 className="text-[8px] font-black text-slate-400 uppercase tracking-widest px-1">Custom</h4>
                        {customOverrides.map(override => <OverrideCard key={override.id} override={override} getOverrideColor={getOverrideColor} getTypeLabel={getTypeLabel} onEdit={onEditOverride} onDelete={onDeleteOverride} detailed={true} />)}
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
        <div className={`group rounded-xl border ${isFromHolidaysTable ? 'border-slate-200 bg-slate-50/50' : 'border-slate-100 bg-white'} p-4 transition-all hover:shadow-lg hover:shadow-slate-200/50 hover:border-slate-300`}>
            <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                    <div className="flex items-center flex-wrap gap-1.5 mb-2">
                        <span className={`inline-flex items-center rounded-md px-1.5 py-0.5 text-[8px] font-black text-white uppercase tracking-wider ${colorClass}`}>
                            {getTypeLabel(override.override_type)}
                        </span>
                    </div>
                    <h4 className="text-[13px] font-bold text-slate-800 mb-1 truncate uppercase tracking-tight">{override.reason}</h4>
                    <div className="flex flex-wrap items-center gap-x-3 text-[10px] font-medium text-slate-400 uppercase tracking-widest">
                        {override.opening_time && override.closing_time && (
                            <div className="flex items-center gap-1">
                                <svg className="h-3 w-3 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                {override.opening_time.substring(0, 5)} - {override.closing_time.substring(0, 5)}
                            </div>
                        )}
                        <div className="flex items-center gap-1">
                            <svg className="h-3 w-3 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7" /></svg>
                            {override.department ? override.department.name : 'ALL STAFF'}
                        </div>
                    </div>
                </div>
                {!isFromHolidaysTable && (
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all">
                        <button onClick={() => onEdit(override)} className="p-1.5 text-slate-400 hover:text-blue-600 rounded-lg hover:bg-blue-50 transition-all active:scale-90"><svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg></button>
                        <button onClick={() => onDelete(override.id)} className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-all active:scale-90"><svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg></button>
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
    const [viewMode, setViewMode] = useState('monthly');
    const [showDrawer, setShowDrawer] = useState(false);
    const [editingOverride, setEditingOverride] = useState(null);
    const [employees, setEmployees] = useState([]);
    const [loadingEmployees, setLoadingEmployees] = useState(false);
    const [errors, setErrors] = useState({});
    const [processing, setProcessing] = useState(false);
    const [form, setForm] = useState({
        override_date: '', override_type: 'special_schedule', reason: '', applies_to: 'all', department_id: '', employee_id: '', employee_ids: [], opening_time: '08:00', closing_time: '17:00', is_paid: true, is_recurring: false,
    });

    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    const overridesByDate = useMemo(() => {
        const map = new Map();
        scheduleOverrides.forEach(o => { const date = new Date(o.override_date).toDateString(); if (!map.has(date)) map.set(date, []); map.get(date).push(o); });
        return map;
    }, [scheduleOverrides]);

    const currentMonthOverrides = useMemo(() => {
        return scheduleOverrides.filter(o => { const date = new Date(o.override_date); return date.getFullYear() === selectedYear && date.getMonth() === selectedMonth; }).sort((a, b) => new Date(a.override_date) - new Date(b.override_date));
    }, [scheduleOverrides, selectedYear, selectedMonth]);

    const monthStats = useMemo(() => {
        const holidays = currentMonthOverrides.filter(o => ['regular_holiday', 'special_holiday', 'company_holiday'].includes(o.override_type)).length;
        return { total: currentMonthOverrides.length, holidays, scheduleChanges: currentMonthOverrides.length - holidays };
    }, [currentMonthOverrides]);

    function getTileContent({ date, view }) {
        if (view === 'month') {
            const dayOverrides = overridesByDate.get(date.toDateString());
            if (dayOverrides?.length > 0) {
                return <div className="mt-1 flex flex-wrap gap-0.5 justify-center">{dayOverrides.slice(0, 3).map((o, idx) => <div key={idx} className={`h-1 w-1 rounded-full ${['regular_holiday', 'special_holiday', 'company_holiday'].includes(o.override_type) ? 'bg-rose-500' : 'bg-[#1E3A8A]'}`} />)}</div>;
            }
        }
        return null;
    }

    async function fetchEmployees(departmentId) {
        if (!departmentId) { setEmployees([]); return; }
        setLoadingEmployees(true);
        try { const response = await fetch(`/api/employees?department_id=${departmentId}`, { headers: { 'Accept': 'application/json' } }); const data = await response.json(); setEmployees(response.ok ? data.data || [] : []); } catch { setEmployees([]); } finally { setLoadingEmployees(false); }
    }

    function handleDateClick(date) { setSelectedDate(date); setSelectedMonth(date.getMonth()); setSelectedYear(date.getFullYear()); setViewMode('date'); }

    function handleAddOverride(date = null) {
        const targetDate = date || selectedDate || new Date();
        const year = targetDate.getFullYear(); const month = String(targetDate.getMonth() + 1).padStart(2, '0'); const day = String(targetDate.getDate()).padStart(2, '0');
        setEditingOverride(null); setForm({ override_date: `${year}-${month}-${day}`, override_type: 'special_schedule', reason: '', applies_to: 'all', department_id: '', employee_id: '', employee_ids: [], opening_time: '08:00', closing_time: '17:00', is_paid: true, is_recurring: false, }); setShowDrawer(true);
    }

    function handleEditOverride(override) {
        if (override.is_from_holidays_table) return;
        setEditingOverride(override);
        let appliesTo = override.department_id ? 'department' : 'all'; if (override.employees?.length > 0) appliesTo = 'employees';
        setForm({ ...override, applies_to: appliesTo, employee_ids: override.employees ? override.employees.map(e => e.id) : [], opening_time: override.opening_time?.substring(0, 5) || '08:00', closing_time: override.closing_time?.substring(0, 5) || '17:00', });
        if (override.department_id) fetchEmployees(override.department_id);
        setShowDrawer(true);
    }

    function handleSubmit(e) {
        e.preventDefault(); setErrors({}); setProcessing(true);
        const method = editingOverride ? 'put' : 'post'; const url = editingOverride ? route('admin.settings.schedule-overrides.update', editingOverride.id) : route('admin.settings.schedule-overrides.store');
        router[method](url, { ...form, department_id: form.applies_to !== 'all' ? form.department_id : null, employee_ids: form.applies_to === 'employees' ? form.employee_ids : [] }, { onSuccess: () => setShowDrawer(false), onError: setErrors, onFinish: () => setProcessing(false), });
    }

    function handleDelete(overrideId) { if (confirm('Delete this rule?')) { router.delete(route('admin.settings.schedule-overrides.destroy', overrideId), { onSuccess: () => { setShowDrawer(false); setViewMode('monthly'); } }); } }

    return (
        <div className="relative animate-in fade-in duration-500">
            <div className="flex flex-col lg:flex-row gap-6 items-start h-[520px]">
                {/* Left Side: Calendar */}
                <div className="w-full lg:w-[500px] flex-shrink-0 h-full">
                    <div className="card-premium p-6 h-full flex flex-col justify-between">
                        <div>
                            <Calendar 
                                value={selectedDate || new Date(selectedYear, selectedMonth, 1)} 
                                onClickDay={handleDateClick} 
                                onActiveStartDateChange={({ activeStartDate }) => { 
                                    setSelectedMonth(activeStartDate.getMonth()); 
                                    setSelectedYear(activeStartDate.getFullYear()); 
                                }} 
                                tileContent={getTileContent} 
                                showNeighboringMonth={false} 
                            />
                        </div>
                        <div className="mt-4 flex flex-wrap gap-x-6 gap-y-3 px-2 border-t border-slate-50 pt-6">
                            <div className="flex items-center gap-2.5 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                <div className="h-2 w-2 rounded-full bg-rose-500 shadow-sm shadow-rose-200" /> Holidays
                            </div>
                            <div className="flex items-center gap-2.5 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                <div className="h-2 w-2 rounded-full bg-[#1E3A8A] shadow-sm shadow-blue-200" /> Overrides
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right Side: List */}
                <div className="flex-1 min-w-0 h-full">
                    <div className="card-premium h-full overflow-hidden">
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
                                overrides={overridesByDate.get(selectedDate.toDateString()) || []} 
                                onBack={() => setViewMode('monthly')} 
                                onAddOverride={handleAddOverride} 
                                onEditOverride={handleEditOverride} 
                                onDeleteOverride={handleDelete} 
                            />
                        )}
                    </div>
                </div>
            </div>

            {showDrawer && (
                <>
                    <div className="fixed inset-0 z-[60] bg-slate-900/40 backdrop-blur-sm" onClick={() => setShowDrawer(false)} />
                    <div className="fixed right-0 top-0 z-[70] h-full w-full max-w-md bg-white shadow-2xl animate-in slide-in-from-right duration-300 flex flex-col">
                        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/80 backdrop-blur flex-shrink-0">
                            <div>
                                <h3 className="text-[15px] font-black text-slate-800 tracking-tight uppercase">
                                    {editingOverride ? 'Update Rule' : 'New Rule'}
                                </h3>
                                <p className="text-[10px] font-black text-[#1E3A8A] uppercase tracking-widest mt-0.5">Configuration</p>
                            </div>
                            <button onClick={() => setShowDrawer(false)} className="h-9 w-9 flex items-center justify-center rounded-xl border border-slate-200 text-slate-400 hover:text-slate-900 transition-all hover:bg-white active:scale-90"><svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6" /></svg></button>
                        </div>
                        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-7 scrollbar-hide">
                            <div className="p-4 rounded-2xl bg-blue-50/50 border border-blue-100 flex items-center gap-4 shadow-sm">
                                <div className="h-10 w-10 rounded-xl bg-[#1E3A8A] flex items-center justify-center text-white shadow-lg shadow-blue-900/20"><svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3" /></svg></div>
                                <div className="flex-1 leading-tight">
                                    <label className="text-[9px] font-black text-blue-400 uppercase tracking-widest block mb-0.5">Target Date</label>
                                    <span className="text-[14px] font-black text-[#1E3A8A] tracking-tight uppercase">{new Date(form.override_date).toLocaleDateString('en-US', { dateStyle: 'full' })}</span>
                                </div>
                            </div>
                            <div className="space-y-6">
                                <div className="space-y-2"><label className="text-[11px] font-black text-slate-400 uppercase tracking-widest px-1">Description</label><input type="text" value={form.reason} onChange={e => setForm({ ...form, reason: e.target.value })} required className="w-full input-premium py-3 text-[13px] font-bold" placeholder="Reason for override..." /></div>
                                <div className="grid grid-cols-2 gap-5">
                                    <div className="space-y-2"><label className="text-[11px] font-black text-slate-400 uppercase tracking-widest px-1">Type</label><select value={form.override_type} onChange={e => setForm({ ...form, override_type: e.target.value })} className="w-full rounded-xl border-slate-200 bg-slate-50/50 px-4 py-3 text-[13px] font-bold transition-all focus:bg-white focus:border-[#1E3A8A] focus:ring-4 focus:ring-blue-600/5"><option value="regular_holiday">Regular Holiday</option><option value="special_holiday">Special Holiday</option><option value="company_holiday">Company Holiday</option><option value="no_work">No Work</option><option value="sunday_work">Sunday Work</option><option value="special_schedule">Special Schedule</option><option value="half_day">Half Day</option></select></div>
                                    <div className="space-y-2"><label className="text-[11px] font-black text-slate-400 uppercase tracking-widest px-1">Scope</label><select value={form.applies_to} onChange={e => setForm({ ...form, applies_to: e.target.value, department_id: '', employee_ids: [] })} className="w-full rounded-xl border-slate-200 bg-slate-50/50 px-4 py-3 text-[13px] font-bold"><option value="all">Company Wide</option><option value="department">Department</option><option value="employees">Personnel</option></select></div>
                                </div>
                                {form.applies_to !== 'all' && <div className="space-y-2"><label className="text-[11px] font-black text-slate-400 uppercase tracking-widest px-1">Select Department</label><select value={form.department_id} onChange={e => { setForm({ ...form, department_id: e.target.value, employee_ids: [] }); if(form.applies_to === 'employees') fetchEmployees(e.target.value); }} className="w-full rounded-xl border-slate-200 bg-slate-50/50 px-4 py-3 text-[13px] font-bold"><option value="">Select Department...</option>{departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}</select></div>}
                                {form.applies_to === 'employees' && form.department_id && <div className="space-y-2"><label className="text-[11px] font-black text-slate-400 uppercase tracking-widest px-1">Select Personnel</label><div className="max-h-48 overflow-y-auto rounded-xl border border-slate-100 bg-slate-50/50 p-2 scrollbar-hide">{employees.map(emp => <label key={emp.id} className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-white cursor-pointer transition-all border border-transparent hover:border-slate-100"><input type="checkbox" checked={form.employee_ids.includes(emp.id)} onChange={e => setForm({ ...form, employee_ids: e.target.checked ? [...form.employee_ids, emp.id] : form.employee_ids.filter(id => id !== emp.id) })} className="h-4.5 w-4.5 rounded border-slate-300 text-[#1E3A8A]" /><span className="text-[12px] font-bold text-slate-700 truncate">{emp.first_name} {emp.last_name}</span></label>)}</div></div>}
                                {form.override_type !== 'no_work' && <div className="grid grid-cols-2 gap-5 p-5 rounded-2xl bg-slate-50 border border-slate-100 shadow-inner"><div className="space-y-1.5"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Opening</label><input type="time" value={form.opening_time} onChange={e => setForm({ ...form, opening_time: e.target.value })} className="w-full rounded-lg border-slate-200 px-3 py-2 text-[14px] font-black text-[#1E3A8A]" /></div><div className="space-y-1.5"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Closing</label><input type="time" value={form.closing_time} onChange={e => setForm({ ...form, closing_time: e.target.value })} className="w-full rounded-lg border-slate-200 px-3 py-2 text-[14px] font-black text-[#1E3A8A]" /></div></div>}
                                <div className="flex items-center justify-between p-4 rounded-2xl bg-slate-50 border border-slate-100 transition-all hover:bg-white hover:shadow-md hover:shadow-slate-200/50"><div className="flex flex-col"><span className="text-[12px] font-black text-slate-800 uppercase tracking-tight">Recurring Holiday</span><span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Apply every year</span></div><button type="button" onClick={() => setForm({ ...form, is_recurring: !form.is_recurring })} className={`relative inline-flex h-6 w-11 flex-shrink-0 rounded-full border-2 border-transparent transition-colors duration-200 ${form.is_recurring ? 'bg-emerald-500 shadow-sm shadow-emerald-200' : 'bg-slate-300'}`}><span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-lg transition duration-200 ${form.is_recurring ? 'translate-x-5' : 'translate-x-0'}`} /></button></div>
                            </div>
                        </form>
                        <div className="p-6 border-t border-slate-100 bg-white flex items-center justify-between gap-4 flex-shrink-0">{editingOverride && <button type="button" onClick={() => handleDelete(editingOverride.id)} className="text-[11px] font-black text-rose-500 uppercase tracking-[0.2em] hover:text-rose-700 transition-all">Remove</button>}<button type="submit" disabled={processing} onClick={handleSubmit} className="flex-1 bg-[#1E3A8A] text-white px-5 py-3.5 rounded-2xl text-[12px] font-black shadow-xl shadow-blue-900/20 hover:bg-blue-800 transition-all uppercase tracking-[0.2em] active:scale-95">{processing ? 'Saving...' : (editingOverride ? 'Update Rule' : 'Save Rule')}</button></div>
                    </div>
                </>
            )}
        </div>
    );
}
