interface WindowProps {
  titleBarContent: React.ReactNode;
  windowContent: React.ReactNode;
  onClose?: () => void;
}

const Window = ({ titleBarContent, windowContent, onClose }: WindowProps) => {
  return (
    <div className="zoom-wrapper">
      <div className="window w-[225px] xs:w-[240px] sm:w-[300px] md:w-[360px]">
        <div className="title-bar">
          <div className="title-bar-text flex items-center gap-1">
            {titleBarContent}
          </div>
          {!!onClose && (
            <div className="title-bar-controls">
              <button onClick={onClose} aria-label="Close"></button>
            </div>
          )}
        </div>
        <div className="window-body">{windowContent}</div>
      </div>
    </div>
  );
};

export default Window;
