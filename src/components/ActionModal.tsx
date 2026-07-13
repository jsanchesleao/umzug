import Modal from "./Modal";
import ActionForm from "./ActionForm";
import { createAction, updateAction } from "../data/actions";
import type { Action } from "../types";
import { actionToFormValues, emptyActionFormValues } from "../utils/actionForm";

interface ActionModalProps {
  apartmentId: string;
  eventId: string | null;
  action?: Action;
  onClose: () => void;
}

function ActionModal({ apartmentId, eventId, action, onClose }: ActionModalProps) {
  const isEdit = Boolean(action);

  async function handleSubmit(patch: {
    description: string;
    dueDate: string;
    urgency: Action["urgency"];
    status: Action["status"];
  }) {
    if (action) {
      await updateAction(action.id, patch);
    } else {
      await createAction({ ...patch, apartmentId, eventId });
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

export default ActionModal;
