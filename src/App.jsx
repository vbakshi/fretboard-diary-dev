import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import RequireAuth from './components/RequireAuth';
import { LessonsProvider } from './hooks/useLessons';
import BottomNav from './components/BottomNav';
import SearchPage from './pages/SearchPage';
import AuthPage from './pages/AuthPage';
import DiaryPage from './pages/DiaryPage';
import EditorPage from './pages/EditorPage';
import FeedPage from './pages/FeedPage';
import ProfilePage from './pages/ProfilePage';
import NotificationsPage from './pages/NotificationsPage';
import SharedLessonPage from './pages/SharedLessonPage';

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <LessonsProvider>
          <div className="min-h-screen bg-brand-bg">
            <Routes>
              <Route path="/" element={<SearchPage />} />
              <Route path="/auth" element={<AuthPage />} />
              <Route path="/lesson/:lessonId" element={<SharedLessonPage />} />
              <Route path="/profile/:username" element={<ProfilePage />} />
              <Route path="/editor/:lessonId" element={<EditorPage />} />
              <Route element={<RequireAuth />}>
                <Route path="/diary" element={<DiaryPage />} />
                <Route path="/feed" element={<FeedPage />} />
                <Route path="/notifications" element={<NotificationsPage />} />
              </Route>
            </Routes>
            <BottomNav />
          </div>
        </LessonsProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
