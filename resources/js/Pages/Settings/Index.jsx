import AdminLayout from '@/Layouts/AdminLayout';
import { Head } from '@inertiajs/react';
import { useState } from 'react';
import WorkSchedulesTab from './Tabs/WorkSchedulesTab';
import ScheduleOverridesTab from './Tabs/ScheduleOverridesTab';
import AccountTab from './Tabs/AccountTab';

const tabs = [
    {
        id: 'work-schedules',
        label: 'Work Schedules',
        description: 'Configure work hours, grace period, and undertime allowance per department',
        icon: (
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
        ),
    },
    {
        id: 'schedule-overrides',
        label: 'Overrides & Holidays',
        description: 'Manage holidays, special schedules, and one-off schedule changes',
        icon: (
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
        ),
    },
    {
        id: 'account',
        label: 'Account',
        description: 'Update your email and password',
        icon: (
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
        ),
    },
];

export default function Settings({ workSchedules = [], scheduleOverrides = [], departments = [], gracePeriodSettings = {}, flash }) {
    const [activeTab, setActiveTab] = useState('work-schedules');

    return (
        <AdminLayout title="Settings">
            <Head title="Settings" />

            {/* Flash messages */}
            {flash?.success && (
                <div className="mb-5 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800 shadow-sm flex items-center gap-3">
                    <svg className="h-4 w-4 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <p className="font-medium">{flash.success}</p>
                </div>
            )}
            
            <div className="flex flex-col gap-5">
                {/* Tab Navigation Card */}
                <div className="card-premium p-1.5">
                    <nav className="flex flex-wrap gap-1">
                        {tabs.map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`flex flex-1 items-center justify-center gap-2.5 rounded-lg px-3 py-2 text-sm font-bold transition-all duration-200 ${
                                    activeTab === tab.id
                                        ? 'bg-[#1E3A8A] text-white shadow-md shadow-blue-900/10'
                                        : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'
                                }`}
                            >
                                <span className={`${activeTab === tab.id ? 'text-white' : 'text-slate-400'}`}>
                                    {tab.icon}
                                </span>
                                <div className="text-left">
                                    <div className="leading-tight text-[13px]">{tab.label}</div>
                                    <div className={`mt-0.5 text-[9px] font-semibold opacity-60 hidden sm:block ${activeTab === tab.id ? 'text-blue-100' : 'text-slate-400'}`}>
                                        {tab.id === 'work-schedules' ? 'Schedules & Grace' : 
                                         tab.id === 'schedule-overrides' ? 'Holidays & Dates' : 
                                         'Profile & Security'}
                                    </div>
                                </div>
                            </button>
                        ))}
                    </nav>
                </div>

                {/* Content Area */}
                <div className="min-h-[500px] animate-in fade-in duration-500">
                    {activeTab === 'work-schedules' && (
                        <WorkSchedulesTab workSchedules={workSchedules} departments={departments} gracePeriodSettings={gracePeriodSettings} flash={flash} />
                    )}
                    {activeTab === 'schedule-overrides' && (
                        <ScheduleOverridesTab scheduleOverrides={scheduleOverrides} departments={departments} workSchedules={workSchedules} flash={flash} />
                    )}
                    {activeTab === 'account' && (
                        <AccountTab />
                    )}
                </div>
            </div>
        </AdminLayout>
    );
}
