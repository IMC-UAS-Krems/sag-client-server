import Header from "@client/components/Header";
import { Component, createSignal, onMount } from "solid-js";
import { Menu, Item, useContextMenu, animation, Submenu, Separator } from "solid-contextmenu";
import { eden } from "@client/api";
import Swal from "sweetalert2";

import "../../../node_modules/solid-contextmenu/dist/style.css";
import styles from "@styles/Users.module.css";

const MENU_ID = "menu-id";

// TODO: If user is not an admin, they should not be able to access this page
const Users: Component = () => {
  // User data
  const [users, setUsers] = createSignal([]);
  const [loading, setLoading] = createSignal(true);
  const [error, setError] = createSignal(null);

  onMount(async () => {
    try {
      const fetchedUsers = await eden.admin.users.get({
        $fetch: {
          mode: "cors",
          credentials: "include",
          method: "GET",
        },
      });
      setUsers(fetchedUsers.data);
      console.log("Fetch:", fetchedUsers);
      console.log("Fetched users:", fetchedUsers.data);
    } catch (error) {
      setError("Failed to fetch users");
      console.error("Failed to fetch users:", error);
    } finally {
      setLoading(false);
    }
  });

  async function handleCreateUser() {
    // console.log("Create user");
    const { value: formValues } = await Swal.fire({
      title: "Multiple inputs",
      html: `
        <p>Name:</p>
        <input id="swal-input1" class="swal2-input">
        <p>Email:</p>
        <input id="swal-input2" class="swal2-input">
        <p>Userame:</p>
        <input id="swal-input3" class="swal2-input">
        <p>Password:</p>
        <input id="swal-input4" class="swal2-input">
        <p>Municipality:</p>
        <input id="swal-input5" class="swal2-input">
        <p>Organisation:</p>
        <input id="swal-input6" class="swal2-input">
      `,
      focusConfirm: false,
      preConfirm: () => {
        return [
          document.getElementById("swal-input1").value,
          document.getElementById("swal-input2").value,
          document.getElementById("swal-input3").value,
          document.getElementById("swal-input4").value,
          document.getElementById("swal-input5").value,
          document.getElementById("swal-input6").value,
        ];
      },
    });
    if (formValues) {
      Swal.fire(JSON.stringify(formValues));
    }
  }

  async function handleEditUser() {
    console.log("Editing user");
    const { value: formValues } = await Swal.fire({
      title: "Multiple inputs",
      html: `
        <p>Name:</p>
        <input id="swal-input1" class="swal2-input">
        <p>Email:</p>
        <input id="swal-input2" class="swal2-input">
        <p>Userame:</p>
        <input id="swal-input3" class="swal2-input">
        <p>Password:</p>
        <input id="swal-input4" class="swal2-input">
        <p>Municipality:</p>
        <input id="swal-input5" class="swal2-input">
        <p>Organisation:</p>
        <input id="swal-input6" class="swal2-input">
      `,
      focusConfirm: false,
      preConfirm: () => {
        return [
          document.getElementById("swal-input1").value,
          document.getElementById("swal-input2").value,
          document.getElementById("swal-input3").value,
          document.getElementById("swal-input4").value,
          document.getElementById("swal-input5").value,
          document.getElementById("swal-input6").value,
        ];
      },
    });
    if (formValues) {
      Swal.fire(JSON.stringify(formValues));
    }
  }

  async function handleDeleteUser(userId: string) {
    console.log("Deleting user");
    Swal.fire({
      title: "Are you sure?",
      text: "You won't be able to revert this!",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#3085d6",
      cancelButtonColor: "#d33",
      confirmButtonText: "Yes, delete it!",
    }).then(async (result) => {
      // Added async here
      if (result.isConfirmed) {
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
      }
    });
  }

  const [_animation, setAnimation] = createSignal(animation.scale);
  const [_theme, setTheme] = createSignal<"light" | "dark">("light");
  const { show } = useContextMenu({ id: MENU_ID, props: "lala" });
  return (
    <Header>
      <main class={styles.usersMain}>
        <h1>Admin users page</h1>
        <button onClick={handleCreateUser}>Create new user</button>
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
            {users().map((user) => (
              <tr key={user.id}>
                <td>{user.username}</td>
                <td>{user.name}</td>
                <td>{user.email}</td>
                <td>{user.municipalityId}</td>
                <td>{user.organizationId}</td>
                {/* <td>{user.loggedIn ? '🟢' : '🔴'}</td> */}
                <td>🔴</td>
                <td
                  onContextMenu={(e) => {
                    show(e, { props: user.id });
                  }}
                >
                  ...
                  <Menu id={MENU_ID} animation={_animation()} theme={_theme()}>
                    <Item onClick={() => handleEditUser()}>✏️ Edit</Item>
                    <Item onClick={() => handleDeleteUser(user.id)}>🗑️ Delete</Item>
                    {/* <Item onClick={() => handleEditUser(user.id)}>✏️ Edit</Item>
                    <Item onClick={() => handleDeleteUser(user.id)}>🗑️ Delete</Item> */}
                    <Separator />
                    <Item disabled>🚶 Log out</Item>
                    {/* <Item disabled={!user.loggedIn}>🚶 Log out</Item> */}
                  </Menu>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </main>
    </Header>
  );
};

export default Users;
