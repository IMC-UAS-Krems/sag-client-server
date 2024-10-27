import { Component, createSignal, onMount, createEffect } from "solid-js";

import { FaSolidEllipsis } from "solid-icons/fa";
import { ContextMenu } from "@kobalte/core/context-menu";
import { useNavigate } from "@solidjs/router";
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

const Users: Component = () => {
  const navigate = useNavigate();
  const loggedInUser = authStore.state().email;
  const loggedInTimespan =
    Number(import.meta.env.VITE_LOGGED_IN_TIMESPAN) || panic("VITE_LOGGED_IN_TIMESPAN environment variable not set");

  const [users, setUsers] = createSignal<UserDetails[]>([]);
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

  const filteredUsers = () => {
    return showDeleted() ? users() : users().filter((user) => !user.deleted);
  };

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
            setUsers(fetchedUsers.data);
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
            setUsers((prevUsers) =>
              prevUsers.map((user) =>
                user.id === userId ? { ...user, needsToBeLoggedOut: true, deleted: true } : user,
              ),
            );
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
            setUsers((prevUsers) =>
              prevUsers.map((user) => (user.id === userId ? { ...user, needsToBeLoggedOut: true } : user)),
            );
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
                  // const { show } = useContextMenu({ id: user.id });
                  // const onlineStatus = onlineStatuses()[user.id];
                  let onlineStatus = false;
                  if (!user.lastTimeActive) {
                    onlineStatus = false;
                  } else {
                    console.log("Now is:", now());
                    onlineStatus =
                      !user.needsToBeLoggedOut &&
                      now() - new Date(user.lastTimeActive).getTime() < loggedInTimespan * 1000;
                    console.log(
                      "User:",
                      user.username,
                      "Online status:",
                      onlineStatus,
                      "Login difference:",
                      now() - new Date(user.lastTimeActive).getTime(),
                    );
                  }

                  return (
                    <tr class={user.email == loggedInUser && !user.deleted ? styles["logged-in-user"] : ""}>
                      <td>{user.username}</td>
                      <td>{user.name}</td>
                      <td>{user.email}</td>
                      <td>{user.municipality?.name}</td>
                      <td>{user.organization?.name}</td>
                      <td>{user.userRole}</td>
                      <td>{user.deleted ? "🗑️" : onlineStatus ? "🟢" : "🔴"}</td>
                      <td class={menu_styles.actions}>
                        <ContextMenu>
                          <ContextMenu.Trigger class={menu_styles["trigger"]}>
                            <FaSolidEllipsis />
                          </ContextMenu.Trigger>
                          <ContextMenu.Content class={menu_styles["context-menu__content"]}>
                            <ContextMenu.Item
                              class={menu_styles["context-menu__item"]}
                              onSelect={() => handleEditUser(user.id)}
                              disabled={user.userRole == "Administrator"}
                            >
                              ✏️ Edit
                            </ContextMenu.Item>
                            <ContextMenu.Item
                              class={menu_styles["context-menu__item"]}
                              onSelect={() => handleDeleteUser(user.id)}
                              disabled={user.userRole === "Administrator" || user.deleted}
                            >
                              🗑️ Delete
                            </ContextMenu.Item>
                            <ContextMenu.Separator />
                            <ContextMenu.Item
                              class={menu_styles["context-menu__item"]}
                              onSelect={() => handleLogOutUser(user.id, user.name)}
                              disabled={user.userRole == "Administrator" || !onlineStatus}
                            >
                              🔒 Log out
                            </ContextMenu.Item>
                          </ContextMenu.Content>
                        </ContextMenu>
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
