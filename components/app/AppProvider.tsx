"use client";

import React, { createContext, useContext, ReactNode, useState, useEffect } from "react";
import { useBootstrap } from "../../lib/hooks/useBootstrap";
import type { BootstrapData } from "../../lib/types/bootstrap";
import { getClientCookie, setClientCookie } from "../../lib/cookies-client";

interface AppContextType extends BootstrapData {
    refresh: () => Promise<void>;
    hasCompletedTour: boolean;
    markTourAsCompleted: () => void;
    currentStep: number;
    setCurrentStep: (step: number) => void;
}

const AppContext = createContext<AppContextType | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
    const { data, loading, error, refresh } = useBootstrap();
    const [hasCompletedTour, setHasCompletedTour] = useState<boolean>(true); // Default to true until checked
    const [currentStep, setCurrentStepState] = useState<number>(0);

    useEffect(() => {
        // Initialize from Cookies (Safe on client)
        const stored = getClientCookie("petrosphere_tour_completed");
        setHasCompletedTour(stored === "true");

        const storedStep = localStorage.getItem("petrosphere_tour_step");
        if (storedStep) setCurrentStepState(parseInt(storedStep, 10));
    }, []);

    const markTourAsCompleted = () => {
        setClientCookie("petrosphere_tour_completed", "true", { expires: 1 });
        setHasCompletedTour(true);
        localStorage.removeItem("petrosphere_tour_step");
    };

    const setCurrentStep = (step: number) => {
        setCurrentStepState(step);
        localStorage.setItem("petrosphere_tour_step", step.toString());
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                    <p className="text-gray-600">Loading...</p>
                </div>
            </div>
        );
    }

    if (error || !data) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center text-red-600">
                    <p className="font-semibold">Failed to load application</p>
                    <p className="text-sm">{error}</p>
                </div>
            </div>
        );
    }

    return (
        <AppContext.Provider value={{
            ...data,
            refresh,
            hasCompletedTour,
            markTourAsCompleted,
            currentStep,
            setCurrentStep
        }}>
            {children}
        </AppContext.Provider>
    );
}

export function useApp() {
    const context = useContext(AppContext);
    if (!context) {
        throw new Error("useApp must be used within AppProvider");
    }
    return context;
}
