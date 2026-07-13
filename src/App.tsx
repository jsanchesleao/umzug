import { useState } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Dashboard from "./pages/Dashboard.tsx";
import ApartmentDetail from "./pages/ApartmentDetail.tsx";
import OptionsModal from "./components/OptionsModal.tsx";

function App() {
  const [optionsOpen, setOptionsOpen] = useState(false);

  return (
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <button
        type="button"
        className="settings-button"
        aria-label="Options"
        onClick={() => setOptionsOpen(true)}
      >
        ⚙
      </button>

      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/apartments/:id" element={<ApartmentDetail />} />
      </Routes>

      {optionsOpen && <OptionsModal onClose={() => setOptionsOpen(false)} />}
    </BrowserRouter>
  );
}

export default App;
