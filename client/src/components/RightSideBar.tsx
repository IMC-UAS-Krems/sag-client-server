import { For } from "solid-js";
import { errors } from "@store/index";

export function RightSideBar() {
  return (
    <div class="right-column" style={{ overflow: "auto" }}>
      {errors().length > 0 ? (
        <table style={{ width: "100%" }}>
          <thead>
            <tr>
              <th style="textAlign: left">Line</th>
              <th style="textAlign: left">Column</th>
              <th style="textAlign: left">Error</th>
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
      ) : (
        <p style="textAlign: center">No errors found!</p>
      )}
    </div>
  );
}
