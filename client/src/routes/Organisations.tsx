import { createSignal, onMount, Component, For } from "solid-js";

import {
  FaSolidEllipsis,
  FaSolidAngleLeft,
  FaSolidAnglesLeft,
  FaSolidAngleRight,
  FaSolidAnglesRight,
  FaSolidArrowDownAZ,
  FaSolidArrowUpAZ,
  FaSolidArrowUp19,
  FaSolidArrowDown19,
  FaSolidSortUp,
  FaSolidSortDown,
} from "solid-icons/fa";
import { DropdownMenu } from "@kobalte/core/dropdown-menu";
import { useNavigate } from "@solidjs/router";
import {
  createColumnHelper,
  createSolidTable,
  getCoreRowModel,
  flexRender,
  getPaginationRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  Table,
  PaginationState,
  Row,
  ColumnFiltersState,
} from "@tanstack/solid-table";
import Swal from "sweetalert2";

import { eden } from "@client/api/index.ts";
import { handleUnauthorized } from "@client/utils/authUtils.ts";
import styles from "@styles/Organisations.module.css";
import menu_styles from "@styles/ContextMenu.module.css";
import { OrganisationDetails } from "@server/types.ts";
import { theme } from "@client/store/index.ts";
import Header from "@client/components/Header.tsx";

