import { useMemo } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import UnresolvedActionsPanel from "../components/UnresolvedActionsPanel";
import type { UnresolvedEntry } from "../components/UnresolvedActionsPanel";
import UpcomingVisitsPanel from "../components/UpcomingVisitsPanel";
import type { VisitEntry } from "../components/UpcomingVisitsPanel";
import NotesPanel from "../components/NotesPanel";
import RecentEventsPanel from "../components/RecentEventsPanel";
import type { RecentEventEntry } from "../components/RecentEventsPanel";
import DashboardFab from "../components/DashboardFab";
import { listApartments } from "../data/apartments";
import { getUnresolvedActions, updateAction } from "../data/actions";
import { listTasks } from "../data/tasks";
import { getUnresolvedTaskActions, updateTaskAction } from "../data/taskActions";
import { listRecentTimelineEvents } from "../data/timelineEvents";
import { listRecentTaskEvents } from "../data/taskEvents";
import { sortByUrgencyThenDueDate } from "../utils/actionSort";
import { isDateTimeOverdue } from "../utils/date";
import type { ActionStatus } from "../types";

const RECENT_EVENTS_FETCH_LIMIT = 20;

function Dashboard() {
  const apartments = useLiveQuery(() => listApartments(), []);
  const unresolvedActions = useLiveQuery(() => getUnresolvedActions(), []);
  const tasks = useLiveQuery(() => listTasks(), []);
  const unresolvedTaskActions = useLiveQuery(() => getUnresolvedTaskActions(), []);
  const recentTimelineEvents = useLiveQuery(
    () => listRecentTimelineEvents(RECENT_EVENTS_FETCH_LIMIT),
    [],
  );
  const recentTaskEvents = useLiveQuery(
    () => listRecentTaskEvents(RECENT_EVENTS_FETCH_LIMIT),
    [],
  );

  const apartmentTitleById = useMemo(
    () => new Map((apartments ?? []).map((a) => [a.id, a.title])),
    [apartments],
  );
  const taskTitleById = useMemo(
    () => new Map((tasks ?? []).map((t) => [t.id, t.title])),
    [tasks],
  );

  const entries = useMemo(() => {
    const apartmentEntries: UnresolvedEntry[] = (unresolvedActions ?? []).map((action) => ({
      kind: "apartment",
      id: action.id,
      description: action.description,
      dueDate: action.dueDate,
      urgency: action.urgency,
      status: action.status,
      entityTitle: apartmentTitleById.get(action.apartmentId) ?? "Unknown apartment",
      entityHref: `/apartments/${action.apartmentId}`,
    }));

    const taskEntries: UnresolvedEntry[] = (unresolvedTaskActions ?? []).map((action) => ({
      kind: "task",
      id: action.id,
      description: action.description,
      dueDate: action.dueDate,
      urgency: action.urgency,
      status: action.status,
      entityTitle: taskTitleById.get(action.taskId) ?? "Unknown task",
      entityHref: `/tasks/${action.taskId}`,
    }));

    return sortByUrgencyThenDueDate([...apartmentEntries, ...taskEntries]);
  }, [unresolvedActions, unresolvedTaskActions, apartmentTitleById, taskTitleById]);

  const visits = useMemo<VisitEntry[]>(() => {
    return (apartments ?? [])
      .filter((a) => a.status === "VisitScheduled" && a.visitDate)
      .map((a) => ({
        apartmentId: a.id,
        apartmentTitle: a.title,
        visitDate: a.visitDate as string,
        overdue: isDateTimeOverdue(a.visitDate as string),
      }))
      .sort((a, b) => a.visitDate.localeCompare(b.visitDate));
  }, [apartments]);

  const recentEvents = useMemo<RecentEventEntry[]>(() => {
    const apartmentEntries: RecentEventEntry[] = (recentTimelineEvents ?? []).map((event) => ({
      kind: "apartment",
      id: event.id,
      date: event.date,
      shortDescription: event.shortDescription,
      entityTitle: apartmentTitleById.get(event.apartmentId) ?? "Unknown apartment",
      entityHref: `/apartments/${event.apartmentId}`,
    }));

    const taskEntries: RecentEventEntry[] = (recentTaskEvents ?? []).map((event) => ({
      kind: "task",
      id: event.id,
      date: event.date,
      shortDescription: event.shortDescription,
      entityTitle: taskTitleById.get(event.taskId) ?? "Unknown task",
      entityHref: `/tasks/${event.taskId}`,
    }));

    return [...apartmentEntries, ...taskEntries]
      .sort((a, b) => b.date.localeCompare(a.date))
      .slice(0, RECENT_EVENTS_FETCH_LIMIT);
  }, [recentTimelineEvents, recentTaskEvents, apartmentTitleById, taskTitleById]);

  async function handleStatusChange(entry: UnresolvedEntry, status: ActionStatus) {
    if (entry.kind === "apartment") {
      await updateAction(entry.id, { status });
    } else {
      await updateTaskAction(entry.id, { status });
    }
  }

  return (
    <main className="dashboard page">
      <h1>Dashboard</h1>
      <div className="dashboard-grid">
        <div className="dashboard-column">
          <UnresolvedActionsPanel entries={entries} onStatusChange={handleStatusChange} />
          <NotesPanel />
        </div>
        <div className="dashboard-column">
          <UpcomingVisitsPanel visits={visits} />
          <RecentEventsPanel entries={recentEvents} />
        </div>
      </div>
      <DashboardFab />
    </main>
  );
}

export default Dashboard;
