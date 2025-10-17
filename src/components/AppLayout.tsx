import React, { useState, ReactNode } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { LayoutDashboard, Users, ShoppingCart, Package, HardHat, LogOut, Menu, X } from 'lucide-react';

const navItems = [
  { name: 'Dashboard', path: '/', icon: LayoutDashboard },
  { name: 'Doctori', path: '/doctori', icon: Users },
  { name: 'Comenzi', path: '/comenzi', icon: ShoppingCart },
  { name: 'Produse', path: '/produse', icon: Package },
  { name: 'Tehnicieni', path: '/tehnicieni', icon: HardHat },
];

interface AppLayoutProps {
  children: ReactNode;
}

const AppLayout: React.FC<AppLayoutProps> = ({ children }) => {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const [isMobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const NavLinks = () => (
    <>
      {navItems.map((item) => (
        <NavLink
          key={item.name}
          to={item.path}
          className={({ isActive }) =>
            `flex items-center px-4 py-2 text-sm font-medium rounded-md transition-colors ${
              isActive
                ? 'bg-sky-100 text-sky-600 dark:bg-sky-900/50 dark:text-sky-400'
                : 'text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800'
            }`
          }
          onClick={() => setMobileMenuOpen(false)}
        >
          <item.icon className="w-5 h-5 mr-3" />
          {item.name}
        </NavLink>
      ))}
    </>
  );

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-900">
      {/* Sidebar - Visible on large screens and up */}
      <aside className="hidden lg:flex flex-col w-64 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-center h-16 border-b dark:border-gray-700">
          <h1 className="text-xl font-bold text-sky-600 dark:text-sky-400">Dental Lab</h1>
        </div>
        <nav className="flex-1 p-4 space-y-2">
          <NavLinks />
        </nav>
        <div className="p-4 border-t dark:border-gray-700">
          <button
            onClick={handleLogout}
            className="flex items-center w-full px-4 py-2 text-sm font-medium text-gray-600 rounded-md hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700"
          >
            <LogOut className="w-5 h-5 mr-3" />
            Deconectare
          </button>
        </div>
      </aside>

      {/* Mobile Menu - Hidden on large screens and up */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-40 flex lg:hidden" role="dialog" aria-modal="true">
            <div className="fixed inset-0 bg-black/30" aria-hidden="true" onClick={() => setMobileMenuOpen(false)}></div>
            <div className="relative flex flex-col w-64 h-full max-w-xs bg-white dark:bg-gray-800">
                <div className="absolute top-0 right-0 p-1 -mr-14">
                    <button onClick={() => setMobileMenuOpen(false)} className="flex items-center justify-center w-12 h-12 rounded-full focus:outline-none focus:ring-2 focus:ring-inset focus:ring-white">
                        <X className="w-6 h-6 text-white" />
                    </button>
                </div>
                <div className="flex items-center justify-center h-16 border-b dark:border-gray-700">
                    <h1 className="text-xl font-bold text-sky-600 dark:text-sky-400">Dental Lab</h1>
                </div>
                <nav className="flex-1 p-4 space-y-2">
                    <NavLinks />
                </nav>
                <div className="p-4 border-t dark:border-gray-700">
                    <button onClick={handleLogout} className="flex items-center w-full px-4 py-2 text-sm font-medium text-gray-600 rounded-md hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700">
                        <LogOut className="w-5 h-5 mr-3" />
                        Deconectare
                    </button>
                </div>
            </div>
        </div>
      )}

      {/* Main content */}
      <div className="flex flex-col flex-1">
        <header className="flex items-center justify-between h-16 px-6 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 lg:justify-end">
          <button onClick={() => setMobileMenuOpen(true)} className="lg:hidden">
            <Menu className="w-6 h-6 text-gray-500 dark:text-gray-400" />
          </button>
          <div className="font-semibold text-gray-800 dark:text-white">Admin</div>
        </header>
        <main className="flex-1 p-4 overflow-y-auto lg:p-6">
          {children}
        </main>
      </div>
    </div>
  );
};

export default AppLayout;
