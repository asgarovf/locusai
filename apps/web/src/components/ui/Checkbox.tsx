import { Check } from "lucide-react";

interface CheckboxProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
  disabled?: boolean;
}

export function Checkbox({
  checked,
  onChange,
  label,
  disabled = false,
}: CheckboxProps) {
  return (
    <label
      className={`checkbox-container ${disabled ? "disabled" : ""}`}
      style={{ cursor: disabled ? "not-allowed" : "pointer" }}
    >
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        disabled={disabled}
        style={{ display: "none" }}
      />
      <span className={`checkbox-box ${checked ? "checked" : ""}`}>
        {checked && <Check size={12} strokeWidth={3} />}
      </span>
      {label && (
        <span className={`checkbox-label ${checked ? "checked" : ""}`}>
          {label}
        </span>
      )}

      <style>{`
        .checkbox-container {
          display: flex;
          align-items: center;
          gap: 0.625rem;
          user-select: none;
        }

        .checkbox-container.disabled {
          opacity: 0.5;
        }

        .checkbox-box {
          width: 18px;
          height: 18px;
          border-radius: 4px;
          border: 2px solid var(--border);
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.15s ease;
          flex-shrink: 0;
        }

        .checkbox-box:hover {
          border-color: var(--accent);
        }

        .checkbox-box.checked {
          background: var(--accent);
          border-color: var(--accent);
          color: #000;
        }

        .checkbox-label {
          font-size: 0.875rem;
          color: var(--text-main);
          transition: all 0.15s;
        }

        .checkbox-label.checked {
          text-decoration: line-through;
          color: var(--text-muted);
        }
      `}</style>
    </label>
  );
}
