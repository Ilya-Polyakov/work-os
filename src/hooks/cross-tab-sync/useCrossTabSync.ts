import { useTabId } from "./useTabId";
import { useLoadingSafetyCheck } from "./useLoadingSafetyCheck";
import { useControllerHealthCheck } from "./useControllerHealthCheck";
import { useStorageSync } from "./useStorageSync";
import { useUnloadControllerCleanup } from "./useUnloadControllerCleanup";
import { useSimulateLoading } from "./useSimulateLoading";

export const useCrossTabSync = () => {
  const tabId = useTabId();

  useLoadingSafetyCheck(tabId);
  useControllerHealthCheck(tabId);
  useStorageSync(tabId);
  useUnloadControllerCleanup(tabId);

  const simulateLoading = useSimulateLoading(tabId);

  return { simulateLoading, tabId };
};
