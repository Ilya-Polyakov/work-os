const LoginProgressBar = ({ loadingProgress }: { loadingProgress: number }) => {
  return (
    <div className="w-full">
      <div className="progress-indicator segmented mb-2">
        <span
          className="progress-indicator-bar"
          style={{ width: `${loadingProgress}%` }}
        />
      </div>
      <p className="text-center">Logging in...</p>
    </div>
  );
};

export default LoginProgressBar;
