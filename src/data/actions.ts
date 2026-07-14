import { db } from "./db";
import type { Action } from "../types";
import { sortByUrgencyThenDueDate } from "../utils/actionSort";

export type ActionInput = Omit<Action, "id" | "createdAt" | "updatedAt">;

export { sortByUrgencyThenDueDate };

export function listActionsForApartment(apartmentId: string): Promise<Action[]> {
  return db.actions.where("apartmentId").equals(apartmentId).toArray();
}

export function listActionsForEvent(eventId: string): Promise<Action[]> {
  return db.actions.where("eventId").equals(eventId).toArray();
}

export function getAction(id: string): Promise<Action | undefined> {
  return db.actions.get(id);
}

export async function createAction(input: ActionInput): Promise<Action> {
  const now = new Date().toISOString();
  const action: Action = {
    ...input,
    id: crypto.randomUUID(),
    createdAt: now,
    updatedAt: now,
  };
  await db.actions.add(action);
  return action;
}

export async function updateAction(id: string, patch: Partial<ActionInput>): Promise<void> {
  await db.actions.update(id, { ...patch, updatedAt: new Date().toISOString() });
}

export async function deleteAction(id: string): Promise<void> {
  await db.actions.delete(id);
}

/**
 * All unresolved actions across every apartment, sorted urgency desc / dueDate asc.
 * Runs as a single indexed query against the `status` index.
 */
export async function getUnresolvedActions(): Promise<Action[]> {
  const unresolved = await db.actions.where("status").equals("Unresolved").toArray();
  return sortByUrgencyThenDueDate(unresolved);
}

export async function countUnresolvedActionsForApartment(apartmentId: string): Promise<number> {
  return db.actions
    .where("apartmentId")
    .equals(apartmentId)
    .and((action) => action.status === "Unresolved")
    .count();
}

export async function listUnresolvedActionsForApartment(apartmentId: string): Promise<Action[]> {
  const actions = await db.actions
    .where("apartmentId")
    .equals(apartmentId)
    .and((action) => action.status === "Unresolved")
    .toArray();
  return sortByUrgencyThenDueDate(actions);
}
