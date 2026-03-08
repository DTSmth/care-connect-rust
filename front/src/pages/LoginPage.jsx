import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { loginRequest } from '../api/authApi';
import { useAuth } from '../auth/AuthContext';

export default function LoginPage() {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const { login } = useAuth();
    const navigate = useNavigate();

    const submit = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        try {
            const res = await loginRequest({ username, password });
            login(res.data.token, res.data.user);
            navigate('/clients');
        } catch (error) {
            console.error("Login failed", error);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="flex min-h-screen">
            {/* Left brand panel */}
            <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-[#0487D9] to-[#0363A0] flex-col items-center justify-center px-12 text-white relative overflow-hidden">
                {/* Decorative circles */}
                <div className="absolute top-[-80px] right-[-80px] w-72 h-72 rounded-full bg-white/5" />
                <div className="absolute bottom-[-60px] left-[-60px] w-56 h-56 rounded-full bg-white/5" />
                <div className="absolute top-1/3 left-[-40px] w-32 h-32 rounded-full bg-[#0CB1F2]/20" />

                <div className="relative z-10 max-w-sm text-center">
                    <div className="mx-auto mb-8 h-20 w-20 rounded-2xl bg-white/15 backdrop-blur flex items-center justify-center shadow-xl">
                        <svg className="w-10 h-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                        </svg>
                    </div>
                    <h1 className="text-4xl font-bold tracking-tight mb-3">CarePortal</h1>
                    <p className="text-xl text-white/80 font-medium mb-6">Smarter scheduling for care teams</p>
                    <p className="text-sm text-white/60 leading-relaxed">
                        Manage clients, staff, and shifts in one place. Real-time matching, calendar views, and actionable reports.
                    </p>
                    <div className="mt-10 flex justify-center gap-8 text-center">
                        <div>
                            <p className="text-2xl font-bold">∞</p>
                            <p className="text-xs text-white/60 mt-0.5">Shifts managed</p>
                        </div>
                        <div className="w-px bg-white/20" />
                        <div>
                            <p className="text-2xl font-bold">100%</p>
                            <p className="text-xs text-white/60 mt-0.5">Coverage visibility</p>
                        </div>
                        <div className="w-px bg-white/20" />
                        <div>
                            <p className="text-2xl font-bold">24/7</p>
                            <p className="text-xs text-white/60 mt-0.5">Always available</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Right login panel */}
            <div className="flex-1 flex items-center justify-center bg-[#F2F2F2] px-6 py-12">
                <div className="w-full max-w-md">
                    {/* Mobile logo */}
                    <div className="lg:hidden flex items-center gap-3 mb-8 justify-center">
                        <div className="h-10 w-10 rounded-xl bg-[#0487D9] flex items-center justify-center">
                            <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                            </svg>
                        </div>
                        <span className="text-2xl font-bold text-slate-800">CarePortal</span>
                    </div>

                    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8">
                        <div className="mb-8">
                            <h2 className="text-2xl font-bold text-slate-800">Welcome back</h2>
                            <p className="text-slate-500 mt-1.5 text-sm">Sign in to your coordinator account</p>
                        </div>

                        <form onSubmit={submit} className="space-y-5">
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                                    Username
                                </label>
                                <input
                                    type="text"
                                    required
                                    className="block w-full rounded-lg border border-[#cbd5e1] py-2.5 px-3.5 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0487D9] focus:border-transparent text-sm transition-all"
                                    placeholder="johndoe"
                                    value={username}
                                    onChange={e => setUsername(e.target.value)}
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                                    Password
                                </label>
                                <input
                                    type="password"
                                    required
                                    className="block w-full rounded-lg border border-[#cbd5e1] py-2.5 px-3.5 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0487D9] focus:border-transparent text-sm transition-all"
                                    placeholder="••••••••"
                                    value={password}
                                    onChange={e => setPassword(e.target.value)}
                                />
                            </div>

                            <button
                                type="submit"
                                disabled={isLoading}
                                className="w-full flex justify-center rounded-lg bg-[#0487D9] px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-[#0363A0] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#0487D9] transition-all disabled:opacity-70"
                            >
                                {isLoading ? 'Signing in…' : 'Sign in'}
                            </button>
                        </form>

                        <div className="mt-8 text-center text-xs text-slate-400">
                            &copy; 2026 CarePortal. All rights reserved.
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
