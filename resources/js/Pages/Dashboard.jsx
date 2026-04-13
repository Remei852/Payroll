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
            <p className="text-xs font-medium text-slate-500">{label}</p>
            <p className="mt-1 text-2xl font-bold text-slate-800">{value}</p>
            {sub && <p className={`mt-0.5 text-xs font-medium ${subColor}`}>{sub}</p>}
        </div>
    );
    return href ? <Link href={href}>{inner}</Link> : inner;
}

export default function Dashboard({ stats, period, lateByDept, attendanceDist, recentPeriods, dateRange }) {
    const pct = (n) => stats.total_records > 0 ? `${((n / stats.total_records) * 100).toFixed(1)}% of records` : '';

    return (
        <AdminLayout title="Dashboard">
            <Head title="Dashboard" />

            {/* Header */}
            <div className="mb-6">
                <h2 className="text-lg font-semibold text-slate-800">Dashboard</h2>
                {dateRange && (
                    <p className="mt-0.5 text-sm text-slate-500">
                        Showing data for <span className="font-medium text-slate-700">{dateRange.from} – {dateRange.to}</span>
                        {period && <span className="ml-2 text-slate-400">({period.label})</span>}
                    </p>
                )}
            </div>

            {/* Stat cards */}
            <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
                <StatCard label="Total Employees"   value={stats.total_employees}
                    sub={`${stats.active_employees} active`} href={route('admin.employees.index')} />
                <StatCard label="Open Payroll Periods" value={stats.open_periods}
                    subColor="text-blue-500"
                    sub={stats.open_periods > 0 ? 'Pending finalization' : 'All finalized'}
                    href={route('admin.payroll.index')} />
                <StatCard label="Total Records"     value={stats.total_records.toLocaleString()} />
                <StatCard label="Employees Late"    value={stats.late_count}
                    sub={pct(stats.late_count)} subColor="text-yellow-600" />
                <StatCard label="Absences"          value={stats.absent_count}
                    sub={pct(stats.absent_count)} subColor="text-red-600" />
                <StatCard label="Missed Logs"       value={stats.missed_logs}
                    sub={pct(stats.missed_logs)} subColor="text-pink-600" />
            </div>

            {/* Charts */}
            <div className="mb-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
                {/* Late by department */}
                <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                    <h3 className="mb-4 text-sm font-semibold text-slate-700">Late Count by Department</h3>
                    {lateByDept.length === 0 ? (
                        <div className="flex h-64 items-center justify-center text-sm text-slate-400">No late records in this period</div>
                    ) : (
                        <ResponsiveContainer width="100%" height={260}>
                            <BarChart data={lateByDept} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                                <XAxis dataKey="department" tick={{ fontSize: 11, fill: '#64748B' }} />
                                <YAxis tick={{ fontSize: 11, fill: '#64748B' }} allowDecimals={false} />
                                <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #E2E8F0' }} />
                                <Bar dataKey="lates" fill="#1E3A8A" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    )}
                </div>

                {/* Attendance distribution */}
                <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                    <h3 className="mb-4 text-sm font-semibold text-slate-700">Attendance Status Distribution</h3>
                    {attendanceDist.length === 0 ? (
                        <div className="flex h-64 items-center justify-center text-sm text-slate-400">No attendance data in this period</div>
                    ) : (
                        <ResponsiveContainer width="100%" height={260}>
                            <PieChart>
                                <Pie data={attendanceDist} cx="50%" cy="50%"
                                    innerRadius={55} outerRadius={95}
                                    paddingAngle={3} dataKey="value"
                                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                                    labelLine={false}>
                                    {attendanceDist.map((_, i) => (
                                        <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #E2E8F0' }} />
                                <Legend verticalAlign="bottom" iconType="circle" wrapperStyle={{ fontSize: 12 }} />
                            </PieChart>
                        </ResponsiveContainer>
                    )}
                </div>
            </div>

            {/* Recent payroll periods */}
            <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
                <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3.5">
                    <h3 className="text-sm font-semibold text-slate-700">Recent Payroll Periods</h3>
                    <Link href={route('admin.payroll.index')} className="text-xs text-[#1E3A8A] hover:underline">View all</Link>
                </div>
                {recentPeriods.length === 0 ? (
                    <p className="px-5 py-8 text-center text-sm text-slate-400">No payroll periods yet.</p>
                ) : (
                    <table className="min-w-full text-sm">
                        <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                            <tr>
                                <th className="px-5 py-2.5 text-left font-medium">Department</th>
                                <th className="px-5 py-2.5 text-left font-medium">Period</th>
                                <th className="px-5 py-2.5 text-center font-medium">Employees</th>
                                <th className="px-5 py-2.5 text-right font-medium">Net Pay</th>
                                <th className="px-5 py-2.5 text-center font-medium">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {recentPeriods.map(p => (
                                <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                                    <td className="px-5 py-3 font-medium text-slate-800">
                                        <Link href={route('admin.payroll.period', p.id)} className="hover:text-[#1E3A8A]">
                                            {p.department}
                                        </Link>
                                    </td>
                                    <td className="px-5 py-3 text-slate-500">{p.start_date} – {p.end_date}</td>
                                    <td className="px-5 py-3 text-center text-slate-600">{p.count}</td>
                                    <td className="px-5 py-3 text-right font-semibold text-slate-800">{php(p.net_pay)}</td>
                                    <td className="px-5 py-3 text-center">
                                        <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_CLS[p.status] ?? 'bg-slate-100 text-slate-600'}`}>
                                            {p.status}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>
        </AdminLayout>
    );
}
