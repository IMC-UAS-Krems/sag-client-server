import { For } from "solid-js";
import { errors } from "@store/index.ts";
import styles from "@client/styles/RightSideBar.module.css";

export function RightSideBar() {
  return (
    <div class="flex-[1] m-0 bg-accent/50 p-2.5 border-1 border-accent-foreground/20" style={{ overflow: "auto" }}>
      {errors().length > 0 ? (
        <table style={{ width: "100%" }} class={styles["table"]}>
          <thead>
            <tr>
              <th class={styles["table-header"]}>Line</th>
              <th class={styles["table-header"]}>Column</th>
              <th class={styles["table-header"]}>Error</th>
            </tr>
          </thead>
          <tbody>
            <For each={errors()}>
              {(error, index) => (
                <tr>
                  <td class={styles["table-row"]}>{error.line_start}</td>
                  <td class={styles["table-row"]}>{error.column_start}</td>
                  <td class={styles["table-row-error"]}>{error.error}</td>
                </tr>
              )}
            </For>
          </tbody>
        </table>
      ) : (
        <p class={styles["no-errors"]}>No errors found!</p>
      )}
    </div>
  );
}
