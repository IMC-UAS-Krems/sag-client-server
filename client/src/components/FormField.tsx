import type { Component, Accessor, Setter } from "solid-js";

import { TextField } from "@kobalte/core";

import styles from "@styles/Signin.module.css";

const FormField: Component<{
  getter: Accessor<string | undefined>;
  setter: Setter<string | undefined>;
  labelText: string;
  options?: string[];
  password?: boolean;
  oldValue?: string | undefined;
}> = ({ getter, setter, labelText, options, password, oldValue }) => {
  return (
    <div class={styles["text-field"]}>
      <label class={styles["text-field-label"]}>{labelText}</label>
      {options ? (
        <select
          class={styles["text-field-input"]}
          value={getter() || ""}
          onChange={(e) => {
            setter(e.currentTarget.value);
          }}
          style={{ opacity: oldValue && !getter() ? 0.5 : 1 }}
        >
          <option value="" disabled hidden>
            {oldValue ? oldValue : "Select an option"}
          </option>
          {options.length === 0 ? (
            <option value="" disabled>
              No options available
            </option>
          ) : (
            options.map((option) => <option value={option}>{option}</option>)
          )}
        </select>
      ) : (
        <TextField.Root>
          <TextField.Input
            class={styles["text-field-input"]}
            type={password ? "password" : "text"}
            value={getter() || ""}
            onInput={(e) => setter(e.currentTarget.value)}
            placeholder={oldValue ? oldValue : ""}
          />
        </TextField.Root>
      )}
    </div>
  );
};

export default FormField;
