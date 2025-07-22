import { useRef } from "react";

export const useTabId = () => {
  return useRef(`${Date.now()}-${Math.random().toString(36).substring(7)}`).current;
};