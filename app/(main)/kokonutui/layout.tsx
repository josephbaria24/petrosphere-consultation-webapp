import type { ReactNode } from "react";
import { requireAuth } from "../../../lib/auth";
import { AppProvider } from "../../../components/app/AppProvider";
import Sidebar from "../../../components/sidebar";
import TopNav from "../../../components/top-nav";

interface LayoutProps {
  children: ReactNode;
}

export default async function Layout({ children }: LayoutProps) {
  // Get authenticated user (admin or demo)
  const user = await requireAuth();

  return (
    <AppProvider>
      <div className="flex h-screen">
        <Sidebar />
        <div className="w-full flex flex-1 flex-col">
          <header className="h-16 border-0 ">
            <TopNav fullName={user.fullName || user.email} email={user.email} />
          </header>
          <main className="flex-1 overflow-auto p-6 bg-gray-100 dark:bg-[#0F0F12]">
            {children}
          </main>
        </div>
      </div>
    </AppProvider>
  );
}
