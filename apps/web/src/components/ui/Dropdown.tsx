import { ChevronDown } from "lucide-react";
import { type ReactNode, useEffect, useRef, useState } from "react";

interface DropdownOption<T extends string> {
  value: T;
  label: string;
  color?: string;
}

interface DropdownProps<T extends string> {
  value: T | undefined;
  onChange: (value: T) => void;
  options: DropdownOption<T>[];
  placeholder?: string;
  label?: string;
  disabled?: boolean;
  renderOption?: (option: DropdownOption<T>) => ReactNode;
}

export function Dropdown<T extends string>({
  value,
  onChange,
  options,
  placeholder = "Select...",
  label,
  disabled = false,
  renderOption,
}: DropdownProps<T>) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const selectedOption = options.find((o) => o.value === value);

  return (
    <div className="dropdown-container" ref={containerRef}>
      {label && <label className="dropdown-label">{label}</label>}
      <button
        type="button"
        className="dropdown-trigger"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
      >
        <span className={selectedOption ? "" : "placeholder"}>
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <ChevronDown
          size={16}
          style={{
            transform: isOpen ? "rotate(180deg)" : "rotate(0)",
            transition: "transform 0.2s",
          }}
        />
      </button>

      {isOpen && (
        <div className="dropdown-menu glass">
          {options.map((option) => (
            <button
              key={option.value}
              type="button"
              className={`dropdown-item ${option.value === value ? "selected" : ""}`}
              onClick={() => {
                onChange(option.value);
                setIsOpen(false);
              }}
            >
              {renderOption ? (
                renderOption(option)
              ) : (
                <>
                  {option.color && (
                    <span
                      className="dropdown-color-dot"
                      style={{ background: option.color }}
                    />
                  )}
                  {option.label}
                </>
              )}
            </button>
          ))}
        </div>
      )}

      <style>{`
        .dropdown-container {
          position: relative;
          width: 100%;
        }

        .dropdown-label {
          display: block;
          font-size: 0.75rem;
          font-weight: 500;
          color: var(--text-muted);
          margin-bottom: 0.5rem;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .dropdown-trigger {
          width: 100%;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 0.5rem;
          padding: 0.625rem 0.875rem;
          background: var(--glass-bg);
          border: 1px solid var(--border);
          border-radius: 8px;
          color: var(--text-main);
          font-size: 0.875rem;
          cursor: pointer;
          transition: all 0.2s;
        }

        .dropdown-trigger:hover:not(:disabled) {
          border-color: rgba(255, 255, 255, 0.15);
        }

        .dropdown-trigger:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .dropdown-trigger .placeholder {
          color: var(--text-muted);
        }

        .dropdown-menu {
          position: absolute;
          top: 100%;
          left: 0;
          right: 0;
          margin-top: 4px;
          background: var(--sidebar-bg);
          border-radius: 8px;
          padding: 0.375rem;
          z-index: 100;
          max-height: 240px;
          overflow-y: auto;
          animation: dropdownFadeIn 0.15s ease-out;
        }

        @keyframes dropdownFadeIn {
          from {
            opacity: 0;
            transform: translateY(-4px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .dropdown-item {
          width: 100%;
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.5rem 0.75rem;
          background: transparent;
          border: none;
          border-radius: 6px;
          color: var(--text-main);
          font-size: 0.875rem;
          cursor: pointer;
          transition: background 0.15s;
          text-align: left;
        }

        .dropdown-item:hover {
          background: rgba(255, 255, 255, 0.05);
        }

        .dropdown-item.selected {
          background: rgba(56, 189, 248, 0.1);
          color: var(--accent);
        }

        .dropdown-color-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          flex-shrink: 0;
        }
      `}</style>
    </div>
  );
}
