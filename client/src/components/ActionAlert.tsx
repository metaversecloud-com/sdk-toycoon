/**
 * Why a tap didn't work, pinned to the bottom of the drawer so it's seen even when the page is scrolled (the
 * page-level error line sits below the fold in the Topia drawer, so failed taps looked like they did nothing).
 */
export const ActionAlert = ({ message, onDismiss }: { message: string; onDismiss: () => void }) => {
  if (!message) return null;
  return (
    <div className="tc-alert" role="alert">
      <p className="tc-alert__text">{message}</p>
      <button type="button" className="tc-alert__close" aria-label="Dismiss message" onClick={onDismiss}>
        <span aria-hidden="true">✕</span>
      </button>
    </div>
  );
};

export default ActionAlert;
