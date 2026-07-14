import Modal from "./Modal";
import ActionForm from "./ActionForm";
import { createTaskAction, updateTaskAction } from "../data/taskActions";
import type { TaskAction } from "../types";
import { actionToFormValues, emptyActionFormValues } from "../utils/actionForm";

interface TaskActionModalProps {
  taskId: string;
  eventId: string | null;
  action?: TaskAction;
  onClose: () => void;
}

function TaskActionModal({ taskId, eventId, action, onClose }: TaskActionModalProps) {
  const isEdit = Boolean(action);

  async function handleSubmit(patch: {
    description: string;
    dueDate: string;
    urgency: TaskAction["urgency"];
    status: TaskAction["status"];
  }) {
    if (action) {
      await updateTaskAction(action.id, patch);
    } else {
      await createTaskAction({ ...patch, taskId, eventId });
    }
    onClose();
  }

  return (
    <Modal title={isEdit ? "Edit Action" : "Add Action"} onClose={onClose}>
      <ActionForm
        initialValues={action ? actionToFormValues(action) : emptyActionFormValues()}
        submitLabel={isEdit ? "Save changes" : "Add action"}
        onSubmit={handleSubmit}
        onCancel={onClose}
      />
    </Modal>
  );
}

export default TaskActionModal;
