import { Component, createSignal, onMount, createEffect } from "solid-js";

import { FaSolidEllipsis } from "solid-icons/fa";
import { Menu, Item, useContextMenu, animation, Separator } from "solid-contextmenu";
import { useNavigate } from "@solidjs/router";
import Swal from "sweetalert2";

import { eden } from "@client/api";
import { handleUnauthorized, isUserOnline } from "@client/utils/authUtils";
import Header from "@client/components/Header";
import authStore from "@store/authStore";
import styles from "@styles/Users.module.css";
import { theme } from "@store/index";
import { UserDetails } from "@server/types";

import "../../../node_modules/solid-contextmenu/dist/style.css";

// Response structure
// TODO: Where can we find EdenFetchError type?
interface EdenFetchError<T, U> {
  code: T;
  message: U;
}

interface UsersResponse {
  data: UserDetails[] | { error: string } | null;
  error: EdenFetchError<number, string> | null;
  status: number;
  response: { 200: string | number | boolean | object };
  headers: Record<string, string>;
}

const Users: Component = () => {
  const navigate = useNavigate();
  const loggedInUser = authStore.state().user;
  // console.log("Auth store:", authStore.state());
  // console.log("Logged in user:", loggedInUser);

  // User data
  const [users, setUsers] = createSignal<UserDetails[]>([]);
  const [loading, setLoading] = createSignal(true);
  const [error, setError] = createSignal<string | null>(null);
  const [onlineStatuses, setOnlineStatuses] = createSignal<Record<string, boolean>>({});
  const [reload, setReload] = createSignal(false);
  const [showDeleted, setShowDeleted] = createSignal(false);

  onMount(async () => {
    await fetchUsers();
  });

  createEffect(() => {
    reload();
    fetchUsers();
  });

  const filteredUsers = () => {
    return showDeleted() ? users() : users().filter((user) => !user.deleted);
  };

  async function fetchUsers() {
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
            setUsers(fetchedUsers.data);
            await updateOnlineStatuses(fetchedUsers.data);
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

  async function updateOnlineStatuses(users: UserDetails[]) {
    const statuses: Record<string, boolean> = {};
    for (const user of users) {
      statuses[user.id] = await isUserOnline(user);
    }
    setOnlineStatuses(statuses);
  }

  async function handleCreateUser() {
    // console.log("Creating user");
    navigate("/users/create");
  }

  async function handleEditUser(userId: string) {
    // console.log("Editing user");
    navigate(`/users/edit/${userId}`);
  }

  async function handleDeleteUser(userId: string) {
    // console.log("Deleting user:", userId);
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

          if (!deletedUser.data || deletedUser.error) {
            console.log("Failed to delete user:", deletedUser.error);
            Swal.fire({
              title: "Error",
              text: "Couldn't delete the user",
              icon: "error",
            });
            return;
          } else {
            Swal.fire("Deleted!", "The user has been deleted.", "success");
            setUsers((prevUsers) => prevUsers.map((user) => (user.id === userId ? { ...user, deleted: true } : user)));
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
            Swal.fire({
              title: "Error",
              text: "Couldn't log out the user",
              icon: "error",
            });
            return;
          } else {
            Swal.fire("Logged out!", "The user has been logged out.", "success");

            setUsers((prevUsers) =>
              prevUsers.map((user) => (user.id === userId ? { ...user, needsToBeLoggedOut: true } : user)),
            );

            await updateOnlineStatuses(users());
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

  const [_animation] = createSignal(animation.scale);
  // const [_theme, setTheme] = createSignal<"light" | "dark">("light");

  return (
    <Header>
      <main class={styles["users-main"]}>
        <h1>Admin users page</h1>
        <div class={styles["nav-button-container"]}>
          <button onClick={handleCreateUser} class={styles["nav-button"]}>
            Create new user
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
          <div class={styles["table-wrapper"]}>
            <table>
              <thead>
                <tr>
                  <th>Username</th>
                  <th>Name</th>
                  <th>E-mail address</th>
                  <th>Municipality</th>
                  <th>Organisation</th>
                  <th>User Role</th>
                  <th>Logged in</th>
                  <th>Actions</th>
                </tr>
              </thead>

              <tbody>
                {filteredUsers().map((user) => {
                  const { show } = useContextMenu({ id: user.id });
                  const onlineStatus = onlineStatuses()[user.id];

                  return (
                    <tr class={user.email == loggedInUser ? styles["logged-in-user"] : ""}>
                      <td>{user.username}</td>
                      <td>{user.name}</td>
                      <td>{user.email}</td>
                      <td>{user.municipalityName}</td>
                      <td>{user.organizationName}</td>
                      <td>{user.userRole}</td>
                      <td>{user.deleted ? "🗑️" : onlineStatus ? "🟢" : "🔴"}</td>
                      <td
                        onClick={(e) => {
                          show(e, { props: user.id });
                        }}
                        class={styles.actions}
                      >
                        <FaSolidEllipsis />
                        <Menu id={user.id} animation={_animation()} theme={theme() === "dark" ? "dark" : "light"}>
                          <Item onClick={() => handleEditUser(user.id)} disabled={user.userRole == "Administrator"}>
                            ✏️ Edit
                          </Item>
                          <Item
                            onClick={() => handleDeleteUser(user.id)}
                            disabled={user.userRole === "Administrator" || user.deleted}
                          >
                            🗑️ Delete
                          </Item>
                          <Separator />
                          <Item
                            onClick={() => handleLogOutUser(user.id, user.username)}
                            disabled={
                              user.userRole === "Administrator" ||
                              !onlineStatus ||
                              user.needsToBeLoggedOut ||
                              user.deleted
                            }
                          >
                            🚶 Log out
                          </Item>
                        </Menu>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </Header>
  );
};

export default Users;
