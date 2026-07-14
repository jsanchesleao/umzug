import { useLiveQuery } from "dexie-react-hooks";
import UnresolvedActionsPanel from "../components/UnresolvedActionsPanel";
import { listApartments } from "../data/apartments";
import { getUnresolvedActions } from "../data/actions";

function Dashboard() {
  const apartments = useLiveQuery(() => listApartments(), []);
  const unresolvedActions = useLiveQuery(() => getUnresolvedActions(), []);

  return (
    <main className="dashboard page">
      <h1>Dashboard</h1>

      <UnresolvedActionsPanel actions={unresolvedActions ?? []} apartments={apartments ?? []} />
    </main>
  );
}

export default Dashboard;
