import { Component, createSignal, onMount, createEffect, For } from "solid-js";

import { FaSolidEllipsis } from "solid-icons/fa";
import { ContextMenu } from "@kobalte/core/context-menu";
import { useNavigate } from "@solidjs/router";
import {
  createColumnHelper,
  createSolidTable,
  getCoreRowModel,
  flexRender,
  getPaginationRowModel,
  getFilteredRowModel,
  Table,
} from "@tanstack/solid-table";
import Swal from "sweetalert2";

import { eden } from "@client/api";
import { handleUnauthorized } from "@client/utils/authUtils";
import Header from "@client/components/Header";
import authStore from "@store/authStore";
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

// TData type for TanStack Solid Table
type User = {
  userId: string;
  username: string;
  name: string;
  email: string;
  municipality: string;
  organization: string;
  userRole: string;
  loggedIn: boolean;
  deleted: boolean | undefined;
};

const Users: Component = () => {
  const navigate = useNavigate();

  // TODO: Highlighting of current user?
  const loggedInUser = authStore.state().email;

  const loggedInTimespan =
    Number(import.meta.env.VITE_LOGGED_IN_TIMESPAN) || panic("VITE_LOGGED_IN_TIMESPAN environment variable not set");

  const [data, setData] = createSignal<User[]>([]);
  const [loading, setLoading] = createSignal(true);
  const [error, setError] = createSignal<string | null>(null);
  const [now, setNow] = createSignal(new Date().getTime());
  const [reload, setReload] = createSignal(false);
  const [showDeleted, setShowDeleted] = createSignal(false);

  onMount(async () => {
    await fetchUsers();
  });

  createEffect(async () => {
    reload();
    setNow(new Date().getTime());
    await fetchUsers();
  });

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
            // *** TANSTACK SOLID TABLE ***
            setData(
              fetchedUsers.data.map((user) => ({
                userId: user.id,
                username: user.username,
                name: user.name,
                email: user.email,
                municipality: user.municipality.name || "",
                organization: user.organization.name || "",
                userRole: user.userRole,
                loggedIn:
                  !user.needsToBeLoggedOut && now() - new Date(user.lastTimeActive).getTime() < loggedInTimespan * 1000
                    ? true
                    : false,
                deleted: user.deleted,
              })),
            );
            // console.log("Data() in fetch:", data());
            // const table = createSolidTable({ columns, data: data(), getCoreRowModel: getCoreRowModel() });
            // console.log("Table:", table.getCoreRowModel().rows);
            // *** END TANSTACK SOLID TABLE ***

            // console.log("Fetch:", fetchedUsers);
            // console.log("Fetched users:", fetchedUsers.data);
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
                user.userId === userId ? { ...user, needsToBeLoggedOut: true, deleted: true } : user,
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
                user.userId === userId ? { ...user, needsToBeLoggedOut: true, loggedIn: false } : user,
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

  // const [_animation] = createSignal(animation.scale);
  // const [_theme, setTheme] = createSignal<"light" | "dark">("light");

  // TanStack Solid Table - Column definitions
  const columnHelper = createColumnHelper<User>();
  const columns = [
    columnHelper.accessor("username", { header: "Username", filterFn: "includesString" }),
    columnHelper.accessor("name", { header: "Name", filterFn: "includesString" }),
    columnHelper.accessor("email", { header: "E-mail address", filterFn: "includesString" }),
    columnHelper.accessor("municipality", { header: "Municipality", filterFn: "equals" }),
    columnHelper.accessor("organization", { header: "Organization", filterFn: "equals" }),
    columnHelper.accessor("userRole", { header: "User Role", filterFn: "equals" }),
    columnHelper.accessor("loggedIn", {
      header: "Logged in",
      filterFn: (row, columnId, filterValue) => {
        if (filterValue === "all") return true;
        const loggedIn = row.getValue(columnId);
        return filterValue === "loggedIn" ? loggedIn : !loggedIn;
      },
      cell: (props) => (props.row.original.deleted ? "🗑️" : props.getValue() ? "🟢" : "🔴"),
    }),
    columnHelper.display({
      id: "actions",
      header: "Actions",
      cell: (props) => (
        <ContextMenu>
          <ContextMenu.Trigger class={menu_styles["trigger"]}>
            <FaSolidEllipsis />
          </ContextMenu.Trigger>
          <ContextMenu.Content class={menu_styles["context-menu__content"]}>
            <ContextMenu.Item
              class={menu_styles["context-menu__item"]}
              onSelect={() => handleEditUser(props.row.original.userId)}
              disabled={props.row.original.userRole == "Administrator"}
            >
              ✏️ Edit
            </ContextMenu.Item>
            <ContextMenu.Item
              class={menu_styles["context-menu__item"]}
              onSelect={() => handleDeleteUser(props.row.original.userId)}
              disabled={props.row.original.userRole === "Administrator" || props.row.original.deleted}
            >
              🗑️ Delete
            </ContextMenu.Item>
            <ContextMenu.Separator />
            <ContextMenu.Item
              class={menu_styles["context-menu__item"]}
              onSelect={() => handleLogOutUser(props.row.original.userId, props.row.original.name)}
              disabled={props.row.original.userRole == "Administrator" || !props.row.original.loggedIn}
            >
              🔒 Log out
            </ContextMenu.Item>
          </ContextMenu.Content>
        </ContextMenu>
      ),
    }),
  ];

  // This is done so that the table is rerendered upon data change
  // let table;
  const globalFilterFunction = (row, columnId, filterValue) => {
    if (showDeleted()) {
      return true;
    } else {
      return !row.original.deleted;
    }
  };

  const [table, setTable] = createSignal<Table<User> | null>(null); // Use a signal to manage the table's initialization
  createEffect(() => {
    const newTable = createSolidTable({
      columns,
      data: data(),
      getCoreRowModel: getCoreRowModel(),
      getPaginationRowModel: getPaginationRowModel(),
      getFilteredRowModel: getFilteredRowModel(),
      globalFilterFn: globalFilterFunction,
      initialState: {
        pagination: {
          pageSize: 5,
        },
      },
      state: {
        globalFilter: true,
      },
    });
    setTable(newTable); // Set the table after it is created
    showDeleted();
  });
  // console.log("HeaderGroups:", table.getHeaderGroups());
  // console.log("Table:", table.getCoreRowModel().rows);

  // Function to get unique values for the filter dropdown
  const getUniqueValues = (data, columnId) => {
    const uniqueValues = new Set();
    data.forEach((row) => {
      uniqueValues.add(row[columnId]);
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
            onClick={() => setShowDeleted(!showDeleted())}
            class={showDeleted() ? styles["nav-button-inverse"] : styles["nav-button"]}
          >
            {showDeleted() ? "Hide deleted" : "Show deleted"}
          </button>
        </div>
        {loading() ? (
          <div class={styles.loader}></div>
        ) : error() ? (
          <p class={styles["error-text"]}>Error: {error()}</p>
        ) : (
          table() && (
            <>
              <div class={styles["table-wrapper"]}>
                <table>
                  <thead>
                    <For each={table().getHeaderGroups()}>
                      {(headerGroup) => (
                        <>
                          <tr>
                            <For each={headerGroup.headers}>
                              {(header) => (
                                <th>
                                  {header.isPlaceholder
                                    ? null
                                    : flexRender(header.column.columnDef.header, header.getContext())}
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
                                      value={header.column.getFilterValue() || ""}
                                      onChange={(e) => header.column.setFilterValue(e.currentTarget.value)}
                                    >
                                      <option value="">All</option>
                                      <For each={getUniqueValues(data(), header.column.id)}>
                                        {(value) => <option value={value}>{value}</option>}
                                      </For>
                                    </select>
                                  )}
                                  {(header.column.id === "username" ||
                                    header.column.id === "email" ||
                                    header.column.id === "name") && (
                                    <input
                                      value={header.column.getFilterValue() || ""}
                                      onChange={(e) => header.column.setFilterValue(e.currentTarget.value)}
                                      placeholder={`Search`}
                                    />
                                  )}
                                  {header.column.id === "loggedIn" && (
                                    <select
                                      value={header.column.getFilterValue() || "all"}
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
                    <For each={table().getRowModel().rows}>
                      {(row) => (
                        <tr>
                          <For each={row.getVisibleCells()}>
                            {(cell) => <td>{flexRender(cell.column.columnDef.cell, cell.getContext())}</td>}
                          </For>
                        </tr>
                      )}
                    </For>
                  </tbody>
                </table>
              </div>
              <div>
                <button
                  onClick={() => table().firstPage()}
                  disabled={!table().getCanPreviousPage()}
                  class={styles["nav-button"]}
                >
                  &lt;&lt;
                </button>
                <button
                  onClick={() => table().previousPage()}
                  disabled={!table().getCanPreviousPage()}
                  class={styles["nav-button"]}
                >
                  &lt;
                </button>
                <button
                  onClick={() => table().nextPage()}
                  disabled={!table().getCanNextPage()}
                  class={styles["nav-button"]}
                >
                  &gt;
                </button>
                <button
                  onClick={() => {
                    table().lastPage();
                  }}
                  disabled={!table().getCanNextPage()}
                  class={styles["nav-button"]}
                >
                  &gt;&gt;
                </button>
                {/* <p>{table.getPageCount()}</p> */}
              </div>
            </>
          )
        )}
      </main>
    </Header>
  );
};

export default Users;
