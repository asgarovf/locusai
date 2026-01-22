"use client";

import { $FixMe } from "@locusai/shared";
import { useState } from "react";

/**
 * Generic form state management hook.
 *
 * Simplifies managing multiple form fields with a single state object
 * and provides utilities for updating and resetting form state.
 *
 * @example
 * const form = useFormState({ email: "", name: "" });
 * <Input value={form.email} onChange={e => form.setField("email", e.target.value)} />
 * <Button onClick={() => form.reset()}>Clear</Button>
 */
export function useFormState<T extends Record<string, $FixMe>>(
  initialState: T
) {
  const [state, setState] = useState(initialState);

  const setField = (name: keyof T, value: T[keyof T]) => {
    setState((prev) => ({ ...prev, [name]: value }));
  };

  const reset = () => setState(initialState);

  const getFieldProps = (name: keyof T) => ({
    value: state[name],
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setField(name, e.target.value as T[keyof T]),
  });

  return {
    ...state,
    setField,
    reset,
    getFieldProps,
  };
}
