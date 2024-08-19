import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Header from "./partials/Header";
import Home from "./pages/Home";
import Authenticate from "./authentication/Authenticate";
import Footer from "./partials/Footer";

export default function App() {
  return (
    <div>
      <Header />
      <Router>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/auth" element={<Authenticate />} />
        </Routes>
      </Router>
      <Footer />
    </div>
  );
}
