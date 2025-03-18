import { For } from "solid-js";
import { errors } from "@store/index.ts";
import styles from "@client/styles/RightSideBar.module.css";
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from "@client/components/ui/table.tsx";

export function RightSideBar() {
  return (
    <div class="flex-[1] m-0 bg-accent/50 p-2.5 border-1 border-accent-foreground/20" style={{ overflow: "auto" }}>
      {errors().length > 0 ? (
        <div class="border-2 rounded-md">
          <Table class="text-center">
            <TableHeader>
              <TableRow>
                <TableHead class="text-center font-semibold">Line</TableHead>
                <TableHead class="text-center font-semibold">Column</TableHead>
                <TableHead class="text-center font-semibold">Error</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <For each={errors()}>
                {(error, index) => (
                  <TableRow class={index() % 2 === 0 ? "bg-accent/40" : ""}>
                    <TableCell>{error.line_start}</TableCell>
                    <TableCell>{error.column_start}</TableCell>
                    <TableCell>{error.error}</TableCell>
                  </TableRow>
                )}
              </For>
            </TableBody>
          </Table>
        </div>
      ) : (
        <p class={styles["no-errors"]}>No errors found!</p>
      )}
    </div>
  );
}
