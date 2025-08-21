import { Routes, Route } from "react-router-dom";
import LoginPage from "./pages/auth/LoginPage";
import WorkspacePage from "./pages/workspace/WorkspacePage";
import { ToastContainer } from "react-toastify";
import RoomsPage from "./pages/rooms/RoomsPage";



function App() {
  return (
    <>
      <ToastContainer />
      <Routes>
        <Route path="/" element={<LoginPage />} />
        <Route path="/join" element={<RoomsPage />} />
        <Route path="/workspace/:roomId" element={<WorkspacePage />} />
        {/* <Route path="/Signup" element={<SignupPage />} /> */}
      </Routes>
    </>
  );
}

export default App;
