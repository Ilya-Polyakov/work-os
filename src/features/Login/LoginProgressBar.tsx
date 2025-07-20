const MESSAGES = {
  0: "Logging in...",
  10: "Remember to do your timesheets!",
  30: "Don't forget you are being monitored...",
  60: "A good employee is a happy employee.",
  100: "Success!",
};

const LoginProgressBar = ({ loadingProgress }: { loadingProgress: number }) => {
  // Find the appropriate message based on progress
  const getCurrentMessage = () => {
    const thresholds = Object.keys(MESSAGES)
      .map(Number)
      .sort((a, b) => b - a); // Sort descending to find highest threshold met

    for (const threshold of thresholds) {
      if (loadingProgress >= threshold) {
        return MESSAGES[threshold as keyof typeof MESSAGES];
      }
    }

    return MESSAGES[0]; // Fallback to first message
  };

  return (
    <div className="w-full">
      <div className="progress-indicator segmented mb-2">
        <span
          className="progress-indicator-bar"
          style={{ width: `${loadingProgress}%` }}
        />
      </div>
      <p className="text-center">{getCurrentMessage()}</p>
    </div>
  );
};

export default LoginProgressBar;
