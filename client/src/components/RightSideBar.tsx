import { For } from "solid-js";
import { errors } from "@store/index";

export function RightSideBar() {
  console.log(errors());
  return (
    <div class="right-column" style={{ overflow: "auto" }}>
      {errors().length > 0 ? (
        <table style={{ width: "100%" }} class="border-solid border-2 border-black">
          <thead class="">
            <tr>
              <th class="text-left text-lg border-solid border-2 border-black">Line</th>
              <th class="text-left text-lg border-solid border-2 border-black">Column</th>
              <th class="text-left text-lg border-solid border-2 border-black">Error</th>
            </tr>
          </thead>
          <tbody>
            <For each={errors()}>
              {(error, index) => (
                <tr>
                  <td class="text-center border-solid border-2 border-black">{error.line_start}</td>
                  <td class="text-center border-solid border-2 border-black">{error.column_start}</td>
                  <td class="border-spacing-2 border-solid border-2 border-black">{error.error}</td>
                </tr>
              )}
            </For>
          </tbody>
        </table>
      ) : (
        <p class="text-center">No errors found!</p>
      )}
    </div>
  );
}
