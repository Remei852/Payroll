import AdminLayout from '@/Layouts/AdminLayout';
import { Head, Link } from '@inertiajs/react';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    PieChart, Pie, Cell, Legend,
} from 'recharts';

const php = (n) => new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP', minimumFractionDigits: 0 }).format(n ?? 0);

const PIE_COLORS = ['#16A34A', '#F59E0B', '#DC2626', '#EC4899'];

const STATUS_CLS = {
    OPEN:   'bg-blue-100 text-blue-700',
    CLOSED: 'bg-green-100 text-green-700',
};

function StatCard({ label, value, sub, subColor = 'text-slate-400', href }) {
    const inner = (
        <div className="rounded-xl border border-slate-200 bg-white px-5 py-4 shadow-sm hover:shadow-md transition-shadow">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{label}</p>
            <p className="mt-1.5 text-2xl font-bold text-slate-800 leading-none">{value}</p>
            {sub && <p className={`mt-2 text-[10px] font-medium uppercase tracking-tight ${subColor}`}>{sub}</p>}
        </div>
    );
    return href ? <Link href={href}>{inner}</Link> : inner;
}

export default function Dashboard({ stats, period, lateByDept, attendanceDist, recentPeriods, dateRange }) {
    const pct = (n) => stats.total_records > 0 ? `${((n / stats.total_records) * 100).toFixed(1)}% of total` : '';

    return (
        <AdminLayout title="Dashboard">
            <Head title="Dashboard" />

            {/* Header Stats Info */}
            <div className="mb-6 px-1">
                {dateRange && (
                    <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">
                        Current Period: <span className="text-[#1E3A8A]">{dateRange.from} – {dateRange.to}</span>
                        {period && <span className="ml-2 opacity-50">({period.label})</span>}
                    </p>
                )}
            </div>

            {/* Stat cards */}
            <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
                <StatCard label="Total Employees" value={stats.total_employees}
                    sub={`${stats.active_employees} active`} href={route('admin.employees.index')} />
                <StatCard label="Open Payroll" value={stats.open_periods}
                    subColor="text-blue-600"
                    sub={stats.open_periods > 0 ? 'Action Required' : 'All Finalized'}
                    href={route('admin.payroll.index')} />
                <StatCard label="Total Records"     value={stats.total_records.toLocaleString()} />
                <StatCard label="Tardiness"    value={stats.late_count}
                    sub={pct(stats.late_count)} subColor="text-amber-600" />
                <StatCard label="Absences"          value={stats.absent_count}
                    sub={pct(stats.absent_count)} subColor="text-rose-600" />
                <StatCard label="Missed Logs"       value={stats.missed_logs}
                    sub={pct(stats.missed_logs)} subColor="text-pink-600" />
            </div>

            {/* Charts */}
            <div className="mb-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
                {/* Late by department */}
                <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                    <h3 className="mb-6 text-[11px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2"><div className="h-1.5 w-1.5 rounded-full bg-[#1E3A8A]" /> Late Count by Department</h3>
                    {lateByDept.length === 0 ? (
                        <div className="flex h-64 items-center justify-center text-[10px] font-bold text-slate-300 uppercase tracking-widest">No late records</div>
                    ) : (
                        <ResponsiveContainer width="100%" height={260}>
                            <BarChart data={lateByDept} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
                                <XAxis dataKey="department" tick={{ fontSize: 9, fontWeight: 700, fill: '#94A3B8' }} axisLine={false} tickLine={false} />
                                <YAxis tick={{ fontSize: 9, fontWeight: 700, fill: '#94A3B8' }} axisLine={false} tickLine={false} allowDecimals={false} />
                                <Tooltip cursor={{fill: '#F8FAFC'}} contentStyle={{ fontSize: 10, fontWeight: 700, borderRadius: 12, border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }} />
                                <Bar dataKey="lates" fill="#1E3A8A" radius={[4, 4, 0, 0]} barSize={32} />
                            </BarChart>
                        </ResponsiveContainer>
                    )}
                </div>

                {/* Attendance distribution */}
                <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                    <h3 className="mb-6 text-[11px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2"><div className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> Attendance Distribution</h3>
                    {attendanceDist.length === 0 ? (
                        <div className="flex h-64 items-center justify-center text-[10px] font-bold text-slate-300 uppercase tracking-widest">No data available</div>
                    ) : (
                        <ResponsiveContainer width="100%" height={260}>
                            <PieChart>
                                <Pie data={attendanceDist} cx="50%" cy="50%"
                                    innerRadius={60} outerRadius={90}
                                    paddingAngle={5} dataKey="value"
                                    label={({ name, percent }) => `${(percent * 100).toFixed(0)}%`}
                                    labelLine={false}>
                                    {attendanceDist.map((_, i) => (
                                        <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} strokeWidth={0} />
                                    ))}
                                </Pie>
                                <Tooltip contentStyle={{ fontSize: 10, fontWeight: 700, borderRadius: 12, border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }} />
                                <Legend verticalAlign="bottom" iconType="circle" wrapperStyle={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', paddingTop: '20px' }} />
                            </PieChart>
                        </ResponsiveContainer>
                    )}
                </div>
            </div>

            {/* Recent payroll periods */}
            <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
                <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4 bg-slate-50/30">
                    <h3 className="text-[11px] font-bold text-slate-700 uppercase tracking-widest">Recent Payroll Periods</h3>
                    <Link href={route('admin.payroll.index')} className="text-[10px] font-bold text-[#1E3A8A] uppercase tracking-widest hover:underline">View All</Link>
                </div>
                {recentPeriods.length === 0 ? (
                    <p className="px-6 py-10 text-center text-[10px] font-bold text-slate-300 uppercase tracking-widest">No records found</p>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="min-w-full">
                            <thead className="bg-slate-50/50 text-[9px] font-bold uppercase text-slate-400 tracking-widest">
                                <tr>
                                    <th className="px-6 py-3 text-left">Department</th>
                                    <th className="px-6 py-3 text-left">Period</th>
                                    <th className="px-6 py-3 text-center">Employees</th>
                                    <th className="px-6 py-3 text-right">Net Pay</th>
                                    <th className="px-6 py-3 text-center">Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 text-[11px] font-medium">
                                {recentPeriods.map(p => (
                                    <tr key={p.id} className="hover:bg-slate-50/50 transition-colors">
                                        <td className="px-6 py-4 text-slate-800 font-bold">
                                            <Link href={route('admin.payroll.period', p.id)} className="hover:text-[#1E3A8A] transition-colors">
                                                {p.department}
                                            </Link>
                                        </td>
                                        <td className="px-6 py-4 text-slate-500 whitespace-nowrap">{p.start_date} – {p.end_date}</td>
                                        <td className="px-6 py-4 text-center text-slate-600">{p.count}</td>
                                        <td className="px-6 py-4 text-right font-bold text-slate-800">{php(p.net_pay)}</td>
                                        <td className="px-6 py-4 text-center">
                                            <span className={`inline-flex rounded-md px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider ${STATUS_CLS[p.status] ?? 'bg-slate-100 text-slate-600'}`}>
                                                {p.status}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </AdminLayout>
    );
}
