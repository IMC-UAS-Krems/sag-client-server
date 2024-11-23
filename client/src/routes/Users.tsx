import { Component, createSignal, onMount, createEffect, For } from "solid-js";

import {
  FaSolidEllipsis,
  FaSolidAngleLeft,
  FaSolidAnglesLeft,
  FaSolidAngleRight,
  FaSolidAnglesRight,
  FaSolidArrowDownAZ,
  FaSolidArrowUpAZ,
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

import { eden } from "@client/api";
import { handleUnauthorized } from "@client/utils/authUtils";
import Header from "@client/components/Header";
// import authStore from "@store/authStore"; // Not used anymore but could be used for highlighting the current user
import styles from "@styles/Users.module.css";
import menu_styles from "@styles/ContextMenu.module.css";
import { UserDetails } from "@server/types";
import { panic } from "@utils/panic";
import { Notification } from "@client/common";

interface UsersResponse {
  data: UserDetails[] | { error: string } | null;
  error: { message: string } | null;
  status: number;
  response: { 200: UserDetails[] | { error: string } };
  headers: Record<string, string>;
}

const Users: Component = () => {
  const navigate = useNavigate();

  const loggedInTimespan =
    Number(import.meta.env.VITE_LOGGED_IN_TIMESPAN) || panic("VITE_LOGGED_IN_TIMESPAN environment variable not set");

  const [loading, setLoading] = createSignal(true);
  const [error, setError] = createSignal<string | null>(null);
  const [now, setNow] = createSignal(new Date().getTime());
  const [reload, setReload] = createSignal(false);

  onMount(async () => {
    await fetchUsers();
  });

  createEffect(async () => {
    reload();
    setNow(new Date().getTime());
    await fetchUsers();
  });

  // TODO: Highlighting of current user as possible future feature for convenience?
  // const loggedInUser = authStore.state().email;

  // Function to fetch users
  async function fetchUsers() {
    setLoading(true);
    try {
      const fetchedUsers: UsersResponse = await eden.admin.users.get({
        $fetch: {
          mode: "cors",
          credentials: "include",
          method: "GET",
        },
      });

      // Unauthorized check
      if (fetchedUsers.status === 401 || fetchedUsers.status === 403) {
        handleUnauthorized(navigate);
        return;
      }

      if (fetchedUsers.data) {
        if (fetchedUsers.status !== 200) {
          if (!Array.isArray(fetchedUsers.data) && "error" in fetchedUsers.data) {
            setError(fetchedUsers.data.error || "Unknown error");
          } else {
            throw new Error("Failed to fetch users, data is not correct form");
          }
        } else {
          if (Array.isArray(fetchedUsers.data)) {
            // Set data for TanStack Solid Table
            setData(fetchedUsers.data);
          } else {
            throw new Error("Failed to fetch users, data is not an array");
          }
        }
      } else {
        throw new Error("Failed to fetch users, data is null");
      }
    } catch (error) {
      setError("Failed to fetch users");
      console.error("Failed to fetch users:", error);
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateUser() {
    navigate("/users/create");
  }

  async function handleEditUser(userId: string) {
    navigate(`/users/edit/${userId}`);
  }

  // Function to delete user
  async function handleDeleteUser(userId: string) {
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
          const deletedUser = await eden.admin["delete-user"].delete({
            userId: userId,
            $fetch: {
              mode: "cors",
              credentials: "include",
              method: "DELETE",
            },
          });

          // Unauthorized check
          if (deletedUser.status === 401 || deletedUser.status === 403) {
            console.log("User is not authorized for this request:", deletedUser);
            handleUnauthorized(navigate);
            return;
          }

          if (deletedUser.status !== 200 || (deletedUser.data && "error" in deletedUser.data)) {
            console.log("Failed to delete user:", deletedUser.error);
            const errorMessage =
              deletedUser.data && "error" in deletedUser.data ? deletedUser.data.error : "Couldn't delete the user";
            Swal.fire({
              title: "Error",
              text: errorMessage,
              icon: "error",
            });
            return;
          } else {
            Notification.fire({
              titleText: "User deleted successfully",
              icon: "success",
            });
            setData((prevUsers) => {
              return prevUsers.map((user) =>
                user.id === userId ? { ...user, needsToBeLoggedOut: true, deleted: true } : user,
              );
            });
          }
        } catch (error) {
          console.error("Failed to delete user:", error);
          Swal.fire({
            title: "Error",
            text: "Couldn't delete the user",
            icon: "error",
          });
        }
      }
    });
  }

  // Function to log out user
  async function handleLogOutUser(userId: string, userName: string) {
    // console.log("Logging out user:", userId);
    Swal.fire({
      title: "Are you sure?",
      text: `This will log out the user: ${userName}.`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#3085d6",
      cancelButtonColor: "#d33",
      confirmButtonText: "Yes, log out!",
    }).then(async (result) => {
      if (result.isConfirmed) {
        try {
          const requestBody = {
            userId: userId,
          };
          const response = await eden.admin["logout-user"].post({
            ...requestBody,
            $fetch: {
              mode: "cors",
              credentials: "include",
              method: "POST",
            },
          });
          // console.log("Response:", response);

          // Unauthorized check
          if (response.status === 401 || response.status === 403) {
            handleUnauthorized(navigate);
            return;
          }

          if (response.status !== 200 || (response.data && response.data.error)) {
            console.log("Failed to log out user: ", response.data ? response.data.error : "Unknown error");
            const errorMessage = response.data ? response.data.error : "Couldn't log out the user";
            Swal.fire({
              title: "Error",
              text: errorMessage,
              icon: "error",
            });
            return;
          } else {
            Notification.fire({
              titleText: "User logged out successfully",
              icon: "success",
            });
            setData((prevUsers) => {
              return prevUsers.map((user) =>
                user.id === userId ? { ...user, needsToBeLoggedOut: true, loggedIn: false } : user,
              );
            });
          }
        } catch (error) {
          console.error("Failed to log out user:", error);
          Swal.fire({
            title: "Error",
            text: "Couldn't log out the user",
            icon: "error",
          });
        }
      }
    });
    setReload(!reload());
  }

  // TanStack Solid Table - Column definitions
  const columnHelper = createColumnHelper<UserDetails>();
  const columns = [
    columnHelper.accessor("username", { header: "Username", filterFn: "includesString" }),
    columnHelper.accessor("name", { header: "Name", filterFn: "includesString" }),
    columnHelper.accessor("email", { header: "E-mail address", filterFn: "includesString" }),
    columnHelper.accessor((row) => row.municipality.name, {
      id: "municipality",
      header: "Municipality",
      filterFn: "equals",
    }),
    columnHelper.accessor((row) => row.organization.name, {
      id: "organization",
      header: "Organization",
      filterFn: "equals",
    }),
    columnHelper.accessor("userRole", { header: "User Role", filterFn: "equals" }),
    columnHelper.display({
      id: "loggedIn",
      header: "Logged in",
      cell: (props) => {
        const loggedIn =
          !props.row.original.needsToBeLoggedOut &&
          now() - new Date(props.row.original.lastTimeActive).getTime() < loggedInTimespan * 1000;
        return props.row.original.deleted ? "🗑️" : loggedIn ? "🟢" : "🔴";
      },
      filterFn: (row, columnId, filterValue) => {
        if (filterValue === "all") return true;
        const loggedIn =
          !row.original.needsToBeLoggedOut &&
          now() - new Date(row.original.lastTimeActive).getTime() < loggedInTimespan * 1000;
        return filterValue === "loggedIn" ? loggedIn : !loggedIn;
      },
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
              class={menu_styles["context-menu__item"]}
              onSelect={() => handleEditUser(props.row.original.id)}
              disabled={props.row.original.userRole == "Administrator"}
              role="menuitem"
            >
              ✏️ Edit
            </DropdownMenu.Item>
            <DropdownMenu.Item
              class={menu_styles["context-menu__item"]}
              onSelect={() => handleDeleteUser(props.row.original.id)}
              disabled={props.row.original.userRole === "Administrator" || props.row.original.deleted}
              role="menuitem"
            >
              🗑️ Delete
            </DropdownMenu.Item>
            <DropdownMenu.Separator role="separator" />
            <DropdownMenu.Item
              class={menu_styles["context-menu__item"]}
              onSelect={() => handleLogOutUser(props.row.original.id, props.row.original.name)}
              disabled={
                props.row.original.userRole == "Administrator" ||
                props.row.original.needsToBeLoggedOut ||
                now() - new Date(props.row.original.lastTimeActive).getTime() > loggedInTimespan * 1000
              }
              role="menuitem"
            >
              🔒 Log out
            </DropdownMenu.Item>
          </DropdownMenu.Content>
        </DropdownMenu>
      ),
    }),
  ];

  // TansStack Solid Table - Signals, filters
  const [data, setData] = createSignal<UserDetails[]>([]);
  const [pagination, setPagination] = createSignal<PaginationState>({
    pageIndex: 0,
    pageSize: 5,
  });
  const [columnFilters, setColumnFilters] = createSignal<ColumnFiltersState>([]);
  const [sorting, setSorting] = createSignal([]);
  const [showDeleted, setShowDeleted] = createSignal(false);
  const [globalFilter, setGlobalFilter] = createSignal<string>(showDeleted() ? "showAll" : "hideDeleted");

  // TODO: Global filtering works for now with this, but it's not the nicest, maybe refactor later
  createEffect(() => {
    const filterValue = showDeleted() ? "showAll" : "hideDeleted";
    setGlobalFilter(filterValue);
  });

  const globalFilterFunction = (row: Row<UserDetails>): boolean => {
    if (showDeleted()) {
      return true;
    } else {
      return !row.original.deleted;
    }
  };

  const resetPagination = () => {
    setPagination((prev) => ({ ...prev, pageIndex: 0 }));
  };

  // TanStack Solid Table - Table definition
  const table: Table<UserDetails> = createSolidTable({
    get data() {
      return data();
    },
    columns,
    state: {
      get pagination() {
        return pagination();
      },
      get columnFilters() {
        return columnFilters();
      },
      get globalFilter() {
        return globalFilter();
      },
      get sorting() {
        return sorting();
      },
    },
    onPaginationChange: setPagination,
    onColumnFiltersChange: (filters) => {
      setColumnFilters(filters);
      resetPagination();
    },
    onGlobalFilterChange: setGlobalFilter,
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    globalFilterFn: globalFilterFunction,
    autoResetPageIndex: false,
    // autoResetFilters: false,
    // autoResetSorting: false,
  });

  // Function to get unique values for the filter dropdown
  const getUniqueValues = (data: UserDetails[], columnId: string) => {
    const uniqueValues = new Set();
    data.forEach((row) => {
      let value;
      if (columnId === "municipality") {
        value = row.municipality.name;
      } else if (columnId === "organization") {
        value = row.organization.name;
      } else {
        value = row[columnId as keyof UserDetails];
      }
      uniqueValues.add(value);
    });
    return Array.from(uniqueValues);
  };

  return (
    <Header>
      <main class={styles["users-main"]}>
        <h1>Admin users page</h1>
        <div class={styles["nav-button-container"]}>
          <button onClick={handleCreateUser} class={styles["nav-button"]}>
            Create new user
          </button>
          <button onClick={() => setReload(!reload())} class={styles["nav-button"]}>
            Refresh data
          </button>
          <button
            onClick={() => {
              const newShowDeleted = !showDeleted();
              setShowDeleted(newShowDeleted);
            }}
            class={showDeleted() ? styles["nav-button-inverse"] : styles["nav-button"]}
          >
            {showDeleted() ? "Hide deleted" : "Show deleted"}
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
                                      {{
                                        asc: <FaSolidArrowDownAZ />,
                                        desc: <FaSolidArrowUpAZ />,
                                      }[header.column.getIsSorted() as string] ?? null}
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
                                  {(header.column.id === "userRole" ||
                                    header.column.id === "organization" ||
                                    header.column.id === "municipality") && (
                                    <select
                                      value={(header.column.getFilterValue() as string) ?? ""}
                                      onChange={(e) => header.column.setFilterValue(e.currentTarget.value)}
                                    >
                                      <option value="">All</option>
                                      <For each={getUniqueValues(data(), header.column.id)}>
                                        {(value) => <option value={value as string}>{value as string}</option>}
                                      </For>
                                    </select>
                                  )}
                                  {(header.column.id === "username" ||
                                    header.column.id === "email" ||
                                    header.column.id === "name") && (
                                    <input
                                      value={(header.column.getFilterValue() as string) ?? ""}
                                      onChange={(e) => header.column.setFilterValue(e.currentTarget.value)}
                                      placeholder={`Search`}
                                    />
                                  )}
                                  {header.column.id === "loggedIn" && (
                                    <select
                                      value={(header.column.getFilterValue() as string) ?? "all"}
                                      onChange={(e) => header.column.setFilterValue(e.currentTarget.value)}
                                    >
                                      <option value="all">All</option>
                                      <option value="loggedIn">Logged in</option>
                                      <option value="loggedOut">Logged out</option>
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

export default Users;
