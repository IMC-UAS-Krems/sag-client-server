import { createSignal, onMount, Component, For } from "solid-js";

import {
  FaSolidEllipsis,
  FaSolidArrowDownAZ,
  FaSolidArrowUpAZ,
  FaSolidArrowUp19,
  FaSolidArrowDown19,
  FaSolidSortUp,
  FaSolidSortDown,
} from "solid-icons/fa";
import { IoAlertCircleOutline } from "solid-icons/io";
// import { DropdownMenu } from "@kobalte/core/dropdown-menu";
import { useNavigate } from "@solidjs/router";
import {
  createColumnHelper,
  createSolidTable,
  getCoreRowModel,
  flexRender,
  getPaginationRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  Table as TableType,
  PaginationState,
  Row,
  ColumnFiltersState,
} from "@tanstack/solid-table";
import Swal from "sweetalert2";

import {
  Pagination,
  PaginationEllipsis,
  PaginationItem,
  PaginationItems,
  PaginationNext,
  PaginationPrevious,
} from "@client/components/ui/pagination.tsx";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@client/components/ui/dropdown-menu.tsx";
import {
  NumberField,
  NumberFieldDecrementTrigger,
  NumberFieldGroup,
  NumberFieldIncrementTrigger,
  NumberFieldInput,
} from "@client/components/ui/number-field.tsx";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@client/components/ui/card.tsx";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@client/components/ui/table.tsx";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@client/components/ui/select.tsx";
import { Alert, AlertDescription, AlertTitle } from "@client/components/ui/alert.tsx";
import { TextField, TextFieldInput } from "@client/components/ui/textField.tsx";
import { Skeleton } from "@client/components/ui/skeleton.tsx";
import { Button } from "@client/components/ui/button.tsx";
import OrganisationCreateDialog from "@client/components/OrganisationCreateDialog.tsx";
import { eden } from "@client/api/index.ts";
import { handleUnauthorized } from "@client/utils/authUtils.ts";
import styles from "@styles/Organisations.module.css";
import { OrganisationDetails } from "@server/types.ts";
import { theme } from "@client/store/index.ts";
import Header from "@client/components/Header.tsx";
import { showToast } from "@client/components/ui/toast.tsx";

