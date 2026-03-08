import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Purchases, LOG_LEVEL } from '@revenuecat/purchases-capacitor';
import { SubscriptionTier } from '../types';

// Replace these with your actual RevenueCat API keys from app.revenuecat.com
const REVENUECAT_IOS_KEY = 'appl_REPLACE_WITH_YOUR_IOS_KEY';
const REVENUECAT_ANDROID_KEY = 'goog_REPLACE_WITH_YOUR_ANDROID_KEY';
const ENTITLEMENT_ID = 'pro';

interface SubscriptionContextType {
    isProUser: boolean;
    tier: SubscriptionTier;
    isLoading: boolean;
    purchaseMonthly: () => Promise<void>;
    purchaseAnnual: () => Promise<void>;
    restorePurchases: () => Promise<void>;
}

const SubscriptionContext = createContext<SubscriptionContextType>({
    isProUser: false,
    tier: 'free',
    isLoading: true,
    purchaseMonthly: async () => {},
    purchaseAnnual: async () => {},
    restorePurchases: async () => {},
});

function isCapacitor(): boolean {
    return typeof (window as any).Capacitor !== 'undefined' &&
        (window as any).Capacitor?.isNativePlatform?.() === true;
}

function getPlatformApiKey(): string {
    const platform = (window as any).Capacitor?.getPlatform?.();
    return platform === 'android' ? REVENUECAT_ANDROID_KEY : REVENUECAT_IOS_KEY;
}

export function SubscriptionProvider({ children }: { children: React.ReactNode }) {
    const [isProUser, setIsProUser] = useState(false);
    const [tier, setTier] = useState<SubscriptionTier>('free');
    const [isLoading, setIsLoading] = useState(true);

    const updateSubscriptionStatus = useCallback(async () => {
        if (!isCapacitor()) {
            // Web: not a paying platform, skip
            setIsLoading(false);
            return;
        }
        try {
            const { customerInfo } = await Purchases.getCustomerInfo();
            const entitlement = customerInfo.entitlements.active[ENTITLEMENT_ID];
            if (entitlement) {
                setIsProUser(true);
                const productId = entitlement.productIdentifier ?? '';
                setTier(productId.includes('annual') ? 'annual' : 'monthly');
            } else {
                setIsProUser(false);
                setTier('free');
            }
        } catch (err) {
            console.warn('RevenueCat: could not fetch customer info', err);
            setIsProUser(false);
            setTier('free');
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        if (!isCapacitor()) {
            setIsLoading(false);
            return;
        }

        const setup = async () => {
            try {
                await Purchases.setLogLevel({ level: LOG_LEVEL.ERROR });
                await Purchases.configure({ apiKey: getPlatformApiKey() });
                await Purchases.addCustomerInfoUpdateListener(async () => {
                    await updateSubscriptionStatus();
                });
                await updateSubscriptionStatus();
            } catch (err) {
                console.warn('RevenueCat: setup failed', err);
                setIsLoading(false);
            }
        };

        setup();
    }, [updateSubscriptionStatus]);

    const purchaseMonthly = useCallback(async () => {
        if (!isCapacitor()) return;
        try {
            const offerings = await Purchases.getOfferings();
            const monthly = offerings.current?.availablePackages.find(
                (p) => p.packageType === 'MONTHLY'
            );
            if (!monthly) throw new Error('Monthly package not found');
            await Purchases.purchasePackage({ aPackage: monthly });
            await updateSubscriptionStatus();
        } catch (err) {
            console.error('Purchase failed', err);
            throw err;
        }
    }, [updateSubscriptionStatus]);

    const purchaseAnnual = useCallback(async () => {
        if (!isCapacitor()) return;
        try {
            const offerings = await Purchases.getOfferings();
            const annual = offerings.current?.availablePackages.find(
                (p) => p.packageType === 'ANNUAL'
            );
            if (!annual) throw new Error('Annual package not found');
            await Purchases.purchasePackage({ aPackage: annual });
            await updateSubscriptionStatus();
        } catch (err) {
            console.error('Purchase failed', err);
            throw err;
        }
    }, [updateSubscriptionStatus]);

    const restorePurchases = useCallback(async () => {
        if (!isCapacitor()) return;
        try {
            await Purchases.restorePurchases();
            await updateSubscriptionStatus();
        } catch (err) {
            console.error('Restore failed', err);
            throw err;
        }
    }, [updateSubscriptionStatus]);

    return (
        <SubscriptionContext.Provider value={{ isProUser, tier, isLoading, purchaseMonthly, purchaseAnnual, restorePurchases }}>
            {children}
        </SubscriptionContext.Provider>
    );
}

export function useSubscription() {
    return useContext(SubscriptionContext);
}
