import React from 'react'
import { Route, Routes, useMatch } from 'react-router-dom'
import Home from './pages/student/Home'
import CourseList from './pages/student/CourseList'
import CourseDetail from './pages/student/CourseDetail'
import MyEnrollment from './pages/student/MyEnrollment'
import Player from './pages/student/Player'
import Loading from './components/student/Loading'
import VarkQuiz from './pages/student/VarkQuiz'
import NppInput from './pages/student/NppInput'
import Educator from './pages/educator/Educator'
import Dashboard from './pages/educator/Dashboard'
import AddCourse from './pages/educator/AddCourse'
import MyCourses from './pages/educator/MyCourses'
import StudentsEnrolled from './pages/educator/StudentsEnrolled'
import StudentEngagement from './pages/educator/StudentEngagement'
import Navbar from './components/student/Navbar'
import "quill/dist/quill.snow.css";
import { ToastContainer, toast } from 'react-toastify';

const App = () => {

  const isEducatorRoute = useMatch('/educator/*')

  return (
    <div className='text-default min-h-screen bg-white'>
      <ToastContainer/>
      {!isEducatorRoute && <Navbar />}
      
      <Routes>
        <Route path='/' element={<Home />}/>
        <Route path='/course-list' element={<CourseList />}/>
        <Route path='/course-list/:input' element={<CourseList />}/>
        <Route path='/course/:id' element={<CourseDetail />}/>
        <Route path='/my-enrollments' element={<MyEnrollment />}/>
        <Route path='/player/:courseId' element={<Player />}/>
        <Route path='/npp-input' element={<NppInput />}/>
        <Route path='/vark-quiz' element={<VarkQuiz />}/>
        <Route path='/loading/:path' element={<Loading />}/>
        <Route path='/student-engagement' element={<StudentEngagement />}/>
        <Route path='/educator' element={<Educator/>}>
          <Route index element={<Dashboard/>}/>
          <Route path='add-course' element={<AddCourse/>}/>
          <Route path='my-course' element={<MyCourses/>}/>
          <Route path='student-enrolled' element={<StudentsEnrolled/>}/>
          <Route path='student-engagement' element={<StudentEngagement/>}/>
        </Route>
      </Routes>
    </div>
  )
}

export default App