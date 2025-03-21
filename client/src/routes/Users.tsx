import { Component, createSignal, onMount, createEffect, For } from "solid-js";
import { FaSolidEllipsis, FaSolidArrowDownAZ, FaSolidArrowUpAZ } from "solid-icons/fa";
import { IoAlertCircleOutline } from "solid-icons/io";
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
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@client/components/ui/card.tsx";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@client/components/ui/table.tsx";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@client/components/ui/select.tsx";
import { Switch, SwitchControl, SwitchLabel, SwitchThumb } from "@client/components/ui/switch.tsx";
import { Alert, AlertDescription, AlertTitle } from "@client/components/ui/alert.tsx";
import { TextField, TextFieldInput } from "@client/components/ui/textField.tsx";
import { Skeleton } from "@client/components/ui/skeleton.tsx";
import { Button } from "@client/components/ui/button.tsx";
import { eden } from "@client/api/index.ts";
import { handleUnauthorized } from "@client/utils/authUtils.ts";
import Header from "@client/components/Header.tsx";
import UserCreateDialog from "@client/components/dialogs/UserCreateDialog.tsx";
import UserEditDialog from "@client/components/dialogs/UserEditDialog.tsx";
import QuickDialog from "@client/components/dialogs/QuickDialog.tsx";
import { UserDetails } from "@server/types.ts";
import { panic } from "@utils/panic.ts";
import { showToast } from "@client/components/ui/toast.tsx";

