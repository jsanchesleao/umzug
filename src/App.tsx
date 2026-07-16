import { useEffect, useState } from "react";
import { BrowserRouter, Routes, Route, useLocation, useSearchParams } from "react-router-dom";
import Dashboard from "./pages/Dashboard.tsx";
import Apartments from "./pages/Apartments.tsx";
import ApartmentDetail from "./pages/ApartmentDetail.tsx";
import Tasks from "./pages/Tasks.tsx";
import TaskDetail from "./pages/TaskDetail.tsx";
import Documents from "./pages/Documents.tsx";
import OptionsModal from "./components/OptionsModal.tsx";
import AppHeader from "./components/AppHeader.tsx";
import ImportExportBar from "./components/ImportExportBar.tsx";
import TasksImportExportBar from "./components/TasksImportExportBar.tsx";
import DocumentsMenuBar from "./components/DocumentsMenuBar.tsx";
import { VaultProvider } from "./documents/VaultProvider.tsx";

function AppShell() {
  const [optionsOpen, setOptionsOpen] = useState(false);
  const [initialBackupReceiveCode, setInitialBackupReceiveCode] = useState<string | undefined>(undefined);
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();

  // A scanned full-backup QR code deep-links back into the app with
  // ?p2pbackup=<code> regardless of which page is currently open, so it's
  // parsed here rather than by a single page's toolbar.
  useEffect(() => {
    const code = searchParams.get("p2pbackup");
    if (code) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- syncing to an external system (the URL) on mount, not deriving render state
      setInitialBackupReceiveCode(code);
      setOptionsOpen(true);
      setSearchParams((params) => {
        params.delete("p2pbackup");
        return params;
      }, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const menu =
    location.pathname === "/apartments" ? (
      <ImportExportBar />
    ) : location.pathname === "/tasks" ? (
      <TasksImportExportBar />
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
        <Route path="/tasks" element={<Tasks />} />
        <Route path="/tasks/:id" element={<TaskDetail />} />
        <Route path="/documents" element={<Documents />} />
      </Routes>

      {optionsOpen && (
        <OptionsModal
          initialBackupReceiveCode={initialBackupReceiveCode}
          onClose={() => {
            setOptionsOpen(false);
            setInitialBackupReceiveCode(undefined);
          }}
        />
      )}
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
