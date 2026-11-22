import { lazy, Suspense } from 'react';
import { Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar.jsx';
import Footer from './components/Footer.jsx';
import LiteStrip from './components/LiteStrip.jsx';
import ChatbotPill from './components/ChatbotPill.jsx';
import AuthModal from './components/AuthModal.jsx';
import EditProfileModal from './components/EditProfileModal.jsx';
import { useAuth } from './context/AuthContext.jsx';
import Home from './pages/Home.jsx';
import Schemes from './pages/Schemes.jsx';
import ForYou from './pages/ForYou.jsx';
const About = lazy(() => import('./pages/About.jsx'));
const Admin = lazy(() => import('./pages/Admin.jsx'));

export default function App() {
  const { isAuthModalOpen, closeAuthModal } = useAuth();

  return (
    <div className="flex min-h-screen flex-col">
      <LiteStrip />
      <header className="px-4 pt-4 pb-2">
        <Navbar />
      </header>
      <main className="flex-1">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/schemes" element={<Schemes />} />
          <Route path="/for-you" element={<ForYou />} />
          <Route
            path="/about"
            element={
              <Suspense fallback={<div className="p-8 text-center">Loading...</div>}>
                <About />
              </Suspense>
            }
          />
          <Route
            path="/admin"
            element={
              <Suspense fallback={<div className="p-8 text-center">Loading...</div>}>
                <Admin />
              </Suspense>
            }
          />
        </Routes>
      </main>
      <Footer />
      <ChatbotPill />
      <AuthModal open={isAuthModalOpen} onClose={closeAuthModal} />
      <EditProfileModal />
    </div>
  );
}

