import Modal from "./Modal";
import TaskForm from "./TaskForm";
import { createTask, updateTask } from "../data/tasks";
import type { Task } from "../types";
import { taskToFormValues, emptyTaskFormValues } from "../utils/taskForm";
import type { TaskInput } from "../data/tasks";

interface TaskModalProps {
  task?: Task;
  onClose: () => void;
  onSaved?: (task: Task | TaskInput) => void;
}

function TaskModal({ task, onClose, onSaved }: TaskModalProps) {
  const isEdit = Boolean(task);

  async function handleSubmit(input: TaskInput) {
    if (task) {
      await updateTask(task.id, input);
      onSaved?.(input);
    } else {
      const created = await createTask(input);
      onSaved?.(created);
    }
    onClose();
  }

  return (
    <Modal title={isEdit ? "Edit Task" : "Add Task"} onClose={onClose}>
      <TaskForm
        initialValues={task ? taskToFormValues(task) : emptyTaskFormValues()}
        submitLabel={isEdit ? "Save changes" : "Add task"}
        onSubmit={handleSubmit}
        onCancel={onClose}
      />
    </Modal>
  );
}

export default TaskModal;
