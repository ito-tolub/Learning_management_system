import React, { useEffect, useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";

const EducatorLayout = () => {
  const navigate = useNavigate();
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  useEffect(() => {
    const handleSidebarShortcut = (event) => {
      const activeElement = document.activeElement;
      const activeTag = activeElement?.tagName;

      const isTyping =
        activeTag === "INPUT" ||
        activeTag === "TEXTAREA" ||
        activeElement?.isContentEditable;

      if (isTyping) return;

      const isToggleShortcut =
        (event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "b";

      if (!isToggleShortcut) return;

      event.preventDefault();
      setIsSidebarOpen((previous) => !previous);
    };

    window.addEventListener("keydown", handleSidebarShortcut);

    return () => {
      window.removeEventListener("keydown", handleSidebarShortcut);
    };
  }, []);

  const menu = [
    {
      label: "Hasil Kuis Praja",
      path: "/educator/my-course",
    },
    {
      label: "Kelola Tugas",
      path: "/educator/assignments",
    },
    {
      label: "Student Engagement",
      path: "/educator/student-engagement",
    },
    { label: "Ringkasan VARK", path: "/educator/vark-summary" },
  ];

  const handleLogout = () => {
    localStorage.removeItem("dosenToken");
    navigate("/");
  };

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* SIDEBAR */}
      <aside
        aria-hidden={!isSidebarOpen}
        className={`h-screen sticky top-0 self-start bg-white overflow-y-auto overflow-x-hidden transition-[width,opacity] duration-300 ease-in-out ${
          isSidebarOpen
            ? "w-64 border-r border-gray-200 px-4 py-6 opacity-100"
            : "w-0 border-r-0 px-0 py-0 opacity-0 pointer-events-none"
        }`}
      >
        <div className="w-56">
          <div className="mb-2 flex justify-end">
            <button
              type="button"
              onClick={() => setIsSidebarOpen(false)}
              title="Sembunyikan sidebar (Ctrl+B)"
              aria-label="Sembunyikan sidebar"
              className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-500 transition hover:bg-gray-100 hover:text-gray-800"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5" aria-hidden="true">
                <rect x="3" y="3" width="18" height="18" rx="2" />
                <path d="M9 3v18" />
                <path d="m16 9-3 3 3 3" />
              </svg>
            </button>
          </div>
        <div className="mb-8 px-3">
          <h2 className="text-lg font-bold text-gray-800">Educator</h2>

          <p className="text-xs text-gray-400 mt-1">
            Learning Management System
          </p>
        </div>

        <nav className="space-y-2">
          {menu.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `block px-4 py-3 rounded-lg text-sm font-medium transition ${
                  isActive
                    ? "bg-green-50 text-green-600"
                    : "text-gray-500 hover:bg-gray-50 hover:text-gray-700"
                }`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="mt-10 border-t pt-4">
          <button
            type="button"
            onClick={handleLogout}
            className="w-full text-left px-4 py-3 text-sm text-red-500 hover:bg-red-50 rounded-lg"
          >
            Keluar
          </button>
        </div>
      </div>
    </aside>

      {/* CONTENT */}
      <main className="flex-1 min-w-0">
        {!isSidebarOpen && (
            <div className="px-6 pt-6">
              <button
                type="button"
                onClick={() => setIsSidebarOpen(true)}
                title="Tampilkan sidebar (Ctrl+B)"
                aria-label="Tampilkan sidebar"
                className="flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-500 shadow-sm transition hover:border-gray-300 hover:bg-gray-50 hover:text-gray-800"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5" aria-hidden="true">
                  <rect x="3" y="3" width="18" height="18" rx="2" />
                  <path d="M9 3v18" />
                  <path d="m14 9 3 3-3 3" />
                </svg>
              </button>
            </div>
          )}
        <Outlet />
      </main>
    </div>
  );
};

export default EducatorLayout;
