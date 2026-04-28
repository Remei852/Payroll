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

export default function Settings({ workSchedules = [], scheduleOverrides = [], departments = [], flash }) {
    const [activeTab, setActiveTab] = useState('work-schedules');

    return (
        <AdminLayout title="Settings">
            <Head title="Settings" />

            {/* Flash messages */}
            {flash?.success && (
                <div className="mb-4 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
                    {flash.success}
                </div>
            )}
            {flash?.error && (
                <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
                    {flash.error}
                </div>
            )}

            {/* Page header */}
            <div className="mb-6">
                <h2 className="text-lg font-semibold text-slate-800">Settings</h2>
                <p className="mt-0.5 text-sm text-slate-500">Manage work schedules, holidays, and schedule overrides</p>
            </div>

            {/* Tab bar */}
            <div className="mb-6 border-b border-slate-200">
                <nav className="-mb-px flex gap-6">
                    {tabs.map(tab => (
                        <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                            className={`inline-flex items-center gap-2 border-b-2 pb-3 text-sm font-medium transition ${
                                activeTab === tab.id
                                    ? 'border-[#1E3A8A] text-[#1E3A8A]'
                                    : 'border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-700'
                            }`}>
                            <span className={activeTab === tab.id ? 'text-[#1E3A8A]' : 'text-slate-400'}>{tab.icon}</span>
                            {tab.label}
                        </button>
                    ))}
                </nav>
            </div>

            {/* Tab content */}
            <div>
                {activeTab === 'work-schedules' && (
                    <WorkSchedulesTab workSchedules={workSchedules} departments={departments} flash={flash} />
                )}
                {activeTab === 'schedule-overrides' && (
                    <ScheduleOverridesTab scheduleOverrides={scheduleOverrides} departments={departments} workSchedules={workSchedules} flash={flash} />
                )}
                {activeTab === 'account' && (
                    <AccountTab />
                )}
            </div>
        </AdminLayout>
    );
}
