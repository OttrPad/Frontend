import { Routes, Route } from "react-router-dom";
import { useEffect } from "react";
import LoginPage from "./pages/auth/LoginPage";
import WorkspacePage from "./pages/workspace/WorkspacePage";
import { ToastContainer } from "react-toastify";
import RoomsPage from "./pages/rooms/RoomsPage";
import { useAppStore } from "./store/workspace";

function App() {
  const { theme } = useAppStore();

  // Apply theme class to document
  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove("light", "dark");
    root.classList.add(theme);
  }, [theme]);

  return (
    <>
      <ToastContainer />
      <Routes>
        <Route path="/" element={<LoginPage />} />
        <Route path="/join" element={<RoomsPage />} />
        <Route path="/workspace/:roomId" element={<WorkspacePage />} />
        <Route path="/room/:roomCode" element={<WorkspacePage />} />
        {/* <Route path="/Signup" element={<SignupPage />} /> */}
      </Routes>
    </>
  );
}

export default App;
