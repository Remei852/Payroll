import AdminLayout from '@/Layouts/AdminLayout';
import { Head } from '@inertiajs/react';
import { useState } from 'react';
import WorkSchedulesTab from './Tabs/WorkSchedulesTab';
import ScheduleOverridesTab from './Tabs/ScheduleOverridesTab';
import GracePeriodSettingsTab from './Tabs/GracePeriodSettingsTab';

export default function Settings({ workSchedules = [], scheduleOverrides = [], departments = [], gracePeriodSettings = [], flash }) {
    const [activeTab, setActiveTab] = useState('work-schedules');

    const tabs = [
        {
            id: 'work-schedules',
            name: 'Work Schedules',
            icon: (
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
            ),
            description: 'Create and manage weekly schedule templates',
        },
        {
            id: 'schedule-overrides',
            name: 'Schedule Overrides & Holidays',
            icon: (
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
            ),
            description: 'Manage holidays and special schedule changes',
        },
        {
            id: 'grace-period',
            name: 'Grace Period',
            icon: (
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
            ),
            description: 'Configure grace period policies per department',
        },
    ];

    return (
        <AdminLayout title="Settings">
            <Head title="Settings" />

            {flash?.success && (
                <div className="mb-4 rounded-md border border-green-200 bg-green-50 p-4">
                    <p className="text-sm font-medium text-green-800">{flash.success}</p>
                </div>
            )}

            {flash?.error && (
                <div className="mb-4 rounded-md border border-red-200 bg-red-50 p-4">
                    <p className="text-sm font-medium text-red-800">{flash.error}</p>
                </div>
            )}

            {/* Page Header */}
            <div className="mb-6">
                <h1 className="text-page-title text-slate-800">Settings</h1>
                <p className="mt-1 text-sm text-slate-600">
                    Manage work schedules, holidays, schedule overrides, and grace period policies
                </p>
            </div>

            {/* Tab Navigation */}
            <div className="mb-6 border-b border-slate-200">
                <nav className="-mb-px flex space-x-8" aria-label="Tabs">
                    {tabs.map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`group inline-flex items-center gap-2 border-b-2 px-1 py-4 text-sm font-medium transition ${
                                activeTab === tab.id
                                    ? 'border-primary text-primary'
                                    : 'border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-700'
                            }`}
                        >
                            <span className={activeTab === tab.id ? 'text-primary' : 'text-slate-400 group-hover:text-slate-500'}>
                                {tab.icon}
                            </span>
                            <span>{tab.name}</span>
                        </button>
                    ))}
                </nav>
            </div>

            {/* Tab Content */}
            <div className="min-h-[600px]">
                {activeTab === 'work-schedules' && (
                    <WorkSchedulesTab 
                        workSchedules={workSchedules} 
                        departments={departments}
                        flash={flash}
                    />
                )}
                {activeTab === 'schedule-overrides' && (
                    <ScheduleOverridesTab 
                        scheduleOverrides={scheduleOverrides}
                        departments={departments}
                        workSchedules={workSchedules}
                        flash={flash}
                    />
                )}
                {activeTab === 'grace-period' && (
                    <GracePeriodSettingsTab 
                        departments={departments}
                        settings={gracePeriodSettings}
                        flash={flash}
                    />
                )}
            </div>
        </AdminLayout>
    );
}
