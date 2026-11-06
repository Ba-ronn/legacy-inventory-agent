import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import AppShell from './components/AppShell';
import Onboarding from './pages/Onboarding';
import Chat from './pages/Chat';
import { useTheme } from './lib/useTheme';

function App() {
  const { theme, toggleTheme } = useTheme();

  return (
    <Router>
      <AppShell theme={theme} onToggleTheme={toggleTheme}>
        <Routes>
          <Route path="/" element={<Onboarding />} />
          <Route path="/chat" element={<Chat />} />
        </Routes>
      </AppShell>
    </Router>
  );
}

export default App;
