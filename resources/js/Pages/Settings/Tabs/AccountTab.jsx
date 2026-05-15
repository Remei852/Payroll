import { useForm } from '@inertiajs/react';
import { useRef } from 'react';

export default function AccountTab() {
    const { data: emailData, setData: setEmailData, patch: patchEmail,
        errors: emailErrors, processing: emailProcessing, recentlySuccessful: emailSaved, reset: resetEmail
    } = useForm({ email: '' });

    const passwordRef = useRef();
    const currentPasswordRef = useRef();
    const { data: pwData, setData: setPwData, put: putPw,
        errors: pwErrors, processing: pwProcessing, recentlySuccessful: pwSaved, reset: resetPw
    } = useForm({ current_password: '', password: '', password_confirmation: '' });

    const submitEmail = (e) => {
        e.preventDefault();
        patchEmail('/profile/email', { preserveScroll: true, onSuccess: () => resetEmail('email') });
    };

    const submitPassword = (e) => {
        e.preventDefault();
        putPw('/password', {
            preserveScroll: true,
            onSuccess: () => resetPw(),
            onError: (errors) => {
                if (errors.password) { resetPw('password', 'password_confirmation'); passwordRef.current?.focus(); }
                if (errors.current_password) { resetPw('current_password'); currentPasswordRef.current?.focus(); }
            },
        });
    };

    return (
        <div className="flex flex-col gap-8 max-w-5xl animate-in fade-in duration-500">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="card-premium p-8">
                    <div className="flex items-center gap-4 mb-8">
                        <div className="h-12 w-12 rounded-2xl bg-blue-50/50 border border-blue-100 flex items-center justify-center text-[#1E3A8A] shadow-inner">
                            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.206" /></svg>
                        </div>
                        <div>
                            <h4 className="text-[15px] font-bold text-slate-800 uppercase tracking-tight leading-none">Email Address</h4>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mt-1.5">Primary Login Identity</p>
                        </div>
                    </div>
                    <form onSubmit={submitEmail} className="space-y-6">
                        <div className="space-y-2">
                            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest px-1">New Email</label>
                            <input type="email" value={emailData.email} onChange={e => setEmailData('email', e.target.value)} required className={`w-full rounded-2xl border-slate-200 bg-slate-50/50 px-4 py-3.5 text-[13px] font-bold text-[#1E3A8A] transition-all focus:bg-white focus:border-[#1E3A8A] ${emailErrors.email ? 'border-rose-500' : ''}`} placeholder="admin@example.com" />
                            {emailErrors.email && <p className="text-[10px] font-bold text-rose-600 uppercase tracking-widest px-1">{emailErrors.email}</p>}
                        </div>
                        <button type="submit" disabled={emailProcessing} className="w-full bg-[#1E3A8A] text-white py-4 rounded-2xl text-[12px] font-bold shadow-xl shadow-blue-900/20 hover:bg-blue-800 transition-all uppercase tracking-[0.25em] active:scale-95">{emailProcessing ? 'Processing...' : 'Update Email'}</button>
                        {emailSaved && <div className="flex items-center gap-3 p-4 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-100 animate-in zoom-in-95"><svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg><span className="text-[10px] font-bold uppercase tracking-widest">Success</span></div>}
                    </form>
                </div>

                <div className="card-premium p-8">
                    <div className="flex items-center gap-4 mb-8">
                        <div className="h-12 w-12 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-700 shadow-inner">
                            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                        </div>
                        <div>
                            <h4 className="text-[15px] font-bold text-slate-800 uppercase tracking-tight leading-none">Change Password</h4>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mt-1.5">Security Credentials</p>
                        </div>
                    </div>
                    <form onSubmit={submitPassword} className="space-y-5">
                        <div className="space-y-4">
                            <div className="space-y-1.5"><label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">Current Password</label><input ref={currentPasswordRef} type="password" value={pwData.current_password} onChange={e => setPwData('current_password', e.target.value)} className="w-full rounded-xl border-slate-200 bg-slate-50/50 px-4 py-2.5 text-[13px] font-bold" /></div>
                            <div className="space-y-1.5"><label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">New Password</label><input ref={passwordRef} type="password" value={pwData.password} onChange={e => setPwData('password', e.target.value)} className="w-full rounded-xl border-slate-200 bg-slate-50/50 px-4 py-2.5 text-[13px] font-bold" /></div>
                            <div className="space-y-1.5"><label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">Confirm Password</label><input type="password" value={pwData.password_confirmation} onChange={e => setPwData('password_confirmation', e.target.value)} className="w-full rounded-xl border-slate-200 bg-slate-50/50 px-4 py-2.5 text-[13px] font-bold" /></div>
                        </div>
                        <button type="submit" disabled={pwProcessing} className="w-full bg-slate-900 text-white py-4 rounded-2xl text-[12px] font-bold shadow-xl shadow-slate-900/20 hover:bg-slate-800 transition-all uppercase tracking-[0.25em] active:scale-95">{pwProcessing ? 'Securing...' : 'Update Password'}</button>
                        {pwSaved && <div className="flex items-center gap-3 p-4 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-100 animate-in zoom-in-95"><svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg><span className="text-[10px] font-bold uppercase tracking-widest">Updated</span></div>}
                    </form>
                </div>
            </div>

            <div className="flex items-start gap-4 p-5 rounded-2xl bg-slate-50 border border-slate-100 shadow-inner">
                <div className="h-10 w-10 rounded-xl bg-white shadow-sm flex items-center justify-center text-slate-400 shrink-0 ring-1 ring-slate-900/5"><svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg></div>
                <div className="space-y-1">
                    <p className="text-[11px] font-bold text-slate-700 uppercase tracking-tight">Security Advisory</p>
                    <p className="text-[10px] text-slate-400 font-medium uppercase tracking-tight leading-relaxed max-w-3xl">System policies recommend changing your password every 90 days. Ensure your email address is correct for important system notifications.</p>
                </div>
            </div>
        </div>
    );
}
