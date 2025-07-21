// Timing constants for the WorkOS application

// Idle Warning System
export const IDLE_TIMEOUT = 5000; // 5 seconds - Time before showing idle warning
export const COUNTDOWN_DURATION = 10; // 10 seconds - Countdown before logout/next warning

// Loading System
export const LOADING_DURATION = 12000; // 12 seconds - Time for loading screen

// Cross-tab Synchronization
export const LOGOUT_BROADCAST_PRIORITY_WINDOW = 2000; // 2 seconds - Window to ignore auto-login after explicit logout
export const DEBOUNCE_RESET_STORE_WINDOW = 1000; // 1 second - Debounce window for resetStore calls
export const HEALTH_CHECK_INTERVAL = 3000; // 3 seconds - Interval for cross-tab health checks

// UI Timing
export const MODAL_ANIMATION_DELAY = 100; // 100ms - Small delay for modal animations
export const COMPONENT_MOUNT_DELAY = 50; // 50ms - Small delay for component mounting
