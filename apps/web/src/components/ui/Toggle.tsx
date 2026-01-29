"use client";

import { motion } from "framer-motion";

/**
 * Toggle component props
 *
 * @property checked - Whether toggle is on
 * @property onChange - Callback when toggle state changes
 * @property disabled - Disable toggle interaction
 */
interface ToggleProps {
  /** Whether toggle is currently on/checked */
  checked: boolean;
  /** Callback when toggle state changes */
  onChange: (checked: boolean) => void;
  /** Disable toggle */
  disabled?: boolean;
}

/**
 * Toggle component
 *
 * An accessible, animated toggle switch component.
 * Uses Framer Motion for smooth animations.
 *
 * @example
 * const [isEnabled, setIsEnabled] = useState(false);
 * <Toggle
 *   checked={isEnabled}
 *   onChange={setIsEnabled}
 * />
 *
 * @example
 * // Disabled toggle
 * <Toggle
 *   checked={true}
 *   onChange={handleChange}
 *   disabled={isLoading}
 * />
 */
export function Toggle({ checked, onChange, disabled }: ToggleProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={checked ? "Enabled" : "Disabled"}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 ${
        checked ? "bg-background" : "bg-secondary"
      } ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
    >
      <motion.span
        animate={{ x: checked ? 20 : 0 }}
        transition={{ type: "spring", stiffness: 500, damping: 30 }}
        className="pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0"
        aria-hidden="true"
      />
    </button>
  );
}
