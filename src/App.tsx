import { BrowserRouter, Routes, Route } from "react-router-dom";
import Dashboard from "./pages/Dashboard.tsx";
import ApartmentDetail from "./pages/ApartmentDetail.tsx";

function App() {
  return (
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/apartments/:id" element={<ApartmentDetail />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
