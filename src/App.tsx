import { useState } from "react";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import Dashboard from "./pages/Dashboard.tsx";
import ApartmentDetail from "./pages/ApartmentDetail.tsx";
import OptionsModal from "./components/OptionsModal.tsx";
import AppHeader from "./components/AppHeader.tsx";
import ImportExportBar from "./components/ImportExportBar.tsx";

function AppShell() {
  const [optionsOpen, setOptionsOpen] = useState(false);
  const location = useLocation();

  return (
    <>
      <AppHeader
        onOpenSettings={() => setOptionsOpen(true)}
        menu={location.pathname === "/" ? <ImportExportBar /> : null}
      />

      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/apartments/:id" element={<ApartmentDetail />} />
      </Routes>

      {optionsOpen && <OptionsModal onClose={() => setOptionsOpen(false)} />}
    </>
  );
}

function App() {
  return (
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <AppShell />
    </BrowserRouter>
  );
}

export default App;
