import InputError from '@/Components/InputError';
import { Head, useForm } from '@inertiajs/react';

export default function Login({ status, noUsersExist = false }) {
    const { data, setData, post, processing, errors, reset } = useForm({
        email: '',
        password: '',
        remember: false,
    });

    const submit = (e) => {
        e.preventDefault();
        post(route('login'), {
            onFinish: () => reset('password'),
        });
    };

    return (
        <>
            <Head title="Login" />
            <div className="flex min-h-screen">
                <div className="hidden w-1/2 flex-col justify-between bg-[#1E3A8A] p-12 lg:flex">
                    <div>
                        <div className="text-2xl font-bold text-white">
                            Attendance Checker
                        </div>
                        <div className="mt-1 text-sm text-blue-200">
                            HR Management System
                        </div>
                    </div>

                    <div>
                        <svg className="mx-auto h-48 w-48 text-white/10" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
                        </svg>
                        <h2 className="mt-6 text-center text-xl font-semibold text-white">
                            Manage Attendance & Payroll
                        </h2>
                        <p className="mt-2 text-center text-sm text-blue-200">
                            Track employee attendance, compute payroll, generate reports and notice letters — all in one place.
                        </p>
                    </div>

                    <div className="text-xs text-blue-300">
                        &copy; {new Date().getFullYear()} Attendance Checker. Internal use only.
                    </div>
                </div>

                <div className="flex w-full items-center justify-center bg-[#F1F5F9] px-6 lg:w-1/2">
                    <div className="w-full max-w-md">
                        <div className="lg:hidden mb-8 text-center">
                            <div className="text-2xl font-bold text-[#1E3A8A]">
                                Attendance Checker
                            </div>
                            <div className="mt-1 text-sm text-slate-500">
                                HR Management System
                            </div>
                        </div>

                        <div className="rounded-xl bg-white p-8 shadow-lg">
                            <div className="mb-6">
                                <h1 className="text-xl font-bold text-[#334155]">
                                    Admin Login
                                </h1>
                                <p className="mt-1 text-sm text-slate-500">
                                    Sign in to access the admin panel.
                                </p>
                            </div>

                            {/* Setup warning — shown when no users exist in the database */}
                            {noUsersExist && (
                                <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
                                    <p className="font-semibold">Setup required</p>
                                    <p className="mt-0.5">No admin account found. Run the following command then refresh:</p>
                                    <code className="mt-1 block rounded bg-amber-100 px-2 py-1 text-xs font-mono">
                                        php artisan db:seed
                                    </code>
                                </div>
                            )}

                            {status && (
                                <div className="mb-4 rounded-md bg-green-50 p-3 text-sm font-medium text-green-700">
                                    {status}
                                </div>
                            )}

                            {/* Login error — shown as a banner, not just under the field */}
                            {errors.email && (
                                <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                                    {errors.email}
                                </div>
                            )}

                            <form onSubmit={submit}>
                                <div>
                                    <label htmlFor="email" className="block text-sm font-medium text-slate-700">
                                        Email Address
                                    </label>
                                    <input
                                        id="email"
                                        type="email"
                                        value={data.email}
                                        autoComplete="username"
                                        autoFocus
                                        onChange={(e) => setData('email', e.target.value)}
                                        className={`mt-1 block w-full rounded-lg border px-4 py-2.5 text-sm text-slate-900 shadow-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 ${errors.email ? 'border-red-400 focus:border-red-400 focus:ring-red-200' : 'border-slate-300 focus:border-[#1E3A8A] focus:ring-[#1E3A8A]/20'}`}
                                        placeholder="admin@example.com"
                                    />
                                </div>

                                <div className="mt-4">
                                    <label htmlFor="password" className="block text-sm font-medium text-slate-700">
                                        Password
                                    </label>
                                    <input
                                        id="password"
                                        type="password"
                                        value={data.password}
                                        autoComplete="current-password"
                                        onChange={(e) => setData('password', e.target.value)}
                                        className="mt-1 block w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm text-slate-900 shadow-sm placeholder:text-slate-400 focus:border-[#1E3A8A] focus:outline-none focus:ring-2 focus:ring-[#1E3A8A]/20"
                                        placeholder="Enter your password"
                                    />
                                </div>

                                <div className="mt-4 flex items-center">
                                    <input
                                        id="remember"
                                        type="checkbox"
                                        checked={data.remember}
                                        onChange={(e) => setData('remember', e.target.checked)}
                                        className="h-4 w-4 rounded border-slate-300 text-[#1E3A8A] focus:ring-[#1E3A8A]"
                                    />
                                    <label htmlFor="remember" className="ml-2 text-sm text-slate-600">
                                        Remember me
                                    </label>
                                </div>

                                <button
                                    type="submit"
                                    disabled={processing || noUsersExist}
                                    className="mt-6 w-full rounded-lg bg-[#1E3A8A] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#1E3A8A]/90 focus:outline-none focus:ring-2 focus:ring-[#1E3A8A]/50 focus:ring-offset-2 disabled:opacity-50"
                                >
                                    {processing ? 'Signing in...' : 'Sign in'}
                                </button>
                            </form>
                        </div>

                        <p className="mt-6 text-center text-xs text-slate-400">
                            Authorized personnel only. All access is logged.
                        </p>
                    </div>
                </div>
            </div>
        </>
    );
}
