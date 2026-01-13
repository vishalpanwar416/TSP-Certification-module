import { AuthProvider, useAuth } from './contexts/AuthContext';
import MarketingDashboard from './pages/MarketingDashboard';
import Login from './pages/Login';

function AppContent() {
  const { user } = useAuth();

  return user ? <MarketingDashboard /> : <Login />;
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;
