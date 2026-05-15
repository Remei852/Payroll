import { useState, useMemo } from 'react';
import { router } from '@inertiajs/react';

export default function WorkSchedulesTab({ workSchedules = [], departments = [], gracePeriodSettings = {} }) {
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedSchedule, setSelectedSchedule] = useState(null);
    const [form, setForm] = useState({
        name: '',
        work_start_time: '08:00',
        work_end_time: '17:00',
        break_start_time: '12:00',
        break_end_time: '13:00',
        grace_period_enabled: true,
        grace_period_minutes: 15,
        undertime_enabled: true,
        undertime_allowance_minutes: 5,
        is_working_day: true,
    });

    const [graceForm, setGraceForm] = useState({
        cumulative_tracking_enabled: false,
        daily_grace_minutes: 15,
        grace_period_limit_minutes: 60,
        tracking_period: 'pay_period',
        pay_period_start_day: null,
        pay_period_frequency: null,
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
        const deptGraceSettings = gracePeriodSettings?.[schedule.department_id] || {};
        setForm({
            name: schedule.name,
            work_start_time: schedule.work_start_time || '08:00',
            work_end_time: schedule.work_end_time || '17:00',
            break_start_time: schedule.break_start_time || '12:00',
            break_end_time: schedule.break_end_time || '13:00',
            grace_period_enabled: schedule.grace_period_enabled ?? true,
            grace_period_minutes: schedule.grace_period_minutes ?? 15,
            undertime_enabled: schedule.undertime_enabled ?? true,
            undertime_allowance_minutes: schedule.undertime_allowance_minutes ?? 5,
            is_working_day: schedule.is_working_day ?? true,
        });
        setGraceForm({
            cumulative_tracking_enabled: deptGraceSettings.cumulative_tracking_enabled ?? false,
            daily_grace_minutes: 15,
            grace_period_limit_minutes: deptGraceSettings.grace_period_limit_minutes ?? 60,
            tracking_period: deptGraceSettings.tracking_period ?? 'pay_period',
            pay_period_start_day: deptGraceSettings.pay_period_start_day ?? null,
            pay_period_frequency: deptGraceSettings.pay_period_frequency ?? null,
        });
    }

    function handleSubmit(e) {
        e.preventDefault();
        if (selectedSchedule) {
            router.put(route('admin.settings.work-schedules.update', selectedSchedule.id), form);
        }
    }

    function handleUpdateGraceForDepartment() {
        if (!selectedSchedule?.department_id) return;
        router.put(route('admin.settings.grace-period.update', selectedSchedule.department_id), graceForm, {
            preserveScroll: true,
            preserveState: true,
        });
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
        <div className="flex gap-6 h-[calc(100vh-240px)] animate-in fade-in duration-500">
            {/* Left Panel - Department Schedule List */}
            <div className="w-[300px] flex-shrink-0">
                <div className="card-premium h-full flex flex-col overflow-hidden">
                    {/* Header */}
                    <div className="border-b border-slate-100 bg-slate-50/30 p-4">
                        <div className="mb-3">
                            <h3 className="text-[13px] font-black text-slate-800 uppercase tracking-tight">Departments</h3>
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-0.5">
                                {workSchedules.length} Records
                            </p>
                        </div>
                        <div className="relative">
                            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-2.5">
                                <svg className="h-3.5 w-3.5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                            </div>
                            <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                                className="block w-full rounded-xl border-slate-200 bg-white py-2 pl-8 pr-3 text-[11px] font-bold placeholder-slate-400 focus:ring-4 focus:ring-blue-500/5 transition-all"
                                placeholder="SEARCH..." />
                        </div>
                    </div>

                    {/* Schedule List */}
                    <div className="flex-1 overflow-y-auto p-2 space-y-1.5 scrollbar-hide">
                        {filteredSchedules.map((schedule) => {
                            const isSelected = selectedSchedule?.id === schedule.id;
                            return (
                                <button key={schedule.id} onClick={() => handleSelectSchedule(schedule)}
                                    className={`w-full group relative flex flex-col items-start p-3.5 rounded-xl transition-all duration-300 border ${
                                        isSelected ? 'bg-blue-50/50 border-[#1E3A8A] shadow-md shadow-blue-900/5 ring-1 ring-blue-900/5' : 'bg-white border-transparent hover:bg-slate-50'
                                    }`}>
                                    <div className="flex items-center justify-between w-full mb-1.5">
                                        <span className={`text-[8px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md ${isSelected ? 'bg-[#1E3A8A] text-white' : 'bg-slate-100 text-slate-500'}`}>
                                            {schedule.department_name}
                                        </span>
                                        <div className={`h-1.5 w-1.5 rounded-full ${schedule.is_working_day ? 'bg-emerald-500 shadow-sm shadow-emerald-200' : 'bg-slate-300'}`} />
                                    </div>
                                    <h4 className={`text-[13px] font-black truncate w-full uppercase tracking-tight ${isSelected ? 'text-[#1E3A8A]' : 'text-slate-700'}`}>{schedule.name}</h4>
                                    <div className="mt-3 flex items-center gap-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                        <div className="flex items-center gap-1">
                                            <svg className="h-3.5 w-3.5 opacity-60" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                            {schedule.work_start_time.substring(0, 5)}
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <svg className="h-3.5 w-3.5 opacity-60" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                            {calculateWorkHours(schedule.work_start_time, schedule.work_end_time, schedule.break_start_time, schedule.break_end_time)}
                                        </div>
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* Right Panel - Schedule Form */}
            <div className="flex-1 min-w-0 h-full">
                {!selectedSchedule ? (
                    <div className="h-full flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50/50 p-12 text-center">
                        <div className="h-16 w-16 rounded-2xl bg-white shadow-sm flex items-center justify-center mb-5 ring-1 ring-slate-900/5 text-slate-200">
                            <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.375M9 18h3.375m1.875-12h1.125c.621 0 1.125.504 1.125 1.125v17.25c0 .621-.504 1.125-1.125 1.125h-11.25c-.621 0-1.125-.504-1.125-1.125V3.375c0-.621.504-1.125 1.125-1.125h8.25c.621 0 1.125.504 1.125 1.125v3.375c0 .621-.504 1.125-1.125 1.125H9.75M12 2.25v6.75m1.875-6.75h-1.875" /></svg>
                        </div>
                        <h3 className="text-sm font-black text-slate-400 uppercase tracking-[0.2em]">Select Department</h3>
                        <p className="mt-2 text-[11px] text-slate-400 font-bold uppercase tracking-tight max-w-[200px]">Choose a department to configure its work rules.</p>
                    </div>
                ) : (
                    <div className="flex flex-col h-full card-premium overflow-hidden animate-in slide-in-from-right-2 duration-300">
                        {/* Header */}
                        <div className="flex-shrink-0 border-b border-slate-100 bg-white px-6 py-5">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <div className="h-11 w-11 rounded-xl bg-[#1E3A8A] flex items-center justify-center text-white shadow-lg shadow-blue-900/20">
                                        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                    </div>
                                    <div>
                                        <h3 className="text-[15px] font-black text-slate-800 uppercase tracking-tight">{selectedSchedule.department_name}</h3>
                                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-0.5">Work Configuration</p>
                                    </div>
                                </div>
                                <span className="inline-flex items-center rounded-lg bg-emerald-50 px-2.5 py-1 text-[9px] font-black text-emerald-700 ring-1 ring-inset ring-emerald-600/20 uppercase tracking-wider shadow-sm">Active</span>
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto p-7 space-y-8 scrollbar-hide">
                            <form onSubmit={handleSubmit} id="work-schedule-form" className="space-y-8">
                                <section className="space-y-4">
                                    <h4 className="text-[10px] font-black text-[#1E3A8A] uppercase tracking-[0.25em] px-1 flex items-center gap-2"><div className="h-1 w-3 bg-[#1E3A8A] rounded-full" /> 01. Basics</h4>
                                    <div className="space-y-2">
                                        <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest px-1">Schedule Name</label>
                                        <input type="text" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
                                            className="w-full input-premium py-3 text-[13px] font-bold" required />
                                    </div>
                                </section>

                                <section className="space-y-4">
                                    <h4 className="text-[10px] font-black text-[#1E3A8A] uppercase tracking-[0.25em] px-1 flex items-center gap-2"><div className="h-1 w-3 bg-[#1E3A8A] rounded-full" /> 02. Timing</h4>
                                    <div className="grid grid-cols-2 gap-6">
                                        <div className="p-5 rounded-2xl bg-slate-50 border border-slate-100 space-y-4 shadow-inner">
                                            <div className="flex items-center gap-2 text-[10px] font-black text-slate-500 uppercase tracking-widest"><div className="h-2 w-2 rounded-full bg-blue-600" /> Duty Hours</div>
                                            <div className="grid grid-cols-2 gap-3">
                                                <div className="space-y-1.5"><label className="text-[9px] font-black text-slate-400 uppercase">Clock In</label>
                                                    <input type="time" value={form.work_start_time} onChange={e => setForm({ ...form, work_start_time: e.target.value })} className="w-full rounded-xl border-slate-200 px-3 py-2 text-[13px] font-black text-[#1E3A8A]" /></div>
                                                <div className="space-y-1.5"><label className="text-[9px] font-black text-slate-400 uppercase">Clock Out</label>
                                                    <input type="time" value={form.work_end_time} onChange={e => setForm({ ...form, work_end_time: e.target.value })} className="w-full rounded-xl border-slate-200 px-3 py-2 text-[13px] font-black text-[#1E3A8A]" /></div>
                                            </div>
                                        </div>
                                        <div className="p-5 rounded-2xl bg-slate-50 border border-slate-100 space-y-4 shadow-inner">
                                            <div className="flex items-center gap-2 text-[10px] font-black text-slate-500 uppercase tracking-widest"><div className="h-2 w-2 rounded-full bg-amber-500" /> Break Time</div>
                                            <div className="grid grid-cols-2 gap-3">
                                                <div className="space-y-1.5"><label className="text-[9px] font-black text-slate-400 uppercase">Start</label>
                                                    <input type="time" value={form.break_start_time} onChange={e => setForm({ ...form, break_start_time: e.target.value })} className="w-full rounded-xl border-slate-200 px-3 py-2 text-[13px] font-black text-amber-700" /></div>
                                                <div className="space-y-1.5"><label className="text-[9px] font-black text-slate-400 uppercase">End</label>
                                                    <input type="time" value={form.break_end_time} onChange={e => setForm({ ...form, break_end_time: e.target.value })} className="w-full rounded-xl border-slate-200 px-3 py-2 text-[13px] font-black text-amber-700" /></div>
                                            </div>
                                        </div>
                                    </div>
                                </section>

                                <section className="space-y-4">
                                    <h4 className="text-[10px] font-black text-[#1E3A8A] uppercase tracking-[0.25em] px-1 flex items-center gap-2"><div className="h-1 w-3 bg-[#1E3A8A] rounded-full" /> 03. Compliance</h4>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="flex items-center justify-between p-5 rounded-2xl bg-white border border-slate-100 shadow-sm transition-all hover:border-blue-200 hover:shadow-md">
                                            <div className="flex items-center gap-3">
                                                <div className={`h-10 w-10 rounded-xl flex items-center justify-center shadow-sm transition-all ${form.grace_period_enabled ? 'bg-orange-50 text-orange-600' : 'bg-slate-50 text-slate-300'}`}><svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg></div>
                                                <div><h5 className="text-[12px] font-black text-slate-800 uppercase tracking-tight leading-none">Tolerance</h5><p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest mt-1">Daily Buffer</p></div>
                                            </div>
                                            <div className="flex items-center gap-4">
                                                {form.grace_period_enabled && <div className="flex items-center gap-1 bg-slate-50 rounded-lg px-2 py-1.5 border border-slate-100 shadow-inner"><input type="number" value={form.grace_period_minutes} onChange={e => setForm({ ...form, grace_period_minutes: parseInt(e.target.value) || 0 })} className="w-8 bg-transparent border-none p-0 text-center text-xs font-black text-[#1E3A8A] focus:ring-0" /><span className="text-[8px] font-black text-slate-400 uppercase">Min</span></div>}
                                                <button type="button" onClick={() => setForm({ ...form, grace_period_enabled: !form.grace_period_enabled })} className={`relative inline-flex h-5 w-10 flex-shrink-0 rounded-full border-2 border-transparent transition-colors duration-300 ${form.grace_period_enabled ? 'bg-[#1E3A8A]' : 'bg-slate-300'}`}><span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-lg transition duration-300 ${form.grace_period_enabled ? 'translate-x-5' : 'translate-x-0'}`} /></button>
                                            </div>
                                        </div>
                                        <div className="flex items-center justify-between p-5 rounded-2xl bg-white border border-slate-100 shadow-sm transition-all hover:border-blue-200 hover:shadow-md">
                                            <div className="flex items-center gap-3">
                                                <div className={`h-10 w-10 rounded-xl flex items-center justify-center shadow-sm transition-all ${form.undertime_enabled ? 'bg-purple-50 text-purple-600' : 'bg-slate-50 text-slate-300'}`}><svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M11 15l-3-3m0 0l3-3m-3 3h8M3 12a9 9 0 1118 0 9 9 0 01-18 0z" /></svg></div>
                                                <div><h5 className="text-[12px] font-black text-slate-800 uppercase tracking-tight leading-none">Early Out</h5><p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest mt-1">Allowance</p></div>
                                            </div>
                                            <div className="flex items-center gap-4">
                                                {form.undertime_enabled && <div className="flex items-center gap-1 bg-slate-50 rounded-lg px-2 py-1.5 border border-slate-100 shadow-inner"><input type="number" value={form.undertime_allowance_minutes} onChange={e => setForm({ ...form, undertime_allowance_minutes: parseInt(e.target.value) || 0 })} className="w-8 bg-transparent border-none p-0 text-center text-xs font-black text-[#1E3A8A] focus:ring-0" /><span className="text-[8px] font-black text-slate-400 uppercase">Min</span></div>}
                                                <button type="button" onClick={() => setForm({ ...form, undertime_enabled: !form.undertime_enabled })} className={`relative inline-flex h-5 w-10 flex-shrink-0 rounded-full border-2 border-transparent transition-colors duration-300 ${form.undertime_enabled ? 'bg-[#1E3A8A]' : 'bg-slate-300'}`}><span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-lg transition duration-300 ${form.undertime_enabled ? 'translate-x-5' : 'translate-x-0'}`} /></button>
                                            </div>
                                        </div>
                                    </div>
                                </section>

                                <section className="space-y-4">
                                    <h4 className="text-[10px] font-black text-[#1E3A8A] uppercase tracking-[0.25em] px-1 flex items-center gap-2"><div className="h-1 w-3 bg-[#1E3A8A] rounded-full" /> 04. Grace Bank Accumulator</h4>
                                    <div className={`p-6 rounded-2xl border-2 transition-all duration-300 shadow-sm ${graceForm.cumulative_tracking_enabled ? 'border-[#1E3A8A] bg-blue-50/20' : 'border-slate-100 bg-slate-50/50 opacity-60'}`}>
                                        <div className="flex items-start justify-between mb-5">
                                            <div className="flex gap-4">
                                                <div className={`h-12 w-12 rounded-xl flex items-center justify-center shadow-lg transition-all ${graceForm.cumulative_tracking_enabled ? 'bg-[#1E3A8A] text-white shadow-blue-900/20' : 'bg-slate-200 text-slate-400 shadow-none'}`}><svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg></div>
                                                <div><h5 className="text-[14px] font-black text-slate-800 uppercase tracking-tight">Enable Grace Bank</h5><p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Track cumulative tardiness</p></div>
                                            </div>
                                            <button type="button" onClick={() => setGraceForm({ ...graceForm, cumulative_tracking_enabled: !graceForm.cumulative_tracking_enabled })} className={`relative inline-flex h-6 w-11 flex-shrink-0 rounded-full border-2 border-transparent transition-colors duration-300 ${graceForm.cumulative_tracking_enabled ? 'bg-[#1E3A8A]' : 'bg-slate-300'}`}><span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-xl transition duration-300 ${graceForm.cumulative_tracking_enabled ? 'translate-x-5' : 'translate-x-0'}`} /></button>
                                        </div>
                                        <div className="grid grid-cols-2 gap-6 items-end">
                                            <div className="space-y-2"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Accumulation Limit</label><div className="relative"><input type="number" min="1" disabled={!graceForm.cumulative_tracking_enabled} value={graceForm.grace_period_limit_minutes} onChange={e => setGraceForm({ ...graceForm, grace_period_limit_minutes: parseInt(e.target.value) || 0 })} className={`w-full rounded-xl border-slate-200 px-4 py-2.5 text-[13px] font-black transition-all shadow-inner ${graceForm.cumulative_tracking_enabled ? 'bg-white text-[#1E3A8A]' : 'bg-slate-100 text-slate-400'}`} /><span className="absolute right-4 top-1/2 -translate-y-1/2 text-[9px] font-black text-slate-400 uppercase">Min</span></div></div>
                                            <div className="p-3.5 rounded-xl bg-blue-100/50 flex items-start gap-3 border border-blue-200/50"><svg className="h-4 w-4 text-[#1E3A8A] shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg><p className="text-[10px] text-[#1E3A8A] font-black leading-tight uppercase tracking-tight">Active bank overrides daily buffer for payroll deductions.</p></div>
                                        </div>
                                    </div>
                                </section>
                                <div className="h-12" />
                            </form>
                        </div>

                        <div className="flex-shrink-0 border-t border-slate-100 bg-white/95 backdrop-blur-md px-6 py-5 flex items-center justify-between gap-6">
                            <div className="flex items-center gap-3 group cursor-pointer" onClick={() => setForm({ ...form, is_working_day: !form.is_working_day })}>
                                <div className={`h-6 w-6 rounded-lg flex items-center justify-center border-2 transition-all ${form.is_working_day ? 'bg-[#1E3A8A] border-[#1E3A8A] text-white shadow-sm shadow-blue-900/20' : 'bg-white border-slate-200 text-transparent'}`}><svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={4}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg></div>
                                <span className="text-[11px] font-black text-slate-700 uppercase tracking-widest">Working Day</span>
                            </div>
                            <div className="flex items-center gap-4">
                                <button type="button" onClick={handleUpdateGraceForDepartment} className="px-5 py-2.5 text-[11px] font-black text-slate-400 hover:text-[#1E3A8A] uppercase tracking-widest transition-all active:scale-95">Sync Policy</button>
                                <button type="submit" form="work-schedule-form" className="bg-[#1E3A8A] text-white px-7 py-3 rounded-xl text-[12px] font-black shadow-xl shadow-blue-900/20 hover:bg-blue-800 hover:scale-[1.02] active:scale-[0.98] transition-all uppercase tracking-[0.2em] flex items-center gap-3"><svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>Save Changes</button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
