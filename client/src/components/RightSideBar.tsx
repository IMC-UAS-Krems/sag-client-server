import { For } from "solid-js";
import { errors } from "@store/index";

export function RightSideBar() {
  return (
    <div class="right-column" style={{ overflow: "auto" }}>
      <table style={{ width: "100%" }}>
        <thead>
          <tr>
            <th style="text-align: left">Line</th>
            <th style="text-align: left">Column</th>
            <th style="text-align: left">Error</th>
          </tr>
        </thead>
        <tbody>
          <For each={errors()}>
            {(error, index) => (
              <tr>
                <td>{error.line_start}</td>
                <td>{error.column_start}</td>
                <td>{error.error}</td>
              </tr>
            )}
          </For>
        </tbody>
      </table>
    </div>
  );
}
