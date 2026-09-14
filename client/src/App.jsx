import React, { useContext } from "react";
import { Route, Routes, useMatch, Navigate } from "react-router-dom";
import { useUser } from "@clerk/clerk-react";
import Home from "./pages/student/Home";
import CourseList from "./pages/student/CourseList";
import CourseDetail from "./pages/student/CourseDetail";
import MyEnrollment from "./pages/student/MyEnrollment";
import Player from "./pages/student/Player";
import Loading from "./components/student/Loading";
import VarkQuiz from "./pages/student/VarkQuiz";
import NppInput from "./pages/student/NppInput";
import TimelineBerita from "./pages/student/TimelineBerita";
import QuizPage from "./pages/student/QuizPage";
import Dashboard from "./pages/educator/Dashboard";
import MyCourses from "./pages/educator/MyCourses";
import StudentsEnrolled from "./pages/educator/StudentsEnrolled";
import StudentEngagement from "./pages/educator/StudentEngagement";
import VarkSummary from "./pages/educator/VarkSummary";
import AssignmentManager from "./pages/educator/AssignmentManager";

import Navbar from "./components/student/Navbar";
import { AppContext } from "./context/AppContext";
import "quill/dist/quill.snow.css";
import { ToastContainer } from "react-toastify";
import Presensi from "./pages/educator/Presensi";

const RequireOnboarding = ({ children }) => {
  const { isLoaded, isSignedIn, user } = useUser();

  const { userData, userLoading } = useContext(AppContext);

  // Clerk belum selesai loading
  if (!isLoaded) {
    return <Loading />;
  }

  // Belum login
  if (!isSignedIn) {
    return children;
  }

  // Dosen tidak perlu onboarding praja
  if (user?.publicMetadata?.role === "educator") {
    return children;
  }

  // Data user MongoDB masih loading
  if (userLoading) {
    return <Loading />;
  }

  // Tunggu sinkronisasi user
  if (!userData) {
    return <Loading />;
  }

  // ========================================
  // 1. CEK NPP
  // ========================================
  if (!userData.npp) {
    return <Navigate to="/npp-input" replace />;
  }

  // ========================================
  // 3. CEK APAKAH VARK SUDAH DIISI
  // ========================================
  const dominant = userData?.varkResult?.dominant;
  const hasCompletedVark = Array.isArray(dominant) && dominant.length > 0;

  // Hanya G2 yang diarahkan ke VARK
  if (!hasCompletedVark) {
    return <Navigate to="/vark-quiz" replace />;
  }
  // G1 langsung masuk aplikasi.
  // G2 yang sudah VARK juga langsung masuk aplikasi.
  return children;
};

const VarkOnboardingRoute = () => {
  const { isLoaded, isSignedIn, user } = useUser();
  const { userData, userLoading } = useContext(AppContext);

  if (!isLoaded || userLoading) {
    return <Loading />;
  }
  if (!isSignedIn) {
    return <Navigate to="/" replace />;
  }
  if (user?.publicMetadata?.role === "educator") {
    return <Navigate to="/educator" replace />;
  }
  if (!userData) {
    return <Loading />;
  }
  // NPP wajib tersedia dahulu
  if (!userData.npp) {
    return <Navigate to="/npp-input" replace />;
  }

  // Cek apakah user sudah pernah mengisi VARK
  const dominant = userData?.varkResult?.dominant;

  const hasCompletedVark = Array.isArray(dominant) && dominant.length > 0;

  // Sudah pernah VARK → jangan izinkan mengulang
  if (hasCompletedVark) {
    return <Navigate to="/" replace />;
  }

  return <VarkQuiz />;
};

const App = () => {
  const isEducatorRoute = useMatch("/educator/*");

  return (
    <div className="text-default min-h-screen bg-white">
      <ToastContainer />

      {!isEducatorRoute && <Navbar />}
      <Routes>
        <Route
          path="/"
          element={
            <RequireOnboarding>
              <Home />
            </RequireOnboarding>
          }
        />

        <Route path="/timeline" element={<TimelineBerita />} />

        <Route
          path="/course-list"
          element={
            <RequireOnboarding>
              <CourseList />
            </RequireOnboarding>
          }
        />
        <Route
          path="/course-list/:input"
          element={
            <RequireOnboarding>
              <CourseList />
            </RequireOnboarding>
          }
        />

        <Route
          path="/course/:id"
          element={
            <RequireOnboarding>
              <CourseDetail />
            </RequireOnboarding>
          }
        />
        <Route
          path="/my-enrollments"
          element={
            <RequireOnboarding>
              <MyEnrollment />
            </RequireOnboarding>
          }
        />

        <Route
          path="/player/:courseId"
          element={
            <RequireOnboarding>
              <Player />
            </RequireOnboarding>
          }
        />
        <Route
          path="/quiz/:quizId"
          element={
            <RequireOnboarding>
              <QuizPage />
            </RequireOnboarding>
          }
        />
        <Route path="/npp-input" element={<NppInput />} />
        <Route path="/vark-quiz" element={<VarkOnboardingRoute />} />
        <Route path="/loading/:path" element={<Loading />} />

        <Route path="/educator" element={<Dashboard />}>
          <Route index element={<Navigate to="my-course" replace />} />
          <Route path="my-course" element={<MyCourses />} />

          <Route path="student-engagement" element={<StudentEngagement />} />
          <Route path="vark-summary" element={<VarkSummary />} />
          <Route path="assignments" element={<AssignmentManager />} />

          <Route path="student-enrolled" element={<StudentsEnrolled />} />
          <Route path="presensi" element={<Presensi />} />
        </Route>
      </Routes>
    </div>
  );
};

export default App;
