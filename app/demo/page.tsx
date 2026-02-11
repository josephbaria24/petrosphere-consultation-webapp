/**
 * File: app/demo/page.tsx
 * Description: Premium illustrative demo login page.
 * Forces light mode and features a modern, illustrative design based on user requests.
 * Functions:
 * - DemoLoginPage(): Component for the demo entry point.
 * Connections:
 * - Uses Supabase Auth for magic link generation.
 * - Redirects to /auth/callback upon successful OTP request.
 */
"use client";

import { useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import Link from "next/link";
import Image from "next/image";
import { Mail, Loader2, Globe, ArrowRight } from "lucide-react";
import { Button } from "../../@/components/ui/button";
import { Input } from "../../components/ui/input";
import { Alert, AlertDescription } from "../../@/components/ui/alert";

export default function DemoLoginPage() {
    const [email, setEmail] = useState("");
    const [loading, setLoading] = useState(false);
    const [sent, setSent] = useState(false);
    const [error, setError] = useState("");

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError("");

        try {
            const { error } = await supabase.auth.signInWithOtp({
                email,
                options: {
                    emailRedirectTo: `${window.location.origin}/auth/callback`,
                },
            });

            if (error) throw error;

            setSent(true);
        } catch (err: any) {
            setError(err.message || "Failed to send login link");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#f9f7f2] text-zinc-900 font-sans relative overflow-hidden flex flex-col">
            <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden flex items-center justify-center p-0">
                <Image
                    src="/images/workplace-staff-detailed.svg"
                    alt="Detailed Workplace Illustration"
                    fill
                    className="object-cover opacity-10 md:opacity-20"
                    priority
                />
            </div>

            {/* Header */}
            <header className="relative z-10 p-6 md:px-12 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <Image src="/icons/pinklogo.png" width={40} height={40} alt="Logo" className="w-10 h-10" />
                    <span className="text-2xl font-black tracking-tight text-zinc-900">Safety Vitals</span>
                </div>

                <div className="hidden md:flex items-center gap-8 text-sm font-semibold">
                    <Link href="/" className="hover:text-[#FF7A40] transition-colors">Home</Link>
                </div>
            </header>

            <main className="flex-1 relative z-10 flex items-center justify-center p-6 md:p-12">
                <div className="w-full max-w-[480px]">
                    <div className="bg-white rounded-[2.5rem] p-10 md:p-14 shadow-2xl shadow-zinc-200/50 border border-zinc-100 relative overflow-hidden">
                        {/* Decorative background shape */}
                        <div className="absolute -top-24 -left-24 w-48 h-48 bg-[#f9f7f2] rounded-full opacity-50" />

                        <div className="relative z-10 text-center space-y-4 mb-10">
                            <h2 className="text-3xl md:text-4xl font-black text-zinc-900 tracking-tight">
                                {sent ? "Check Email" : "Request Demo"}
                            </h2>
                            <p className="text-zinc-500 font-medium leading-relaxed">
                                {sent
                                    ? `Hey, we've sent a magic link to ${email}. Check your inbox!`
                                    : "Hey, Enter your details to get sign in to your account"}
                            </p>
                        </div>

                        {!sent ? (
                            <form onSubmit={handleSubmit} className="space-y-6 relative z-10">
                                <div className="space-y-2">
                                    <div className="relative group">
                                        <Input
                                            type="email"
                                            placeholder="Enter Email"
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                            required
                                            disabled={loading}
                                            className="w-full h-14 pl-6 pr-12 rounded-2xl border-zinc-200 bg-zinc-50/50 focus:bg-white focus:ring-[#FF7A40]/20 focus:border-[#FF7A40] text-zinc-900 font-medium transition-all group-hover:border-zinc-300"
                                        />
                                        <div className="absolute right-5 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full border-2 border-zinc-300 pointer-events-none group-focus-within:border-[#FF7A40] transition-colors" />
                                    </div>
                                </div>

                                {error && (
                                    <Alert variant="destructive" className="bg-red-50 border-red-100 text-red-600 rounded-xl">
                                        <AlertDescription className="font-medium">{error}</AlertDescription>
                                    </Alert>
                                )}

                                <Button
                                    type="submit"
                                    className="w-full h-14 bg-[#f3cb93] hover:bg-[#e6bd85] cursor-pointer text-zinc-900 font-black text-lg rounded-2xl shadow-md transition-all active:scale-[0.98] border-0"
                                    disabled={loading || !email}
                                >
                                    {loading ? (
                                        <Loader2 className="w-6 h-6 animate-spin" />
                                    ) : (
                                        "Register for demo"
                                    )}
                                </Button>
                            </form>
                        ) : (
                            <div className="space-y-8 relative z-10 animate-fade-in">
                                <div className="bg-green-50/50 border border-green-100 rounded-[2rem] p-8 flex flex-col items-center text-center gap-6">
                                    <div className="w-16 h-16 bg-green-100 rounded-2xl flex items-center justify-center shadow-sm">
                                        <Mail className="w-8 h-8 text-green-600" />
                                    </div>
                                    <div className="space-y-2">
                                        <h3 className="text-xl font-bold text-green-900">Sweet Success!</h3>
                                        <p className="text-green-700 font-medium leading-relaxed">
                                            Please click the magic link we just sent to your email to instantly sign in.
                                        </p>
                                    </div>
                                </div>
                                <Button
                                    variant="outline"
                                    className="w-full h-14 rounded-2xl cursor-pointer border-zinc-200 text-zinc-500 font-bold hover:bg-zinc-50 transition-all hover:text-zinc-800"
                                    onClick={() => {
                                        setSent(false);
                                        setEmail("");
                                    }}
                                >
                                    Try another email
                                </Button>
                            </div>
                        )}
                    </div>

                    <footer className="mt-8 text-center text-[10px] font-bold text-zinc-400 uppercase tracking-widest space-x-4">
                        <span>Copyright @petrosphere 2026</span>
                        <span className="opacity-30">|</span>
                        <Link href="/" className="hover:text-zinc-600 transition-colors">Privacy Policy</Link>
                    </footer>
                </div>
            </main>

            {/* Subtle floating link for actual admins */}
            <div className="absolute bottom-6 right-6 z-20">
                <Link href="/admin-login" className="flex items-center gap-2 group text-zinc-400 hover:text-zinc-900 transition-colors font-bold text-xs bg-white/50 backdrop-blur-sm px-4 py-2 rounded-full border border-zinc-100 shadow-sm">
                    Platform Admin
                    <ArrowRight className="w-3 h-3 translate-x-0 group-hover:translate-x-1 transition-transform" />
                </Link>
            </div>
        </div>
    );
}
