"use client";

import { ThemeProvider } from "../../components/theme-provider";
import { Toaster } from "sonner";
import ClickSpark from "./ClickSpark";

export default function LayoutShell({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <ThemeProvider
            attribute="class"
            defaultTheme="light"
            enableSystem
            disableTransitionOnChange
        >
            <Toaster richColors position="top-right" />
            <ClickSpark
                sparkColor="#FF7A40"
                sparkSize={10}
                sparkRadius={15}
                sparkCount={8}
                duration={400}
            >
                {children}
            </ClickSpark>
        </ThemeProvider>
    );
}
