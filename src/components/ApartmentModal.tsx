import Modal from "./Modal";
import ApartmentForm from "./ApartmentForm";
import { createApartment, updateApartment } from "../data/apartments";
import type { Apartment } from "../types";
import { apartmentToFormValues, emptyApartmentFormValues } from "../utils/apartmentForm";
import type { ApartmentInput } from "../data/apartments";

interface ApartmentModalProps {
  apartment?: Apartment;
  onClose: () => void;
  onSaved?: (apartment: Apartment | ApartmentInput) => void;
}

function ApartmentModal({ apartment, onClose, onSaved }: ApartmentModalProps) {
  const isEdit = Boolean(apartment);

  async function handleSubmit(input: ApartmentInput) {
    if (apartment) {
      await updateApartment(apartment.id, input);
      onSaved?.(input);
    } else {
      const created = await createApartment(input);
      onSaved?.(created);
    }
    onClose();
  }

  return (
    <Modal title={isEdit ? "Edit Apartment" : "Add Apartment"} onClose={onClose}>
      <ApartmentForm
        initialValues={apartment ? apartmentToFormValues(apartment) : emptyApartmentFormValues()}
        submitLabel={isEdit ? "Save changes" : "Add apartment"}
        onSubmit={handleSubmit}
        onCancel={onClose}
      />
    </Modal>
  );
}

export default ApartmentModal;
