import Header from "@client/components/Header";
import { Component, createSignal, onMount } from "solid-js";
import { Menu, Item, useContextMenu, animation, Separator } from "solid-contextmenu";
import { eden } from "@client/api";
import { useNavigate } from "@solidjs/router";
import authStore from "@store/authStore";
import { handleUnauthorized } from "@client/utils/authUtils";

import Swal from "sweetalert2";
// import authStore from "@store/authStore";

import "../../../node_modules/solid-contextmenu/dist/style.css";
import styles from "@styles/Users.module.css";

import { isUserOnline } from "@client/utils/authUtils";

// User interface
interface User {
  id: string;
  username: string;
  name: string;
  email: string;
  municipalityId: string;
  organizationId: string;
  municipalityName: string;
  organizationName: string;
  needsToBeLoggedOut: boolean;
}

// Response structure
interface UsersResponse {
  data: User[] | null;
  error: string | null;
  status: number;
  response: { 200: string | number | boolean | object };
  headers: Record<string, string>;
}

const Users: Component = () => {
  const navigate = useNavigate();
  const loggedInUser = authStore.state().user;
  console.log("Auth store:", authStore.state());
  console.log("Logged in user:", loggedInUser);

  // User data
  const [users, setUsers] = createSignal<User[]>([]);
  const [loading, setLoading] = createSignal(true);
  const [error, setError] = createSignal<string | null>(null);
  const [onlineStatuses, setOnlineStatuses] = createSignal<Record<string, boolean>>({});

  onMount(async () => {
    try {
      const fetchedUsers: UsersResponse = await eden.admin.users.get({
        $fetch: {
          mode: "cors",
          credentials: "include",
          method: "GET",
        },
      });

      // Unauthorized check - we are passing navigation function to handleUnauthorized
      if (fetchedUsers.status === 401) {
        handleUnauthorized(navigate);
        return;
      }

      if (fetchedUsers.data) {
        if (fetchedUsers.data.status === "error") {
          setError(fetchedUsers.data.error || "Unknown error");
        } else {
          setUsers(fetchedUsers.data);
          await updateOnlineStatuses(fetchedUsers.data)
          console.log("Fetch:", fetchedUsers);
          console.log("Fetched users:", fetchedUsers.data);
        }
      } else {
        setError(fetchedUsers.error || "Unknown error");
      }
    } catch (error) {
      setError("Failed to fetch users");
      console.error("Failed to fetch users:", error);
    } finally {
      setLoading(false);
    }
  });

  async function updateOnlineStatuses(users: User[]) {
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
    console.log("Deleting user:", userId);
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
          const deletedUser = await eden.admin.users.delete({
            userId: userId,
            $fetch: {
              mode: "cors",
              credentials: "include",
              method: "DELETE",
            },
          });

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
            setUsers((prev) => prev.filter((user) => user.id !== userId));
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

  async function handleLogOutUser(userId: string) {
    console.log("Logging out user:", userId);
    Swal.fire({
      title: "Are you sure?",
      text: "This will log out the user.",
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
          }
          const response = await eden.admin["logout-user"].post({
            ...requestBody,
            $fetch: {
              mode: "cors",
              credentials: "include",
              method: "POST",
            },
          });
          console.log("Response:", response);

          if (!response.data || response.error) {
            console.log("Failed to log out user:", response.error);
            Swal.fire({
              title: "Error",
              text: "Couldn't log out the user",
              icon: "error",
            });
            return;
          }

          if (response.status !== 200 || response.data.error) {
            console.log("Failed to log out user:", response.data.error);
            Swal.fire({
              title: "Error",
              text: "Couldn't log out the user",
              icon: "error",
            });
            return;
          } else {
            Swal.fire("Logged out!", "The user has been logged out.", "success");
            await updateOnlineStatuses(users());
            setUsers([...users()]);
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
  }

  const [_animation, setAnimation] = createSignal(animation.scale);
  const [_theme, setTheme] = createSignal<"light" | "dark">("light");

  return (
    <Header>
      <main class={styles.usersMain}>
        <h1>Admin users page</h1>
        <button onClick={handleCreateUser} class={styles.navButton}>
          Create new user
        </button>
        {loading() ? (
          <div class={styles.loader}></div>
        ) : error() ? (
          <p class={styles.errorText}>Error: {error()}</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Username</th>
                <th>Name</th>
                <th>E-mail address</th>
                <th>Municipality</th>
                <th>Organisation</th>
                <th>Logged in</th>
                <th>Actions (right click)</th>
              </tr>
            </thead>

            <tbody>
              {users().map((user) => {
                const { show } = useContextMenu({ id: user.id });
                const onlineStatus = onlineStatuses()[user.id];

                return (
                  // TODO: Highlighting the logged in user works, but it disappears on page reload
                  <tr class={user.email == loggedInUser ? styles.loggedInUser : ""}>
                    <td>{user.username}</td>
                    <td>{user.name}</td>
                    <td>{user.email}</td>
                    <td>{user.municipalityName}</td>
                    <td>{user.organizationName}</td>
                    <td>{onlineStatus ? "🟢" : "🔴"}</td>
                    <td
                      onContextMenu={(e) => {
                        show(e, { props: user.id });
                      }}
                    >
                      ...
                      <Menu id={user.id} animation={_animation()} theme={_theme()}>
                        <Item onClick={() => handleEditUser(user.id)}>✏️ Edit</Item>
                        <Item onClick={() => handleDeleteUser(user.id)}>🗑️ Delete</Item>
                        <Separator />
                        <Item onClick={() => handleLogOutUser(user.id)}>🚶 Log out</Item>
                      </Menu>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </main>
    </Header>
  );
};

export default Users;
