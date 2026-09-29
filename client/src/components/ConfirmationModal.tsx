import { KeyboardEvent, useEffect, useId, useRef, useState } from "react";

export const ConfirmationModal = ({
  title,
  message,
  confirmLabel = "Yes",
  handleOnConfirm,
  handleToggleShowConfirmationModal,
}: {
  title: string;
  message: string;
  confirmLabel?: string;
  handleOnConfirm: () => void;
  handleToggleShowConfirmationModal: () => void;
}) => {
  const [areButtonsDisabled, setAreButtonsDisabled] = useState(false);
  const titleId = useId();
  const modalRef = useRef<HTMLDivElement>(null);
  const cancelButtonRef = useRef<HTMLButtonElement>(null);

  // Focus the safe option on open; return focus to whatever opened the modal on close
  useEffect(() => {
    const opener = document.activeElement as HTMLElement | null;
    cancelButtonRef.current?.focus();
    return () => opener?.focus();
  }, []);

  const onConfirm = () => {
    setAreButtonsDisabled(true);
    handleOnConfirm();
    handleToggleShowConfirmationModal();
  };

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Escape") {
      handleToggleShowConfirmationModal();
      return;
    }

    // Keep Tab cycling within the modal
    if (event.key !== "Tab") return;
    const focusable = modalRef.current?.querySelectorAll<HTMLElement>("button:not([disabled])");
    if (!focusable?.length) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  };

  return (
    <div
      className="modal-container"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      onClick={handleToggleShowConfirmationModal}
      onKeyDown={onKeyDown}
    >
      <div className="modal" ref={modalRef} onClick={(event) => event.stopPropagation()}>
        <h4 className="h4" id={titleId}>
          {title}
        </h4>
        <p className="p2">{message}</p>
        <div className="actions">
          <button
            ref={cancelButtonRef}
            type="button"
            className="btn btn-outline"
            onClick={handleToggleShowConfirmationModal}
            disabled={areButtonsDisabled}
          >
            Cancel
          </button>
          <button type="button" className="btn btn-danger-outline" onClick={onConfirm} disabled={areButtonsDisabled}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmationModal;
