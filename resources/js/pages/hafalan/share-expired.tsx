import React from 'react';
import { Head } from '@inertiajs/react';
import { AlertOctagon, Lock, ArrowLeft } from 'lucide-react';

/**
 * Rendered when a public share link fails signature verification — tampered with,
 * or past its expiry. The check happens server-side (the `signed` middleware), so no
 * student data is ever sent to the browser along with this page.
 */
export default function ShareExpiredPage() {
    return (
        <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-4">
            <Head title="Link Kadaluarsa - Monitoring Hafalan" />
            <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-3xl p-8 text-center space-y-6 shadow-2xl">
                <div className="size-20 bg-rose-500/10 text-rose-500 rounded-3xl flex items-center justify-center mx-auto border border-rose-500/20">
                    <AlertOctagon className="size-10" />
                </div>
                <div className="space-y-2">
                    <h1 className="text-2xl font-black text-white">Link Share Tidak Berlaku</h1>
                    <p className="text-xs text-slate-400 leading-relaxed">
                        Link publik monitoring hafalan ini sudah melewati batas waktu berlaku yang
                        ditentukan oleh Admin Sekolah, atau alamatnya tidak lagi valid.
                    </p>
                </div>

                <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 text-xs text-slate-300 space-y-2 text-left">
                    <div className="flex items-center gap-2 font-bold text-amber-400">
                        <Lock className="size-4" /> Apa yang harus dilakukan?
                    </div>
                    <p className="text-[11px] text-slate-400">
                        Silakan hubungi Wali Kelas atau Guru Pengampu untuk meminta link publik
                        terbaru dengan durasi berlaku yang disesuaikan.
                    </p>
                </div>

                <div className="pt-2">
                    <a
                        href="/login"
                        className="inline-flex items-center justify-center gap-2 w-full py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-lg transition-colors"
                    >
                        <ArrowLeft className="size-4" /> Masuk Ke Halaman Login Admin
                    </a>
                </div>
            </div>
        </div>
    );
}
