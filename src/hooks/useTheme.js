import { useEffect } from "react";
import { applyTheme } from "../config/themes";

/**
 * Hook to apply theme based on event theme value
 * @param {string} themeValue - The theme value from the event
 */
export function useTheme(themeValue) {
  useEffect(() => {
    if (themeValue) {
      applyTheme(themeValue);
    }
  }, [themeValue]);
}

export default useTheme;
