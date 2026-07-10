import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useApp } from "../context/AppContext";
import Avatar from "./ui/Avatar";

const links = [
  { to: "/dashboard", label: "Dashboard", icon: "M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" },
  { to: "/properties", label: "Properties", icon: "M3 21h18M5 21V6.75a1.5 1.5 0 011.5-1.5h11a1.5 1.5 0 011.5 1.5V21M9 9h1.5M9 12.75h1.5M9 16.5h1.5M13.5 9H15M13.5 12.75H15M13.5 16.5H15" },
  { to: "/tenants", label: "Tenants", icon: "M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" },
  { to: "/tenant-view", label: "Tenant's View", icon: "M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178zM15 12a3 3 0 11-6 0 3 3 0 016 0z" },
  { to: "/payments", label: "Payments", icon: "M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" },
  { to: "/maintenance", label: "Maintenance", icon: "M11.42 15.17L17.25 21A2.652 2.652 0 0021 17.25l-5.877-5.877M11.42 15.17l2.496-3.03c.317-.384.74-.626 1.208-.766M11.42 15.17l-4.655 5.653a2.548 2.548 0 11-3.586-3.586l6.837-5.63m5.108-.233c.55-.164 1.163-.188 1.743-.14a4.5 4.5 0 004.486-6.336l-3.276 3.277a3.004 3.004 0 01-2.25-2.25l3.276-3.276a4.5 4.5 0 00-6.336 4.486c.091 1.076-.071 2.264-.904 2.95l-.102.085m-1.745 1.437L5.909 7.5H4.5L2.25 3.75l1.5-1.5L7.5 4.5v1.409l4.26 4.26m-1.745 1.437l1.745-1.437m6.615 8.206L15.75 15.75M4.867 19.125h.008v.008h-.008v-.008z" },
  { to: "/reports", label: "Reports", icon: "M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" },
  { to: "/analytics", label: "Analytics", icon: "M3 13.5h4.5V21H3v-7.5ZM9.75 8.25h4.5V21h-4.5V8.25ZM16.5 3H21v18h-4.5V3Z" },
  { to: "/settings", label: "Settings", icon: "M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z" },
];

export default function Sidebar() {
  const { currentUser, logout } = useAuth();
  const { sidebarOpen, setSidebarOpen } = useApp();
  const navigate = useNavigate();

  async function handleLogout() {
    await logout();
    navigate("/login");
  }

  return (
    <>
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-20 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
      <aside
        className={`fixed top-0 left-0 h-full w-64 bg-[#0B1F17] flex flex-col z-30 transform transition-transform duration-200
          ${sidebarOpen ? "translate-x-0" : "-translate-x-full"} md:translate-x-0 md:static md:flex`}
      >
        <div className="px-6 py-5 border-b border-white/10">
          <span className="text-white font-bold text-lg tracking-tight">RentStack</span>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1">
          {links.map(({ to, label, icon }) => (
            <NavLink
              key={to}
              to={to}
              onClick={() => setSidebarOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 pl-2.5 pr-3 py-2.5 rounded-lg text-sm border-l-2 transition-colors duration-200 ${
                  isActive
                    ? "bg-white/10 text-white font-medium border-[#15803D]"
                    : "text-[#94A3B8] border-transparent hover:text-white hover:bg-white/5"
                }`
              }
            >
              <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d={icon} />
              </svg>
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="px-4 py-4 border-t border-white/10">
          {currentUser && (
            <div className="flex items-center gap-3 mb-3">
              <Avatar name={currentUser.name} bg="15803D" color="ffffff" className="w-9 h-9" />
              <div className="min-w-0">
                <p className="text-white text-sm font-medium truncate">{currentUser.name}</p>
                <p className="text-[#64748B] text-xs truncate">{currentUser.email}</p>
              </div>
            </div>
          )}
          <button
            onClick={handleLogout}
            className="w-full text-left text-sm text-[#94A3B8] hover:text-white transition-colors duration-200 px-3 py-2 rounded-lg hover:bg-white/5"
          >
            Sign out
          </button>
        </div>
      </aside>
    </>
  );
}
