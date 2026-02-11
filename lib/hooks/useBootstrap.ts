/**
 * File: lib/hooks/useBootstrap.ts
 * Description: Custom React hook for fetching initialization data.
 * Retrieves user profile, organization, and current plan limits from the server.
 * Functions:
 * - useBootstrap(): Hook that manages loading, error, and data state for bootstrap.
 * - fetchBootstrap(): Performs the GET request to /api/bootstrap and updates state.
 * Connections:
 * - Utilized by AppProvider to initialize the application state.
 */
"use client";

import { useEffect, useState } from "react";
import type { BootstrapData } from "../types/bootstrap";

export function useBootstrap() {
    const [data, setData] = useState<BootstrapData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchBootstrap = async () => {
        try {
            const res = await fetch("/api/bootstrap");
            if (!res.ok) throw new Error("Failed to fetch bootstrap data");
            const data = await res.json();
            setData(data);
            setError(null);
        } catch (err: any) {
            setError(err.message);
            setData(null);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchBootstrap();
    }, []);

    return { data, loading, error, refresh: fetchBootstrap };
}
