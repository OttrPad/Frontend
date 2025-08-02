import { Routes, Route } from "react-router-dom";
import LoginPage from "./pages/auth/LoginPage";
import { ToastContainer } from "react-toastify";
import Home from "./pages/Home";
// import SignupPage from "./pages/auth/LoginPage";
// import Home from "./pages/Home";

function App() {
  return (
    <>
      <ToastContainer />
      <Routes>
        <Route path="/" element={<LoginPage />} />
        <Route path="/Home" element={<Home />} />
        {/* <Route path="/Signup" element={<SignupPage />} /> */}
      </Routes>
    </>
  );
}

export default App;