const Organisations: Component = () => {
  const navigate = useNavigate();

  const [error, setError] = createSignal<string | null>(null);
  const [loading, setLoading] = createSignal(true);

  const [organisations, setOrganisations] = createSignal<OrganisationDetails[]>([]);

  onMount(async () => {
    await fetchOrganisations();
  });

  async function fetchOrganisations() {
    setLoading(true);
    try {
      const fetchedOrganisations = await eden.admin.organisations.get({
        $fetch: {
          mode: "cors",
          credentials: "include",
          method: "GET",
        },
      });

      // Unauthorized check
      if (fetchedOrganisations.status === 401 || fetchedOrganisations.status === 403) {
        handleUnauthorized(navigate);
        return;
      }

      if (fetchedOrganisations.data) {
        if (fetchedOrganisations.status !== 200) {
          if (!Array.isArray(fetchedOrganisations.data) && "error" in fetchedOrganisations.data) {
            setError(fetchedOrganisations.data.error || "Unknown error");
          } else {
            throw new Error("Failed to fetch organisations, data is not correct form");
          }
        } else {
          if (Array.isArray(fetchedOrganisations.data)) {
            setOrganisations(fetchedOrganisations.data);
          } else {
            throw new Error("Failed to fetch organisations, data is not an array");
          }
        }
      } else {
        throw new Error("Failed to fetch organisations, data is null");
      }
    } catch (error) {
      setError("Failed to fetch organisations");
      console.error("Failed to fetch organisations:", error);
    } finally {
      setLoading(false);
    }
  }

  async function handleEditOrganisation(organisationId: string) {
    navigate(`/organisations/edit/${organisationId}`);
  }

  async function handleDeleteOrganisation(organisationId: string) {
    const organisation = organisations().find((organisation) => organisation.id === organisationId);

    // Check if organisation has users
    if (organisation && organisation.users.length > 0) {
      Swal.fire({
        title: "Error",
        text: `Couldn't delete the organisation because it has users associated with it: ${organisation.users.map((user) => user.name).join(", ")}`,
        icon: "error",
      });
      return;
    }

    Swal.fire({
      title: "Are you sure?",
      text: "You won't be able to revert this!",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#3085d6",
      cancelButtonColor: "#d33",
      confirmButtonText: "Yes, delete it!",
    }).then(async (result) => {
      if (result.isConfirmed) {
        try {
          const deletedOrganisation = await eden.admin["delete-organisation"].delete({
            organisationId: organisationId,
            $fetch: {
              mode: "cors",
              credentials: "include",
              method: "DELETE",
            },
          });

          // Unauthorized check
          if (deletedOrganisation.status === 401 || deletedOrganisation.status === 403) {
            console.log("User is not authorized for this request:", deletedOrganisation);
            handleUnauthorized(navigate);
            return;
          }

          if (!deletedOrganisation.data || deletedOrganisation.error) {
            console.log("Failed to delete organsiation:", deletedOrganisation.error);
            Swal.fire({
              title: "Error",
              text: "Couldn't delete the organsiation",
              icon: "error",
            });
            return;
          } else {
            Swal.fire("Deleted!", "The organsiation has been deleted.", "success");
            setOrganisations((prevOrganisations) =>
              prevOrganisations.filter((organisation) => organisation.id !== organisationId),
            );
          }
        } catch (error) {
          console.error("Failed to delete organisation:", error);
          Swal.fire({
            title: "Error",
            text: "Couldn't delete the organisation",
            icon: "error",
          });
        }
      }
    });
  }

  const dateFilterFn = (row: Row<OrganisationDetails>, columnId: string, filterValue: string) => {
    const rowValue = row.getValue(columnId) as Date;
    if (!rowValue) return false;

    const filterDate = new Date(filterValue);
    const rowDate = new Date(rowValue);

    return rowDate.getDate() == filterDate.getDate();
  };

  const rangeFilterFn = (
    row: Row<OrganisationDetails>,
    columnId: string,
    filterValue: { min: number; max: number },
  ) => {
    const rowValue = row.getValue(columnId) as number;
    if (rowValue === undefined || rowValue === null) return false;

    const { min, max } = filterValue;
    if (min === 0 && max === 0) return true;
    return rowValue >= min && rowValue <= max;
  };

  type RangeFilterValue = { min: number; max: number };
  const getRangeFilterValue = (filterValue: unknown): RangeFilterValue => {
    if (typeof filterValue === "object" && filterValue !== null && "min" in filterValue && "max" in filterValue) {
      return filterValue as RangeFilterValue;
    }
    return { min: 0, max: 0 };
  };

  // TanStack Solid Table - Column Definitions
  const columnHelper = createColumnHelper<OrganisationDetails>();
  const columns = [
    columnHelper.accessor("name", { header: "Name" }),
    columnHelper.accessor((row) => row.municipality.name, { id: "municipality", header: "Municipality" }),
    columnHelper.accessor((row) => row.users.length, {
      id: "usersCount",
      header: "Number of Members",
      filterFn: rangeFilterFn,
    }),
    columnHelper.accessor((row) => new Date(row.createdAt), {
      header: "Created At",
      id: "createdAt",
      cell: (props) => props.getValue().toLocaleDateString(),
      filterFn: dateFilterFn,
    }),
    columnHelper.accessor((row) => (row.updatedAt ? new Date(row.updatedAt) : ""), {
      header: "Updated At",
      id: "updatedAt",
      cell: (props) => {
        const value = props.getValue();
        return value ? value.toLocaleDateString() : "";
      },
      filterFn: dateFilterFn,
    }),
    columnHelper.accessor((row) => (row.verified ? "✅" : "❌"), {
      header: "Verified",
      id: "verified",
      enableSorting: false,
      // filterFn: (row, columnId, filterValue) => {
      //   const rowValue = row.getValue(columnId);
      //   return rowValue === (filterValue === "✅");
      // },
    }),
    columnHelper.display({
      id: "actions",
      header: "Actions",
      cell: (props) => (
        <div class="p-2">
          <DropdownMenu>
            <DropdownMenuTrigger
              class="h-full w-full hover:bg-accent rounded-md cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-0"
              aria-haspopup="menu"
              aria-expanded={false}
              aria-hidden
            >
              <div class="h-full w-full flex items-center justify-center p-2">
                <FaSolidEllipsis class="h-5 w-5" />
              </div>
            </DropdownMenuTrigger>
            <DropdownMenuContent role="menu">
              <DropdownMenuLabel role="presentation">{props.row.original.name}</DropdownMenuLabel>
              <DropdownMenuSeparator role="separator" />
              <DropdownMenuItem onClick={() => handleEditOrganisation(props.row.original.id)} role="menuitem">
                ✏️ Edit
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleDeleteOrganisation(props.row.original.id)} role="menuitem">
                🗑️ Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      ),
    }),
  ];

  const [pagination, setPagination] = createSignal<PaginationState>({
    pageIndex: 0,
    pageSize: 5,
  });
  const [columnFilters, setColumnFilters] = createSignal<ColumnFiltersState>([]);
  const [sorting, setSorting] = createSignal([]);

  const resetPagination = () => {
    setPagination((prev) => ({ ...prev, pageIndex: 0 }));
  };

  // TanStack Solid Table - Table
  const table: TableType<OrganisationDetails> = createSolidTable({
    get data() {
      return organisations();
    },
    columns,
    state: {
      get pagination() {
        return pagination();
      },
      get columnFilters() {
        return columnFilters();
      },
      get sorting() {
        return sorting();
      },
    },
    onPaginationChange: setPagination,
    onSortingChange: setSorting,
    onColumnFiltersChange: (filters) => {
      setColumnFilters(filters);
      resetPagination();
    },
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    autoResetPageIndex: false,
  });

  // Function to get unique values for the filter dropdown
  const getUniqueValues = (data: OrganisationDetails[], columnId: string) => {
    const uniqueValues = new Set();
    data.forEach((row) => {
      let value;
      if (columnId === "municipality") {
        value = row.municipality.name;
      } else {
        value = row[columnId as keyof OrganisationDetails];
      }
      uniqueValues.add(value);
    });
    return Array.from(uniqueValues);
  };

  const getSortingIcons = (columnId: string) => {
    if (["name", "municipality"].includes(columnId)) {
      return {
        asc: <FaSolidArrowDownAZ />,
        desc: <FaSolidArrowUpAZ />,
      };
    } else if ("usersCount" === columnId) {
      return {
        asc: <FaSolidArrowDown19 />,
        desc: <FaSolidArrowUp19 />,
      };
    } else if (["createdAt", "updatedAt", "verified"].includes(columnId)) {
      return {
        asc: <FaSolidSortUp />,
        desc: <FaSolidSortDown />,
      };
    } else {
      return {};
    }
  };

  return (
    <Header>
      <main class={styles["organisations-main"]}>
        <Card class="w-fit my-8">
          <CardHeader>
            <CardTitle>Organisations Admin Area</CardTitle>
            <CardDescription>Here you may manage organisations, create, edit and delete them.</CardDescription>
          </CardHeader>
          <CardContent>
            {loading() ? (
              <div class="h-80 w-289">
                <Skeleton class="h-full! w-full! rounded-md" />
              </div>
            ) : error() ? (
              <Alert variant="destructive">
                <IoAlertCircleOutline class="h-5 w-5" />
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>{error()}</AlertDescription>
                <AlertDescription>Plesase try again later, or contact us if the problem persists.</AlertDescription>
              </Alert>
            ) : (
              table && (
                <>
                  <div class="w-full flex gap-4">
                    <OrganisationCreateDialog fetchOrganisations={fetchOrganisations} />
                    <div class="flex justify-center items-center gap-2.5">
                      <span>Page size: </span>
                      <Select
                        value={table?.getState().pagination.pageSize}
                        onChange={(value) => table.setPageSize(Number(value))}
                        options={[5, 10, 20, 40]}
                        itemComponent={(props) => <SelectItem item={props.item}>{props.item.rawValue}</SelectItem>}
                        disallowEmptySelection
                      >
                        <SelectTrigger aria-label="Page size" class="font-semibold">
                          <SelectValue<string>>{(state) => state.selectedOption()}</SelectValue>
                        </SelectTrigger>
                        <SelectContent />
                      </Select>
                    </div>
                  </div>
                  <div class="border rounded-md my-4">
                    <Table>
                      <TableHeader>
                        <For each={table.getHeaderGroups()}>
                          {(headerGroup) => (
                            <>
                              <TableRow>
                                <For each={headerGroup.headers}>
                                  {(header) => (
                                    <TableHead class="p-5 font-semibold">
                                      {header.column.getCanSort() ? (
                                        <div
                                          class={styles.sortable}
                                          onClick={header.column.getToggleSortingHandler()}
                                          title={
                                            header.column.getCanSort()
                                              ? header.column.getNextSortingOrder() === "asc"
                                                ? "Sort ascending"
                                                : header.column.getNextSortingOrder() === "desc"
                                                  ? "Sort descending"
                                                  : "Clear sort"
                                              : undefined
                                          }
                                        >
                                          {header.isPlaceholder
                                            ? null
                                            : flexRender(header.column.columnDef.header, header.getContext())}
                                          {(() => {
                                            const sortedState = header.column.getIsSorted();
                                            if (typeof sortedState === "string") {
                                              return getSortingIcons(header.column.id)[sortedState] ?? null;
                                            }
                                            return null;
                                          })()}
                                        </div>
                                      ) : header.isPlaceholder ? null : (
                                        flexRender(header.column.columnDef.header, header.getContext())
                                      )}
                                    </TableHead>
                                  )}
                                </For>
                              </TableRow>
                              <TableRow>
                                <For each={headerGroup.headers}>
                                  {(header) => (
                                    <TableHead class={styles["filter-row"]}>
                                      {header.column.id === "name" && (
                                        // <input
                                        //   value={(header.column.getFilterValue() as string) ?? ""}
                                        //   onChange={(e) => header.column.setFilterValue(e.currentTarget.value)}
                                        //   placeholder={`Search`}
                                        // />
                                        <TextField>
                                          <TextFieldInput
                                            value={(header.column.getFilterValue() as string) ?? ""}
                                            onInput={(e) => header.column.setFilterValue(e.currentTarget.value)}
                                            placeholder={`Search`}
                                            class="border-0"
                                          />
                                        </TextField>
                                      )}
                                      {header.column.id === "municipality" && (
                                        // <select
                                        //   value={(header.column.getFilterValue() as string) ?? ""}
                                        //   onChange={(e) => header.column.setFilterValue(e.currentTarget.value)}
                                        // >
                                        //   <option value="">All</option>
                                        //   <For each={getUniqueValues(organisations(), header.column.id)}>
                                        //     {(value) => <option value={value as string}>{value as string}</option>}
                                        //   </For>
                                        // </select>
                                        <Select
                                          value={(header.column.getFilterValue() as string) ?? ""}
                                          onChange={header.column.setFilterValue}
                                          options={getUniqueValues(organisations(), header.column.id)}
                                          itemComponent={(props) => (
                                            <SelectItem item={props.item}>{props.item.rawValue}</SelectItem>
                                          )}
                                        >
                                          <SelectTrigger aria-label="filter municipality">
                                            <SelectValue<string>>{(state) => state.selectedOption()}</SelectValue>
                                          </SelectTrigger>
                                          <SelectContent />
                                        </Select>
                                      )}
                                      {header.column.id === "usersCount" && (
                                        <div>
                                          <NumberField
                                            class="max-w-20"
                                            minValue={0}
                                            maxValue={100}
                                            value={getRangeFilterValue(header.column.getFilterValue()).min || ""}
                                            onChange={(value) => {
                                              const filterValue = getRangeFilterValue(header.column.getFilterValue());
                                              const minValue = Number(value);
                                              if (filterValue.max < minValue) {
                                                header.column.setFilterValue({
                                                  min: minValue,
                                                  max: minValue,
                                                });
                                              } else {
                                                header.column.setFilterValue({ min: minValue, max: filterValue.max });
                                              }
                                            }}
                                          >
                                            <NumberFieldGroup>
                                              <NumberFieldInput class="border-0" placeholder="Min" />
                                              <NumberFieldIncrementTrigger />
                                              <NumberFieldDecrementTrigger />
                                            </NumberFieldGroup>
                                          </NumberField>
                                          <NumberField
                                            class="max-w-20"
                                            minValue={0}
                                            maxValue={100}
                                            value={getRangeFilterValue(header.column.getFilterValue()).max || ""}
                                            onChange={(value) => {
                                              const filterValue = getRangeFilterValue(header.column.getFilterValue());
                                              const maxValue = Number(value);
                                              if (filterValue.min > maxValue) {
                                                header.column.setFilterValue({
                                                  min: maxValue,
                                                  max: maxValue,
                                                });
                                              } else {
                                                header.column.setFilterValue({ min: filterValue.min, max: maxValue });
                                              }
                                            }}
                                          >
                                            <NumberFieldGroup>
                                              <NumberFieldInput class="border-0" placeholder="Max" />
                                              <NumberFieldIncrementTrigger />
                                              <NumberFieldDecrementTrigger />
                                            </NumberFieldGroup>
                                          </NumberField>
                                        </div>
                                      )}
                                      {(header.column.id === "createdAt" || header.column.id === "updatedAt") && (
                                        // TODO: Styling of default date pickers is pretty inconsistent and only light mode
                                        <input
                                          type="date"
                                          style={theme() === "dark" ? "color-scheme: dark;" : ""}
                                          value={(header.column.getFilterValue() as string) ?? ""}
                                          onChange={(e) => header.column.setFilterValue(e.currentTarget.value)}
                                        />
                                      )}
                                      {header.column.id === "verified" && (
                                        <select
                                          value={(header.column.getFilterValue() as string) ?? ""}
                                          onChange={(e) => header.column.setFilterValue(e.currentTarget.value)}
                                        >
                                          <option value="">All</option>
                                          <option value="✅">Verified</option>
                                          <option value="❌">Unverified</option>
                                        </select>
                                      )}
                                    </TableHead>
                                  )}
                                </For>
                              </TableRow>
                            </>
                          )}
                        </For>
                      </TableHeader>
                      <TableBody>
                        <For each={table.getRowModel().rows}>
                          {(row, index) => (
                            <TableRow class={index() % 2 === 0 ? "bg-accent/40" : ""}>
                              <For each={row.getVisibleCells()}>
                                {(cell) => (
                                  <TableCell class={cell.column.id === "actions" ? styles["actions-column"] : ""}>
                                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                  </TableCell>
                                )}
                              </For>
                            </TableRow>
                          )}
                        </For>
                      </TableBody>
                    </Table>
                  </div>
                  <Pagination
                    count={table.getPageCount()}
                    fixedItems
                    itemComponent={(props) => (
                      <PaginationItem page={props.page} onClick={() => table.setPageIndex(props.page - 1)}>
                        {props.page}
                      </PaginationItem>
                    )}
                    ellipsisComponent={() => <PaginationEllipsis />}
                  >
                    <PaginationPrevious onClick={table.previousPage} />
                    <PaginationItems />
                    <PaginationNext onClick={table.nextPage} />
                  </Pagination>
                </>
              )
            )}
          </CardContent>
          <CardFooter>
            <CardDescription>
              <strong>Legend:</strong> ✅ = Verified, ❌ = Unverified
            </CardDescription>
          </CardFooter>
        </Card>
      </main>
    </Header>
  );
};

export default Organisations;