// import authStore from "@store/authStore"; // TODO: Not used anymore but could be used for highlighting the current user

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

  // Function to delete user
  async function handleDeleteUser(userId: string) {
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
        showToast({
          variant: "error",
          title: "Error",
          description: errorMessage,
        });
        return;
      } else {
        showToast({
          variant: "success",
          title: "Success",
          description: "User deleted successfully",
        });
        setData((prevUsers) => {
          return prevUsers.map((user) =>
            user.id === userId ? { ...user, needsToBeLoggedOut: true, deleted: true } : user,
          );
        });
      }
    } catch (error) {
      console.error("Failed to delete user:", error);
      showToast({
        variant: "error",
        title: "Error",
        description: "Couldn't delete the user",
      });
    }
  }

  // Function to log out user
  async function handleLogOutUser(userId: string) {
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
        showToast({
          variant: "error",
          title: "Error",
          description: errorMessage,
        });
        return;
      } else {
        showToast({
          variant: "success",
          title: "Success",
          description: "User logged out successfully",
        });
        setData((prevUsers) => {
          return prevUsers.map((user) =>
            user.id === userId ? { ...user, needsToBeLoggedOut: true, loggedIn: false } : user,
          );
        });
      }
    } catch (error) {
      console.error("Failed to log out user:", error);
      showToast({
        variant: "error",
        title: "Error",
        description: "Couldn't log out the user",
      });
    }
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
        <div class="p-2">
          <DropdownMenu>
            <DropdownMenuTrigger
              aria-haspopup="menu"
              aria-expanded={false}
              class="h-full w-full hover:bg-accent rounded-md cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-0"
              aria-hidden
            >
              <div class="h-full w-full flex items-center justify-center p-2">
                <FaSolidEllipsis class="h-5 w-5" />
              </div>
            </DropdownMenuTrigger>
            <DropdownMenuContent role="menu">
              <DropdownMenuLabel role="presentation">{props.row.original.name}</DropdownMenuLabel>
              <DropdownMenuSeparator role="separator" />
              <DropdownMenuItem
                disabled={props.row.original.userRole == "Administrator"}
                role="menuitem"
                closeOnSelect={false}
              >
                {/* ✏️ Edit */}
                <UserEditDialog
                  userId={props.row.original.id}
                  username={props.row.original.username}
                  fetchUsers={fetchUsers}
                />
              </DropdownMenuItem>
              <DropdownMenuItem
                disabled={props.row.original.userRole === "Administrator" || props.row.original.deleted}
                role="menuitem"
                closeOnSelect={false}
              >
                <QuickDialog
                  variant="destructive"
                  handler={() => handleDeleteUser(props.row.original.id)}
                  triggerTitle="🗑️ Delete"
                  title="Delete User"
                  description="Are you sure you want to delete user named"
                  subject={props.row.original.username}
                  buttonText="Delete"
                />
              </DropdownMenuItem>
              <DropdownMenuSeparator role="separator" />
              <DropdownMenuItem
                disabled={
                  props.row.original.userRole == "Administrator" ||
                  props.row.original.needsToBeLoggedOut ||
                  now() - new Date(props.row.original.lastTimeActive).getTime() > loggedInTimespan * 1000
                }
                role="menuitem"
                class="w-full text-start"
                closeOnSelect={false}
              >
                <QuickDialog
                  variant="confirm"
                  handler={() => handleLogOutUser(props.row.original.id)}
                  triggerTitle="🔒 Logout"
                  title="Logout User"
                  description="Are you sure you want to logout user named"
                  subject={props.row.original.username}
                  buttonText="Logout"
                />
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
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
  const table: TableType<UserDetails> = createSolidTable({
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
      <main class="flex content-center items-center justify-center align-middle min-h-full">
        <Card class="w-fit my-8">
          <CardHeader>
            <CardTitle>Users Admin Area</CardTitle>
            <CardDescription>Here you can manage users, edit, delete, and log out users.</CardDescription>
            <CardDescription>
              To order users by column you can click on the column header, to filter and search you can use the second
              row.
            </CardDescription>
          </CardHeader>
          <CardContent class="w-fit">
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
                    <UserCreateDialog fetchUsers={fetchUsers} />
                    <Button onClick={() => setReload(!reload())}>Refresh data</Button>
                    <Switch
                      class="flex items-center space-x-2"
                      checked={showDeleted()}
                      onChange={() => setShowDeleted(!showDeleted())}
                    >
                      <SwitchLabel>Show deleted</SwitchLabel>
                      <SwitchControl>
                        <SwitchThumb />
                      </SwitchControl>
                    </Switch>
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
                                          class="cursor-pointer flex justify-center items-center gap-2.5"
                                          style={{ "user-select": "none" }}
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
                                    </TableHead>
                                  )}
                                </For>
                              </TableRow>
                              <TableRow>
                                <For each={headerGroup.headers}>
                                  {(header) => (
                                    <TableHead class="[&_*]:cursor-pointer">
                                      {(header.column.id === "userRole" ||
                                        header.column.id === "organization" ||
                                        header.column.id === "municipality") && (
                                        <Select
                                          value={(header.column.getFilterValue() as string) ?? "All"}
                                          onChange={(value) => {
                                            // console.log("Select onChange Value:", value);
                                            if (value === "All") {
                                              return header.column.setFilterValue("");
                                            }
                                            return header.column.setFilterValue(value);
                                          }}
                                          options={["All", ...getUniqueValues(data(), header.column.id)]}
                                          itemComponent={(props) => {
                                            // console.log("Select item props:", props);
                                            return <SelectItem item={props.item}>{props.item.rawValue}</SelectItem>;
                                          }}
                                        >
                                          <SelectTrigger aria-label={"Filter by " + header.column.id} class="border-0">
                                            <SelectValue<string>>
                                              {(state) => {
                                                const selectedOption = state.selectedOption();
                                                // console.log("Selected option:", selectedOption);
                                                if (!selectedOption) {
                                                  return "All"; // Or whatever your default display text should be
                                                }
                                                return selectedOption === "" ? "All" : selectedOption;
                                              }}
                                            </SelectValue>
                                          </SelectTrigger>
                                          <SelectContent />
                                        </Select>
                                      )}
                                      {(header.column.id === "username" ||
                                        header.column.id === "email" ||
                                        header.column.id === "name") && (
                                        <TextField>
                                          <TextFieldInput
                                            value={(header.column.getFilterValue() as string) ?? ""}
                                            onInput={(e) => header.column.setFilterValue(e.currentTarget.value)}
                                            placeholder={`Search`}
                                            class="border-0"
                                          />
                                        </TextField>
                                      )}
                                      {header.column.id === "loggedIn" && (
                                        // NOTE: TS gives some errors here, because this is not expected way of using the Shadcn component, but it is right for the underlying Kobalte one
                                        <Select
                                          value={(header.column.getFilterValue() as string) ?? "all"}
                                          onChange={(value) => header.column.setFilterValue(value.value)}
                                          options={[
                                            { value: "all", label: "All" },
                                            { value: "loggedIn", label: "Logged in" },
                                            { value: "loggedOut", label: "Logged out" },
                                          ]}
                                          optionValue="value"
                                          optionTextValue="label"
                                          itemComponent={(props) => (
                                            <SelectItem
                                              item={props.item}
                                              // onSelect={() => header.column.setFilterValue(props.item.value)}
                                            >
                                              {props.item.rawValue.label}
                                            </SelectItem>
                                          )}
                                        >
                                          <SelectTrigger aria-label="Logged in" class="border-0">
                                            <SelectValue<{ value: string; label: string }>>
                                              {() => {
                                                const currentValue =
                                                  (header.column.getFilterValue() as string) ?? "all";
                                                const options = [
                                                  { value: "all", label: "All" },
                                                  { value: "loggedIn", label: "Logged in" },
                                                  { value: "loggedOut", label: "Logged out" },
                                                ];
                                                const selectedOption = options.find(
                                                  (opt) => opt.value === currentValue,
                                                );
                                                return selectedOption ? selectedOption.label : "All";
                                              }}
                                            </SelectValue>
                                          </SelectTrigger>
                                          <SelectContent />
                                        </Select>
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
                                  <TableCell style={cell.column.id === "actions" ? "padding: 0; height: 100%;" : ""}>
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
          <CardFooter class="w-fit">
            <CardDescription>
              <strong>Legend:</strong> 🟢 = Logged in, 🔴 = Logged out, 🗑️ = Deleted
            </CardDescription>
          </CardFooter>
        </Card>
      </main>
    </Header>
  );
};

export default Users;
