import "./App.css";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import LoginPage from "./pages/auth/LoginPage";
import RoomsPage from "./pages/rooms/RoomsPage";

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<LoginPage />} />
        <Route path="/join" element={<RoomsPage />} />
      </Routes>
    </Router>
  );
}

export default App;
