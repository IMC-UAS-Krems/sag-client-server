import { For } from "solid-js";
import { errors } from "@store/index";

export function RightSideBar() {
  console.log(errors())
  return (
    <div class="right-column" style={{ overflow: "auto" }}>
      {errors().length > 0 ? (
        <table style={{ width: "100%" }} class='table-auto border-separate border border-slate-500'>
          <thead            class="border-b border-neutral-200 font-medium dark:border-white/10">
            <tr>
              <th class="text-left text-lg border-b-2 border-gray-800 border border-slate-500" >Line</th>
              <th class="text-left text-lg border-b-2 border-gray-800 border border-slate-500">Column</th>
              <th class="text-left text-lg border-b-2 border-gray-800 border border-slate-500">Error</th>
            </tr>
          </thead>
          <tbody>
          <For each={errors()}>
  {(error, index) => (
    <tr>
      <td  class="border border-slate-300">{error.line_start}</td>
      <td class="border border-slate-300">{error.column_start}</td>
      <td class="border border-slate-300">{error.error}</td>
    </tr>
  )}
</For>
          </tbody>
        </table>
      ) : (
        <p class='text-center'>No errors found!</p>
      )}
    </div>
  );
}


