export const AdminIconButton = ({
  setShowSettings,
  showSettings,
}: {
  setShowSettings: (value: boolean) => void;
  showSettings: boolean;
}) => {
  return (
    <button
      type="button"
      className="btn btn-icon icon-with-rounded-border mb-4"
      aria-label={showSettings ? "Close admin settings" : "Open admin settings"}
      aria-expanded={showSettings}
      onClick={() => setShowSettings(showSettings)}
    >
      <img src={`https://sdk-style.s3.amazonaws.com/icons/${showSettings ? "arrow" : "cog"}.svg`} alt="" aria-hidden="true" />
    </button>
  );
};

export default AdminIconButton;
