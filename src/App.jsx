import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { LessonsProvider } from './hooks/useLessons';
import BottomNav from './components/BottomNav';
import SearchPage from './pages/SearchPage';
import DiaryPage from './pages/DiaryPage';
import EditorPage from './pages/EditorPage';

export default function App() {
  return (
    <LessonsProvider>
      <BrowserRouter>
        <div className="min-h-screen bg-brand-bg">
          <Routes>
            <Route path="/" element={<SearchPage />} />
            <Route path="/diary" element={<DiaryPage />} />
            <Route path="/editor/:lessonId" element={<EditorPage />} />
          </Routes>
          <BottomNav />
        </div>
      </BrowserRouter>
    </LessonsProvider>
  );
}