const Organisations: Component = () => {
  const navigate = useNavigate();

  const [error, setError] = createSignal<string | null>(null);
  const [loading, setLoading] = createSignal(true);

  const [organisations, setOrganisations] = createSignal<OrganisationDetails[]>([]);

  onMount(async () => {
    await fetchOrganisations();
  });

  async function fetchOrganisations() {
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

  async function handleCreateOrganisation() {
    navigate("/organisations/create");
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
        <DropdownMenu>
          <DropdownMenu.Trigger
            class={(menu_styles["trigger"], styles["trigger"])}
            aria-haspopup="menu"
            aria-expanded={false}
          >
            <FaSolidEllipsis />
          </DropdownMenu.Trigger>
          <DropdownMenu.Content class={menu_styles["context-menu__content"]} role="menu">
            <div class={styles["context-menu-title"]} role="presentation">
              {props.row.original.name}
            </div>
            <DropdownMenu.Separator role="separator" />
            <DropdownMenu.Item
              onClick={() => handleEditOrganisation(props.row.original.id)}
              class={menu_styles["context-menu__item"]}
              role="menuitem"
            >
              ✏️ Edit
            </DropdownMenu.Item>
            <DropdownMenu.Item
              onClick={() => handleDeleteOrganisation(props.row.original.id)}
              class={menu_styles["context-menu__item"]}
              role="menuitem"
            >
              🗑️ Delete
            </DropdownMenu.Item>
          </DropdownMenu.Content>
        </DropdownMenu>
      ),
    }),
  ];

  const [columnFilters, setColumnFilters] = createSignal<ColumnFiltersState>([]);
  const [sorting, setSorting] = createSignal([]);
  const [pagination, setPagination] = createSignal<PaginationState>({
    pageIndex: 0,
    pageSize: 5,
  });

  const resetPagination = () => {
    setPagination((prev) => ({ ...prev, pageIndex: 0 }));
  };

  // TanStack Solid Table - Table
  const table: Table<OrganisationDetails> = createSolidTable({
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
        <h1>Admin Organisations page</h1>
        <div class={styles["nav-button-container"]}>
          <button onClick={handleCreateOrganisation} class={styles["nav-button"]}>
            Create new organisation
          </button>
          <div class={styles["page-size-selector"]}>
            <span>Page size: </span>
            <select
              value={table?.getState().pagination.pageSize}
              onChange={(e) => {
                table.setPageSize(Number(e.target.value));
              }}
            >
              {[5, 10, 20, 40].map((pageSize) => (
                <option value={pageSize}>{pageSize}</option>
              ))}
            </select>
          </div>
        </div>
        {loading() ? (
          <div class={styles.loader}></div>
        ) : error() ? (
          <p class={styles["error-text"]}>Error: {error()}</p>
        ) : (
          table && (
            <>
              <div class={styles["table-wrapper"]}>
                <table>
                  <thead>
                    <For each={table.getHeaderGroups()}>
                      {(headerGroup) => (
                        <>
                          <tr>
                            <For each={headerGroup.headers}>
                              {(header) => (
                                <th>
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
                                </th>
                              )}
                            </For>
                          </tr>
                          <tr>
                            <For each={headerGroup.headers}>
                              {(header) => (
                                <th class={styles["filter-row"]}>
                                  {header.column.id === "name" && (
                                    <input
                                      value={(header.column.getFilterValue() as string) ?? ""}
                                      onChange={(e) => header.column.setFilterValue(e.currentTarget.value)}
                                      placeholder={`Search`}
                                    />
                                  )}
                                  {header.column.id === "municipality" && (
                                    <select
                                      value={(header.column.getFilterValue() as string) ?? ""}
                                      onChange={(e) => header.column.setFilterValue(e.currentTarget.value)}
                                    >
                                      <option value="">All</option>
                                      <For each={getUniqueValues(organisations(), header.column.id)}>
                                        {(value) => <option value={value as string}>{value as string}</option>}
                                      </For>
                                    </select>
                                  )}
                                  {header.column.id === "usersCount" && (
                                    <div>
                                      <input
                                        type="number"
                                        value={getRangeFilterValue(header.column.getFilterValue()).min || ""}
                                        onChange={(e) => {
                                          const filterValue = getRangeFilterValue(header.column.getFilterValue());
                                          const minValue = Number(e.currentTarget.value);
                                          if (filterValue.max < minValue) {
                                            header.column.setFilterValue({
                                              min: minValue,
                                              max: minValue,
                                            });
                                          } else {
                                            header.column.setFilterValue({ min: minValue, max: filterValue.max });
                                          }
                                        }}
                                        min={0}
                                        placeholder={`Min`}
                                      />
                                      <input
                                        type="number"
                                        value={getRangeFilterValue(header.column.getFilterValue()).max || ""}
                                        onChange={(e) => {
                                          const filterValue = getRangeFilterValue(header.column.getFilterValue());
                                          const maxValue = Number(e.currentTarget.value);
                                          if (filterValue.min > maxValue) {
                                            header.column.setFilterValue({
                                              min: maxValue,
                                              max: maxValue,
                                            });
                                          } else {
                                            header.column.setFilterValue({ min: filterValue.min, max: maxValue });
                                          }
                                        }}
                                        min={0}
                                        placeholder={`Max`}
                                      />
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
                                </th>
                              )}
                            </For>
                          </tr>
                        </>
                      )}
                    </For>
                  </thead>
                  <tbody>
                    <For each={table.getRowModel().rows}>
                      {(row) => (
                        <tr>
                          <For each={row.getVisibleCells()}>
                            {(cell) => (
                              <td class={cell.column.id === "actions" ? styles["actions-column"] : ""}>
                                {flexRender(cell.column.columnDef.cell, cell.getContext())}
                              </td>
                            )}
                          </For>
                        </tr>
                      )}
                    </For>
                  </tbody>
                </table>
              </div>
              <div class={styles["pagination-container"]}>
                <button
                  onClick={() => table.firstPage()}
                  disabled={!table.getCanPreviousPage()}
                  class={styles["nav-button"]}
                >
                  <FaSolidAnglesLeft />
                </button>
                <button
                  onClick={() => table.previousPage()}
                  disabled={!table.getCanPreviousPage()}
                  class={styles["nav-button"]}
                >
                  <FaSolidAngleLeft />
                </button>
                <span>
                  Page <strong>{table.getState().pagination.pageIndex + 1}</strong> of{" "}
                  {table.getPageCount().toLocaleString()}
                </span>
                <button
                  onClick={() => table.nextPage()}
                  disabled={!table.getCanNextPage()}
                  class={styles["nav-button"]}
                >
                  <FaSolidAngleRight />
                </button>
                <button
                  onClick={() => {
                    table.lastPage();
                  }}
                  disabled={!table.getCanNextPage()}
                  class={styles["nav-button"]}
                >
                  <FaSolidAnglesRight />
                </button>
              </div>
            </>
          )
        )}
      </main>
    </Header>
  );
};

export default Organisations;
