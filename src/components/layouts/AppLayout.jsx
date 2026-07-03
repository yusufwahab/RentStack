import { Outlet, Navigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import Sidebar from "../Sidebar";
import { useApp } from "../../context/AppContext";
import Spinner from "../ui/Spinner";

export default function AppLayout() {
  const { currentUser, authLoading } = useAuth();
  const { setSidebarOpen } = useApp();

  if (authLoading) return <div className="min-h-screen flex items-center justify-center"><Spinner /></div>;
  if (!currentUser) return <Navigate to="/login" replace />;

  return (
    <div className="flex h-screen bg-[#F8FAFC] overflow-hidden">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="md:hidden flex items-center px-4 h-14 border-b border-[#E2E8F0] bg-white">
          <button onClick={() => setSidebarOpen(true)} className="p-2 rounded-lg hover:bg-[#F1F5F9]">
            <svg className="w-5 h-5 text-[#0F172A]" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <span className="ml-3 font-bold text-[#0F172A]">RentStack</span>
        </header>
        <main className="flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
