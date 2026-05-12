import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Onboarding from './pages/Onboarding';
import Chat from './pages/Chat';

function App() {
  return (
    <Router>
      <div className="w-full h-screen bg-background">
        <Routes>
          <Route path="/" element={<Onboarding />} />
          <Route path="/chat" element={<Chat />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
