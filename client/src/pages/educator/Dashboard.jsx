import React from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";

const EducatorLayout = () => {
  const navigate = useNavigate();

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
      <aside className="w-64 h-screen sticky top-0 self-start bg-white border-r border-gray-200 px-4 py-6 overflow-y-auto">

        <div className="mb-8 px-3">
          <h2 className="text-lg font-bold text-gray-800">
            Educator
          </h2>

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
      </aside>

      {/* CONTENT */}
      <main className="flex-1 min-w-0">
        <Outlet />
      </main>
    </div>
  );
};

export default EducatorLayout;