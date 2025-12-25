import React, { useState, useEffect } from 'react';
import { useTranslation } from '../hooks/useTranslation';
import { Theme } from '../types';
import ThemedButton from './ThemedButton';

interface FeedbackOverlayProps {
    currentTheme: Theme;
    activeView?: string;
    currentExercise?: { id: number; name: string } | null;
    currentRoutine?: { routine: { id: number; name: string }; exerciseIndex: number } | null;
    uiView?: 'main' | 'exercise';
}

const FeedbackOverlay: React.FC<FeedbackOverlayProps> = ({ currentTheme, activeView, currentExercise, currentRoutine, uiView }) => {
    const { t } = useTranslation();
    const [isOpen, setIsOpen] = useState(false);
    const [email, setEmail] = useState('');
    const [feedback, setFeedback] = useState('');
    const [status, setStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');

    // Handle form submission
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setStatus('submitting');

        const formData = new FormData();
        formData.append('form-name', 'beta-feedback');
        formData.append('email', email);

        // Build context information
        let contextInfo = `\n\n--- Context ---\n`;
        contextInfo += `View: ${activeView || 'unknown'}\n`;
        contextInfo += `UI State: ${uiView || 'main'}\n`;

        if (currentExercise) {
            contextInfo += `Exercise: ${currentExercise.name} (ID: ${currentExercise.id})\n`;
        }

        if (currentRoutine) {
            contextInfo += `Routine: ${currentRoutine.routine.name} (Exercise ${currentRoutine.exerciseIndex + 1})\n`;
        }

        contextInfo += `Device: ${/Mobi|Android/i.test(navigator.userAgent) ? 'Mobile' : 'Desktop'}\n`;
        contextInfo += `Timestamp: ${new Date().toISOString()}`;

        // Append context to feedback
        formData.append('feedback', feedback + contextInfo);

        try {
            await fetch('/', {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: new URLSearchParams(formData as any).toString(),
            });
            setStatus('success');
            setTimeout(() => {
                setIsOpen(false);
                setStatus('idle');
                setFeedback('');
                setEmail('');
            }, 2000);
        } catch (error) {
            console.error('Feedback error:', error);
            setStatus('error');
        }
    };

    return (
        <>
            {/* Persistent Yellow Button */}
            <button
                onClick={() => setIsOpen(true)}
                className="fixed top-24 right-4 z-[100] px-4 py-2 rounded-full bg-yellow-400/80 dark:bg-yellow-500/80 backdrop-blur-md border border-yellow-500/50 dark:border-yellow-400/50 text-sm font-bold text-yellow-900 dark:text-yellow-950 hover:bg-yellow-400 dark:hover:bg-yellow-500 transition-all duration-300 shadow-lg hover:shadow-xl hover:scale-105"
            >
                {t('feedback')}
            </button>

            {/* Modal */}
            {isOpen && (
                <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/20 backdrop-blur-sm animate-fade-in">
                    <div className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl rounded-2xl p-6 w-full max-w-sm shadow-2xl border border-white/50 dark:border-slate-700 animate-fade-in-scale">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">{t('sendFeedback')}</h3>
                            <button
                                onClick={() => setIsOpen(false)}
                                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
                            >
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        {status === 'success' ? (
                            <div className="text-center py-8 text-green-600 dark:text-green-400 font-medium animate-fade-in">
                                {t('feedbackSent')}
                            </div>
                        ) : (
                            <form onSubmit={handleSubmit} className="space-y-4" name="beta-feedback" data-netlify="true" netlify-honeypot="bot-field">
                                <input type="hidden" name="form-name" value="beta-feedback" />
                                <p className="hidden">
                                    <label>Don’t fill this out if you’re human: <input name="bot-field" /></label>
                                </p>

                                <div>
                                    <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                                        {t('emailOptional')}
                                    </label>
                                    <input
                                        type="email"
                                        name="email"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        className="w-full px-3 py-2 rounded-lg bg-slate-100 dark:bg-slate-800 border-transparent focus:border-violet-500 focus:bg-white dark:focus:bg-slate-900 focus:ring-0 text-sm transition-colors"
                                        placeholder="you@example.com"
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                                        {t('yourFeedback')}
                                    </label>
                                    <textarea
                                        required
                                        name="feedback"
                                        value={feedback}
                                        onChange={(e) => setFeedback(e.target.value)}
                                        rows={4}
                                        className="w-full px-3 py-2 rounded-lg bg-slate-100 dark:bg-slate-800 border-transparent focus:border-violet-500 focus:bg-white dark:focus:bg-slate-900 focus:ring-0 text-sm transition-colors resize-none"
                                        placeholder="Tell us what you think..."
                                    />
                                </div>

                                {status === 'error' && (
                                    <p className="text-xs text-red-500 text-center">{t('feedbackError')}</p>
                                )}

                                <ThemedButton
                                    theme={currentTheme}
                                    type="submit"
                                    className="w-full justify-center"
                                    disabled={status === 'submitting'}
                                >
                                    {status === 'submitting' ? t('processing') : t('sendFeedback')}
                                </ThemedButton>
                            </form>
                        )}
                    </div>
                </div>
            )}
        </>
    );
};

export default FeedbackOverlay;
