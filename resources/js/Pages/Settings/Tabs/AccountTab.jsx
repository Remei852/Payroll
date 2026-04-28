import { useForm } from '@inertiajs/react';
import { useRef } from 'react';

export default function AccountTab() {

    // Email form
    const { data: emailData, setData: setEmailData, patch: patchEmail,
        errors: emailErrors, processing: emailProcessing, recentlySuccessful: emailSaved, reset: resetEmail
    } = useForm({ email: '' });

    // Password form
    const passwordRef = useRef();
    const currentPasswordRef = useRef();
    const { data: pwData, setData: setPwData, put: putPw,
        errors: pwErrors, processing: pwProcessing, recentlySuccessful: pwSaved, reset: resetPw
    } = useForm({ current_password: '', password: '', password_confirmation: '' });

    const submitEmail = (e) => {
        e.preventDefault();
        patchEmail('/profile/email', {
            preserveScroll: true,
            onSuccess: () => resetEmail('email'),
        });
    };

    const submitPassword = (e) => {
        e.preventDefault();
        putPw('/password', {
            preserveScroll: true,
            onSuccess: () => resetPw(),
            onError: (errors) => {
                if (errors.password) {
                    resetPw('password', 'password_confirmation');
                    passwordRef.current?.focus();
                }
                if (errors.current_password) {
                    resetPw('current_password');
                    currentPasswordRef.current?.focus();
                }
            },
        });
    };

    return (
        <div className="space-y-6 max-w-xl">
            {/* Update Email */}
            <div className="rounded-lg border border-slate-200 bg-white p-6">
                <h3 className="text-sm font-semibold text-slate-800">Update Email</h3>
                <p className="mt-0.5 text-xs text-slate-500">Change the email address used to log in.</p>

                <form onSubmit={submitEmail} className="mt-4 space-y-4">
                    <div>
                        <label htmlFor="email" className="block text-xs font-medium text-slate-700 mb-1">
                            New Email Address
                        </label>
                        <input
                            id="email"
                            type="email"
                            value={emailData.email}
                            onChange={e => setEmailData('email', e.target.value)}
                            required
                            autoComplete="email"
                            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-800 focus:border-[#1E3A8A] focus:outline-none focus:ring-1 focus:ring-[#1E3A8A]"
                            placeholder="Enter new email"
                        />
                        {emailErrors.email && (
                            <p className="mt-1 text-xs text-red-600">{emailErrors.email}</p>
                        )}
                    </div>

                    <div className="flex items-center gap-3">
                        <button
                            type="submit"
                            disabled={emailProcessing}
                            className="rounded-md bg-[#1E3A8A] px-4 py-2 text-xs font-medium text-white hover:bg-[#1e3a8a]/90 disabled:opacity-50"
                        >
                            {emailProcessing ? 'Saving...' : 'Update Email'}
                        </button>
                        {emailSaved && <span className="text-xs text-green-600">Email updated.</span>}
                    </div>
                </form>
            </div>

            {/* Update Password */}
            <div className="rounded-lg border border-slate-200 bg-white p-6">
                <h3 className="text-sm font-semibold text-slate-800">Update Password</h3>
                <p className="mt-0.5 text-xs text-slate-500">Use a strong, unique password to keep your account secure.</p>

                <form onSubmit={submitPassword} className="mt-4 space-y-4">
                    <div>
                        <label htmlFor="current_password" className="block text-xs font-medium text-slate-700 mb-1">
                            Current Password
                        </label>
                        <input
                            id="current_password"
                            ref={currentPasswordRef}
                            type="password"
                            value={pwData.current_password}
                            onChange={e => setPwData('current_password', e.target.value)}
                            autoComplete="current-password"
                            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-800 focus:border-[#1E3A8A] focus:outline-none focus:ring-1 focus:ring-[#1E3A8A]"
                        />
                        {pwErrors.current_password && (
                            <p className="mt-1 text-xs text-red-600">{pwErrors.current_password}</p>
                        )}
                    </div>

                    <div>
                        <label htmlFor="new_password" className="block text-xs font-medium text-slate-700 mb-1">
                            New Password
                        </label>
                        <input
                            id="new_password"
                            ref={passwordRef}
                            type="password"
                            value={pwData.password}
                            onChange={e => setPwData('password', e.target.value)}
                            autoComplete="new-password"
                            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-800 focus:border-[#1E3A8A] focus:outline-none focus:ring-1 focus:ring-[#1E3A8A]"
                        />
                        {pwErrors.password && (
                            <p className="mt-1 text-xs text-red-600">{pwErrors.password}</p>
                        )}
                    </div>

                    <div>
                        <label htmlFor="password_confirmation" className="block text-xs font-medium text-slate-700 mb-1">
                            Confirm New Password
                        </label>
                        <input
                            id="password_confirmation"
                            type="password"
                            value={pwData.password_confirmation}
                            onChange={e => setPwData('password_confirmation', e.target.value)}
                            autoComplete="new-password"
                            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-800 focus:border-[#1E3A8A] focus:outline-none focus:ring-1 focus:ring-[#1E3A8A]"
                        />
                        {pwErrors.password_confirmation && (
                            <p className="mt-1 text-xs text-red-600">{pwErrors.password_confirmation}</p>
                        )}
                    </div>

                    <div className="flex items-center gap-3">
                        <button
                            type="submit"
                            disabled={pwProcessing}
                            className="rounded-md bg-[#1E3A8A] px-4 py-2 text-xs font-medium text-white hover:bg-[#1e3a8a]/90 disabled:opacity-50"
                        >
                            {pwProcessing ? 'Saving...' : 'Update Password'}
                        </button>
                        {pwSaved && <span className="text-xs text-green-600">Password updated.</span>}
                    </div>
                </form>
            </div>
        </div>
    );
}
