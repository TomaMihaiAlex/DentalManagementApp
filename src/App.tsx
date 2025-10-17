// Using automatic JSX runtime
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { DataProvider } from './context/DataContext';
import AppLayout from './components/AppLayout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Doctori from './pages/Doctori';
import Comenzi from './pages/Comenzi';
import Produse from './pages/Produse';
import Tehnicieni from './pages/Tehnicieni';
import { Toaster } from 'react-hot-toast';

const PrivateRoute = ({ children }: { children: JSX.Element }) => {
  const { isAuthenticated } = useAuth();
  return isAuthenticated ? children : <Navigate to="/login" />;
};

const AppRoutes = () => {
  return (
    <Router>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route
          path="/*"
          element={
            <PrivateRoute>
              <AppLayout>
                <Routes>
                  <Route path="/" element={<Dashboard />} />
                  <Route path="/doctori" element={<Doctori />} />
                  <Route path="/comenzi" element={<Comenzi />} />
                  <Route path="/produse" element={<Produse />} />
                  <Route path="/tehnicieni" element={<Tehnicieni />} />
                </Routes>
              </AppLayout>
            </PrivateRoute>
          }
        />
      </Routes>
    </Router>
  );
};

const App = () => {
  return (
    <AuthProvider>
      <DataProvider>
        <Toaster
          position="top-center"
          reverseOrder={false}
          toastOptions={{
            // Default options for all toasts
            duration: 3000,
            style: {
              maxWidth: '90%',
            },
          }}
        />
        <AppRoutes />
      </DataProvider>
    </AuthProvider>
  );
};

export default App;
