import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { LogOut, User } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function AuthButton() {
  const { user, role, logout, openAuthModal } = useAuth();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const wrapperRef = useRef(null);

  useEffect(() => {
    if (!menuOpen) return undefined;
    const handlePointer = (e) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setMenuOpen(false);
      }
    };
    const handleKey = (e) => {
      if (e.key === 'Escape') setMenuOpen(false);
    };
    document.addEventListener('mousedown', handlePointer);
    document.addEventListener('touchstart', handlePointer);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handlePointer);
      document.removeEventListener('touchstart', handlePointer);
      document.removeEventListener('keydown', handleKey);
    };
  }, [menuOpen]);

  if (!user) {
    return (
      <button
        type="button"
        onClick={() => openAuthModal()}
        className="rounded-full bg-[#111827] px-4 py-1.5 text-sm font-medium text-white hover:bg-stone-800"
      >
        Sign In
      </button>
    );
  }

  const isAdmin = role === 'admin';
  const badgeBase = 'shrink-0 text-[10px] rounded-full px-2 py-0.5 font-semibold';
  const badgeClass = isAdmin
    ? `${badgeBase} bg-[#D97706]/15 text-amber-800`
    : `${badgeBase} bg-emerald-600/10 text-emerald-700`;
  const itemClass =
    'block w-full rounded-xl px-3 py-2.5 text-left text-sm text-[#111827] hover:bg-stone-100';

  return (
    <div ref={wrapperRef} className="relative">
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={menuOpen}
        onClick={() => setMenuOpen((v) => !v)}
        className="flex max-w-[16rem] items-center gap-2 rounded-full border border-stone-200 bg-white py-1 pl-1 pr-3 text-sm hover:bg-stone-50"
      >
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-stone-200 bg-[#F9F8F4] text-[#111827]">
          <User size={14} aria-hidden="true" />
        </span>
        <span className="min-w-0 truncate font-medium text-[#111827]">{user.name}</span>
        <span className={badgeClass}>{isAdmin ? 'Admin' : 'Student'}</span>
      </button>

      {menuOpen && (
        <div
          role="menu"
          className="absolute right-0 top-full z-50 mt-2 w-56 rounded-2xl border border-stone-200 bg-white p-2 shadow-xl"
        >
          <Link
            to="/for-you"
            role="menuitem"
            onClick={() => setMenuOpen(false)}
            className={itemClass}
          >
            My Profile / For You
          </Link>
          {isAdmin && (
            <Link
              to="/admin"
              role="menuitem"
              onClick={() => setMenuOpen(false)}
              className={itemClass}
            >
              Admin Panel
            </Link>
          )}
          {!isAdmin && (
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setMenuOpen(false);
                window.dispatchEvent(new Event('sahayak:open-edit-profile'));
              }}
              className={itemClass}
            >
              Edit Profile
            </button>
          )}
          <div className="my-1 h-px bg-stone-200" />
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setMenuOpen(false);
              navigate('/', { replace: true });
              logout();
            }}
            className="flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-left text-sm font-medium text-red-600 hover:bg-red-50"
          >
            <LogOut size={16} aria-hidden="true" />
            Log Out
          </button>
        </div>
      )}
    </div>
  );

}
