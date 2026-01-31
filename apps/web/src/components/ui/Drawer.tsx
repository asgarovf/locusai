/**
 * Drawer Component
 *
 * A slide-out navigation drawer for mobile devices.
 * Features overlay, slide animations, and responsive behavior.
 * On desktop (lg+), the drawer is always visible and static.
 * On mobile, the drawer slides in from the left and can be closed.
 *
 * Features:
 * - Mobile-first drawer with overlay
 * - Smooth slide-in/out animations
 * - Click outside to close
 * - Escape key to close
 * - Body scroll lock when open
 * - Responsive: static on desktop, drawer on mobile
 * - Accessibility (ARIA attributes)
 *
 * @example
 * <Drawer open={isOpen} onClose={() => setIsOpen(false)}>
 *   <Sidebar />
 * </Drawer>
 */

"use client";

import { X } from "lucide-react";
import { type ReactNode, useEffect, useRef } from "react";

/**
 * Drawer component props
 *
 * @property open - Control drawer visibility (mobile only)
 * @property onClose - Callback when drawer should close
 * @property children - Drawer content
 */
interface DrawerProps {
  /** Whether drawer is open (mobile only) */
  open: boolean;
  /** Called when user attempts to close drawer */
  onClose: () => void;
  /** Drawer content */
  children: ReactNode;
}

export function Drawer({ open, onClose, children }: DrawerProps) {
  const overlayRef = useRef<HTMLDivElement>(null);

  // Handle escape key and body scroll lock
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };

    if (open) {
      document.addEventListener("keydown", handleEscape);
      // Only lock scroll on mobile
      if (window.innerWidth < 1024) {
        document.body.style.overflow = "hidden";
      }
    }

    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  return (
    <>
      {/* Overlay - visible only on mobile when drawer is open */}
      {open && (
        <div
          ref={overlayRef}
          className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40 lg:hidden animate-in fade-in duration-300"
          onClick={(e) => {
            if (e.target === overlayRef.current) onClose();
          }}
          role="presentation"
          aria-hidden="true"
        />
      )}

      {/* Drawer Container */}
      <div
        className={`
          fixed top-0 left-0 h-full w-[260px] bg-background z-50
          transform transition-transform duration-300 ease-in-out
          ${open ? "translate-x-0" : "-translate-x-full"}
          lg:translate-x-0 lg:static lg:w-auto lg:transform-none
        `}
        role="dialog"
        aria-modal={open ? "true" : undefined}
        aria-label="Navigation drawer"
      >
        {/* Close button - visible only on mobile */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 lg:hidden text-muted-foreground hover:text-foreground hover:bg-secondary/80 transition-all z-[60] p-2.5 rounded-xl bg-card/50 backdrop-blur-sm border border-border/30 shadow-sm"
          aria-label="Close navigation"
        >
          <X size={20} strokeWidth={2} />
        </button>

        {/* Drawer content */}
        {children}
      </div>
    </>
  );
}

/**
 * Drawer component
 *
 * A responsive navigation drawer that slides in from the left on mobile.
 * - On mobile: Controlled drawer with overlay and animations
 * - On desktop: Always visible, static sidebar
 * - Closes on Escape key
 * - Closes on overlay click
 * - Prevents body scroll when open (mobile only)
 * - Includes proper ARIA attributes
 *
 * @example
 * // Basic drawer
 * const [isOpen, setIsOpen] = useState(false);
 * <Drawer open={isOpen} onClose={() => setIsOpen(false)}>
 *   <Sidebar />
 * </Drawer>
 */
