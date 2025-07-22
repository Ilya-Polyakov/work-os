export const warningTitles = [
  "First Warning",
  "Second Warning",
  "Final Warning",
];

export const warningMessages = [
  (idleTimeout: number) =>
    `You have been idle for over ${idleTimeout / 1000} seconds.`,
  () => "Return to work immediately.",
  () => "There will be consequences.",
];

export const loggedOutCopy = {
  title: "Logged Out!",
  message:
    "You have been logged out due to inactivity. Report to your nearest supervisor for reprimanding.",
  buttonText: "OK",
};

export const userActiveCopy = {
  title: "Welcome back, Employee!",
  message: "Great, you're working again.",
  buttonText: "Continue",
};

export const defaultWarningCopy = {
  title: "Warning",
  message: "You have been idle.",
  buttonText: "Continue",
};
