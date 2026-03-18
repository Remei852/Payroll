import AdminLayout from '@/Layouts/AdminLayout';
import { Head, Link, router } from '@inertiajs/react';

export default function PayrollIndex({ periods }) {
    const getStatusColor = (status) => {
        const colors = {
            'OPEN': 'bg-blue-100 text-blue-800',
            'PROCESSING': 'bg-yellow-100 text-yellow-800',
            'CLOSED': 'bg-green-100 text-green-800',
        };
        return colors[status] || 'bg-slate-100 text-slate-800';
    };

    return (
        <AdminLayout title="Payroll">
            <Head title="Payroll" />

            <div className="mb-6 flex items-center justify-between">
                <div>
                    <h2 className="text-lg font-semibold text-[#334155]">Payroll Periods</h2>
                    <p className="mt-1 text-sm text-slate-500">
                        Manage payroll periods and employee wages
                    </p>
                </div>
                <Link
                    href={route('admin.payroll.generate')}
                    className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-primary/90"
                >
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                    </svg>
                    Generate Payroll
                </Link>
            </div>

            {/* Quick Stats */}
            {periods.data.length > 0 && (
                <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
                    <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-xs font-medium text-slate-600">Total Periods</p>
                                <p className="mt-1 text-2xl font-semibold text-slate-900">{periods.total}</p>
                            </div>
                            <div className="rounded-full bg-blue-100 p-3">
                                <svg className="h-6 w-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                            </div>
                        </div>
                    </div>
                    <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-xs font-medium text-slate-600">Closed Periods</p>
                                <p className="mt-1 text-2xl font-semibold text-green-600">
                                    {periods.data.filter(p => p.status === 'CLOSED').length}
                                </p>
                            </div>
                            <div className="rounded-full bg-green-100 p-3">
                                <svg className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                            </div>
                        </div>
                    </div>
                    <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-xs font-medium text-slate-600">Open Periods</p>
                                <p className="mt-1 text-2xl font-semibold text-blue-600">
                                    {periods.data.filter(p => p.status === 'OPEN').length}
                                </p>
                            </div>
                            <div className="rounded-full bg-blue-50 p-3">
                                <svg className="h-6 w-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Periods Table */}
            <div className="rounded-lg border border-slate-200 bg-white shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-slate-200">
                        <thead className="bg-slate-50">
                            <tr>
                                <th scope="col" className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                                    Department
                                </th>
                                <th scope="col" className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                                    Period
                                </th>
                                <th scope="col" className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                                    Payroll Date
                                </th>
                                <th scope="col" className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                                    Status
                                </th>
                                <th scope="col" className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                                    Actions
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200 bg-white">
                            {periods.data.length === 0 ? (
                                <tr>
                                    <td colSpan="5" className="px-4 py-12 text-center">
                                        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-slate-100">
                                            <svg className="h-8 w-8 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5z" />
                                            </svg>
                                        </div>
                                        <h4 className="mt-4 text-sm font-medium text-slate-900">No payroll periods</h4>
                                        <p className="mt-1 text-xs text-slate-500">
                                            Get started by generating your first payroll period
                                        </p>
                                    </td>
                                </tr>
                            ) : (
                                periods.data.map((period) => (
                                    <tr key={period.id} className="hover:bg-slate-50 transition">
                                        <td className="px-4 py-3 text-sm font-medium text-slate-900">
                                            {period.department.name}
                                        </td>
                                        <td className="px-4 py-3 text-sm text-slate-700">
                                            {new Date(period.start_date).toLocaleDateString('en-US', {
                                                month: 'short',
                                                day: 'numeric',
                                                year: 'numeric'
                                            })} - {new Date(period.end_date).toLocaleDateString('en-US', {
                                                month: 'short',
                                                day: 'numeric',
                                                year: 'numeric'
                                            })}
                                        </td>
                                        <td className="px-4 py-3 text-sm text-slate-700">
                                            {new Date(period.payroll_date).toLocaleDateString('en-US', {
                                                month: 'short',
                                                day: 'numeric',
                                                year: 'numeric'
                                            })}
                                        </td>
                                        <td className="px-4 py-3">
                                            <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${getStatusColor(period.status)}`}>
                                                {period.status}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3">
                                            <Link
                                                href={route('admin.payroll.period', period.id)}
                                                className="text-sm font-medium text-primary hover:text-primary/80 transition"
                                            >
                                                View Details
                                            </Link>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                {periods.last_page > 1 && (
                    <div className="flex items-center justify-between border-t border-slate-200 bg-white px-4 py-3">
                        <div className="flex items-center gap-2">
                            <span className="text-sm text-slate-700">
                                Showing <span className="font-medium">{periods.from}</span> to <span className="font-medium">{periods.to}</span> of{' '}
                                <span className="font-medium">{periods.total}</span> results
                            </span>
                        </div>
                        <div className="flex items-center gap-2">
                            {periods.links.map((link, index) => (
                                <button
                                    key={index}
                                    onClick={() => {
                                        if (link.url) {
                                            router.get(link.url, {}, { preserveState: true });
                                        }
                                    }}
                                    disabled={!link.url}
                                    className={`px-3 py-1 text-sm rounded-md transition ${
                                        link.active
                                            ? 'bg-primary text-white font-medium'
                                            : link.url
                                            ? 'bg-white text-slate-700 border border-slate-300 hover:bg-slate-50'
                                            : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                                    }`}
                                    dangerouslySetInnerHTML={{ __html: link.label }}
                                />
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </AdminLayout>
    );
}
