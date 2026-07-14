import { useState } from "react";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import Dashboard from "./pages/Dashboard.tsx";
import Apartments from "./pages/Apartments.tsx";
import ApartmentDetail from "./pages/ApartmentDetail.tsx";
import Documents from "./pages/Documents.tsx";
import OptionsModal from "./components/OptionsModal.tsx";
import AppHeader from "./components/AppHeader.tsx";
import ImportExportBar from "./components/ImportExportBar.tsx";
import DocumentsMenuBar from "./components/DocumentsMenuBar.tsx";
import { VaultProvider } from "./documents/VaultProvider.tsx";

function AppShell() {
  const [optionsOpen, setOptionsOpen] = useState(false);
  const location = useLocation();

  const menu =
    location.pathname === "/apartments" ? (
      <ImportExportBar />
    ) : location.pathname === "/documents" ? (
      <DocumentsMenuBar />
    ) : null;

  return (
    <VaultProvider>
      <AppHeader onOpenSettings={() => setOptionsOpen(true)} menu={menu} />

      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/apartments" element={<Apartments />} />
        <Route path="/apartments/:id" element={<ApartmentDetail />} />
        <Route path="/documents" element={<Documents />} />
      </Routes>

      {optionsOpen && <OptionsModal onClose={() => setOptionsOpen(false)} />}
    </VaultProvider>
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
