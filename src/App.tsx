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
      <ToastContainer
        position="top-center"
        autoClose={4000}
        hideProgressBar={false}
        newestOnTop={true}
        closeOnClick={true}
        rtl={false}
        pauseOnFocusLoss={false}
        draggable={true}
        pauseOnHover={false}
        theme="dark"
        className="custom-toast-container"
        limit={5}
        toastStyle={{
          background: "rgba(0, 0, 0, 0.85)",
          backdropFilter: "blur(20px)",
          border: "1px solid rgba(255, 165, 0, 0.3)",
          borderRadius: "12px",
          color: "#ffffff",
          fontFamily: "inherit",
          fontSize: "14px",
          boxShadow:
            "0 8px 32px 0 rgba(0, 0, 0, 0.37), 0 0 0 1px rgba(255, 165, 0, 0.1)",
          minHeight: "64px",
          padding: "16px",
        }}
      />
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
