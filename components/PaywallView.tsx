import React, { useState } from 'react';
import { Theme } from '../types';
import { useSubscription } from '../context/SubscriptionContext';
import ThemedButton from './ThemedButton';
import { Check, X, Mic, Music, Brain, Star } from 'lucide-react';

interface PaywallViewProps {
    currentTheme: Theme;
    onClose: () => void;
}

const features = [
    { icon: <Mic className="w-5 h-5" />, label: '30+ vocal exercises', free: false },
    { icon: <Music className="w-5 h-5" />, label: 'All 10 training routines', free: false },
    { icon: <Brain className="w-5 h-5" />, label: 'AI exercise generation', free: false },
    { icon: <Star className="w-5 h-5" />, label: 'Vocal range detection', free: true },
    { icon: <Music className="w-5 h-5" />, label: '5 free exercises', free: true },
    { icon: <Music className="w-5 h-5" />, label: '2 warmup routines', free: true },
];

const PaywallView: React.FC<PaywallViewProps> = ({ currentTheme, onClose }) => {
    const { purchaseMonthly, purchaseAnnual, restorePurchases } = useSubscription();
    const [selectedPlan, setSelectedPlan] = useState<'monthly' | 'annual'>('annual');
    const [isPurchasing, setIsPurchasing] = useState(false);
    const [error, setError] = useState('');

    const handlePurchase = async () => {
        setIsPurchasing(true);
        setError('');
        try {
            if (selectedPlan === 'annual') {
                await purchaseAnnual();
            } else {
                await purchaseMonthly();
            }
            onClose();
        } catch (e: unknown) {
            const msg = e instanceof Error ? e.message : String(e);
            // Ignore user cancellations
            if (!msg.includes('cancel') && !msg.includes('userCancelled')) {
                setError('Purchase could not be completed. Please try again.');
            }
        } finally {
            setIsPurchasing(false);
        }
    };

    const handleRestore = async () => {
        setIsPurchasing(true);
        setError('');
        try {
            await restorePurchases();
            onClose();
        } catch {
            setError('Could not restore purchases. Please try again.');
        } finally {
            setIsPurchasing(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex flex-col sm:flex-row sm:items-center sm:justify-center sm:bg-black/60 sm:backdrop-blur-sm animate-fade-in-scale">
            <div className="relative w-full h-full sm:h-auto sm:max-w-md bg-white dark:bg-slate-900 sm:rounded-3xl shadow-2xl flex flex-col overflow-hidden animate-slide-up">
                {/* Close button */}
                <button
                    onClick={onClose}
                    className="absolute right-4 p-2 rounded-full text-white/80 hover:text-white hover:bg-white/20 transition-colors z-10"
                    style={{ top: 'max(1rem, env(safe-area-inset-top))' }}
                >
                    <X className="w-5 h-5" />
                </button>

                {/* Header */}
                <div
                    className={`px-6 pb-6 bg-gradient-to-br ${currentTheme.button.from} ${currentTheme.button.to} text-white flex-shrink-0`}
                    style={{ paddingTop: 'max(2rem, env(safe-area-inset-top))' }}
                >
                    <div className="text-center">
                        <p className="text-white/80 text-sm font-medium uppercase tracking-widest mb-1">VoxLab Pro</p>
                        <h2 className="text-2xl font-black mb-2">Unlock Your Full Potential</h2>
                        <p className="text-white/70 text-sm">Access all exercises, routines, and AI-powered training.</p>
                    </div>
                </div>

                <div className="px-6 py-5 flex-1 overflow-y-auto" style={{ paddingBottom: 'max(1.25rem, env(safe-area-inset-bottom))' }}>
                    {/* Feature comparison */}
                    <div className="space-y-2 mb-6">
                        {features.map((f, i) => (
                            <div key={i} className="flex items-center gap-3">
                                <div className={`flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center ${f.free ? 'bg-slate-200 dark:bg-slate-700 text-slate-500' : `bg-gradient-to-br ${currentTheme.button.from} ${currentTheme.button.to} text-white`}`}>
                                    <Check className="w-3 h-3" />
                                </div>
                                <span className={`text-sm ${f.free ? 'text-slate-500 dark:text-slate-400' : 'text-slate-800 dark:text-slate-100 font-medium'}`}>
                                    {f.label}
                                    {f.free && <span className="ml-1 text-xs text-slate-400">(free)</span>}
                                </span>
                            </div>
                        ))}
                    </div>

                    {/* Plan selector */}
                    <div className="grid grid-cols-2 gap-3 mb-5">
                        {/* Annual plan */}
                        <button
                            onClick={() => setSelectedPlan('annual')}
                            className={`relative p-4 rounded-2xl border-2 transition-all text-left ${selectedPlan === 'annual' ? `border-violet-500 bg-violet-50 dark:bg-violet-900/30` : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50'}`}
                        >
                            <div className="absolute -top-2.5 left-1/2 -translate-x-1/2">
                                <span className={`text-xs font-bold px-2 py-0.5 rounded-full text-white bg-gradient-to-r ${currentTheme.button.from} ${currentTheme.button.to}`}>
                                    Save 40%
                                </span>
                            </div>
                            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mt-1">Annual</p>
                            <p className="text-lg font-black text-slate-900 dark:text-white mt-0.5">$3.99<span className="text-sm font-normal">/mo</span></p>
                            <p className="text-xs text-slate-400 dark:text-slate-500">$47.99 billed yearly</p>
                        </button>

                        {/* Monthly plan */}
                        <button
                            onClick={() => setSelectedPlan('monthly')}
                            className={`p-4 rounded-2xl border-2 transition-all text-left ${selectedPlan === 'monthly' ? `border-violet-500 bg-violet-50 dark:bg-violet-900/30` : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50'}`}
                        >
                            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mt-1">Monthly</p>
                            <p className="text-lg font-black text-slate-900 dark:text-white mt-0.5">$6.99<span className="text-sm font-normal">/mo</span></p>
                            <p className="text-xs text-slate-400 dark:text-slate-500">Billed monthly</p>
                        </button>
                    </div>

                    {/* Error */}
                    {error && (
                        <p className="text-red-500 text-sm text-center mb-3">{error}</p>
                    )}

                    {/* CTA */}
                    <ThemedButton
                        onClick={handlePurchase}
                        disabled={isPurchasing}
                        theme={currentTheme}
                        className="w-full py-4 text-base font-bold"
                    >
                        {isPurchasing ? 'Processing...' : `Start ${selectedPlan === 'annual' ? 'Annual' : 'Monthly'} Plan`}
                    </ThemedButton>

                    {/* Restore & legal */}
                    <div className="flex items-center justify-center gap-4 mt-4">
                        <button
                            onClick={handleRestore}
                            disabled={isPurchasing}
                            className="text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
                        >
                            Restore Purchases
                        </button>
                    </div>
                    <p className="text-center text-xs text-slate-400 dark:text-slate-500 mt-3 mb-2 leading-relaxed">
                        Subscriptions auto-renew. Cancel anytime in your App Store settings.
                    </p>
                </div>
            </div>
        </div>
    );
};

export default PaywallView;
