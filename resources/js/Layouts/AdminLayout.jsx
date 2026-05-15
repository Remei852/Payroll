import { Link, usePage } from '@inertiajs/react';
import { useState } from 'react';

function SidebarItem({ label, icon, href, active, collapsed }) {
    return (
        <Link
            href={href}
            className={
                'flex items-center gap-3 rounded-lg px-3 py-2 text-[13px] font-bold transition-all duration-200 ' +
                (active
                    ? 'bg-white/10 text-white shadow-sm ring-1 ring-white/10'
                    : 'text-blue-100/70 hover:bg-white/5 hover:text-white')
            }
            title={collapsed ? label : ''}
        >
            <span className="shrink-0 text-base">{icon}</span>
            {!collapsed && <span className="truncate tracking-wide">{label}</span>}
        </Link>
    );
}

// Initialize state from localStorage to avoid hydration mismatch
const getInitialSidebarState = () => {
    if (typeof window === 'undefined') return false;
    const saved = localStorage.getItem('sidebarCollapsed');
    return saved !== null ? JSON.parse(saved) : false;
};

export default function AdminLayout({ title, children }) {
    const { props } = usePage();
    const user = props.auth.user;
    const [sidebarCollapsed, setSidebarCollapsed] = useState(getInitialSidebarState);

    const handleToggleSidebar = () => {
        const newState = !sidebarCollapsed;
        setSidebarCollapsed(newState);
        localStorage.setItem('sidebarCollapsed', JSON.stringify(newState));
    };

    const isCurrent = (name) => {
        try { return route().current(name); } catch { return false; }
    };

    return (
        <div className="flex h-screen overflow-hidden bg-[#F1F5F9]">
            {/* Fixed Sidebar */}
            <aside className={`fixed left-0 top-0 flex h-screen flex-col bg-[#1E3A8A] transition-all duration-500 z-50 shadow-2xl shadow-blue-900/40 ${sidebarCollapsed ? 'w-16' : 'w-60'}`}>
                <div className="flex h-14 shrink-0 items-center border-b border-white/5 px-4">
                    {!sidebarCollapsed && (
                        <div className="flex items-center gap-2">
                            <div className="h-7 w-7 rounded-lg bg-white/10 flex items-center justify-center">
                                <div className="h-3 w-3 rounded-full bg-white animate-pulse" />
                            </div>
                            <div>
                                <div className="text-[13px] font-black text-white uppercase tracking-tighter leading-none">
                                    Attendance
                                </div>
                                <div className="text-[9px] font-bold text-blue-300/60 uppercase tracking-widest mt-0.5">
                                    Admin Suite
                                </div>
                            </div>
                        </div>
                    )}
                    {sidebarCollapsed && (
                         <div className="h-7 w-7 rounded-lg bg-white/10 mx-auto flex items-center justify-center">
                            <div className="h-2 w-2 rounded-full bg-white" />
                         </div>
                    )}
                </div>

                <nav className="flex-1 space-y-1 overflow-y-auto px-2 py-6 scrollbar-hide">
                    <SidebarItem label="Dashboard" icon={<svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" /></svg>} href={route('dashboard')} active={isCurrent('dashboard')} collapsed={sidebarCollapsed} />
                    <SidebarItem label="Attendance" icon={<svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0121 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" /></svg>} href={route('admin.attendance.index')} active={isCurrent('admin.attendance.index') || isCurrent('admin.attendance.records')} collapsed={sidebarCollapsed} />
                    <SidebarItem label="Payroll" icon={<svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125-1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5z" /></svg>} href={route('admin.payroll.index')} active={isCurrent('admin.payroll.index')} collapsed={sidebarCollapsed} />
                    <SidebarItem label="Departments" icon={<svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 21h16.5M4.5 3h15M5.25 3v18m13.5-18v18M9 6.75h1.5m-1.5 3h1.5m-1.5 3h1.5m3-6H15m-1.5 3H15m-1.5 3H15M9 21v-3.375c0-.621.504-1.125 1.125-1.125h3.75c.621 0 1.125.504 1.125 1.125V21" /></svg>} href={route('admin.departments.manage')} active={isCurrent('admin.departments.manage')} collapsed={sidebarCollapsed} />
                    <SidebarItem label="Employees" icon={<svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" /></svg>} href={route('admin.employees.index')} active={isCurrent('admin.employees.index')} collapsed={sidebarCollapsed} />
                    <SidebarItem label="Reports" icon={<svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>} href={route('admin.attendance.report')} active={isCurrent('admin.attendance.report')} collapsed={sidebarCollapsed} />
                    <SidebarItem label="Violations" icon={<svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" /></svg>} href={route('admin.violations.index')} active={isCurrent('admin.violations.index')} collapsed={sidebarCollapsed} />
                    <SidebarItem label="Print Policy" icon={<svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0121 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5m-9-6h.008v.008H12V8.25" /></svg>} href={route('admin.letters.print-policy')} active={isCurrent('admin.letters.print-policy')} collapsed={sidebarCollapsed} />
                    <SidebarItem label="Settings" icon={<svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37a1.724 1.724 0 002.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>} href={route('admin.settings.index')} active={isCurrent('admin.settings.index')} collapsed={sidebarCollapsed} />
                </nav>

                <div className="border-t border-white/5 px-2 py-4">
                    <button onClick={handleToggleSidebar} className="flex w-full items-center justify-center rounded-lg p-2 text-blue-200 hover:bg-white/10 hover:text-white transition-all">
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>{sidebarCollapsed ? <path strokeLinecap="round" strokeLinejoin="round" d="M13 5l7 7-7 7M5 5l7 7-7 7" /> : <path strokeLinecap="round" strokeLinejoin="round" d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />}</svg>
                    </button>
                </div>
            </aside>

            {/* Main Content Area */}
            <div className={`flex min-w-0 flex-1 flex-col transition-all duration-500 ${sidebarCollapsed ? 'ml-16' : 'ml-60'}`}>
                <header className={`fixed top-0 z-40 flex h-14 items-center justify-between border-b border-slate-200 bg-white/80 backdrop-blur-md px-6 transition-all duration-500 ${sidebarCollapsed ? 'left-16 right-0' : 'left-60 right-0'}`}>
                    <h1 className="text-[15px] font-bold text-[#1E3A8A] tracking-tight uppercase">
                        {title}
                    </h1>
                    <div className="flex items-center gap-6">
                        <div className="hidden sm:flex flex-col items-end leading-none">
                            <div className="text-[11px] font-bold text-slate-800 uppercase tracking-tighter">{user?.name}</div>
                            <div className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1">{user?.email}</div>
                        </div>
                        <Link href={route('logout')} method="post" as="button" className="rounded-lg bg-slate-100 px-3 py-1.5 text-[10px] font-bold text-slate-600 uppercase tracking-widest transition-all hover:bg-slate-200 active:scale-95">Log out</Link>
                    </div>
                </header>

                <main className="mt-14 h-[calc(100vh-3.5rem)] overflow-y-auto p-5 scrollbar-hide bg-[#F8FAFC]">{children}</main>
            </div>
        </div>
    );
}
