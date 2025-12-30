import { AuthProvider, useAuth } from './contexts/AuthContext';
import MarketingDashboard from './components/MarketingDashboard';
import Login from './components/Login';

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
