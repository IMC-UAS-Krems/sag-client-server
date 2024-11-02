import { createSignal, onMount, Component } from "solid-js";

import { FaSolidEllipsis } from "solid-icons/fa";
import { ContextMenu } from "@kobalte/core/context-menu";
import { useNavigate } from "@solidjs/router";
import Swal from "sweetalert2";

import { eden } from "@client/api";
import { handleUnauthorized } from "@client/utils/authUtils";
import styles from "@styles/Organisations.module.css";
import menu_styles from "@styles/ContextMenu.module.css";
import { OrganisationDetails } from "@server/types";
import Header from "@client/components/Header";

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

  return (
    <Header>
      <main class={styles["organisations-main"]}>
        <h1>Admin Organisations page</h1>
        <div class={styles["nav-button-container"]}>
          <button onClick={handleCreateOrganisation} class={styles["nav-button"]}>
            Create new organisation
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
                  <th>Name</th>
                  <th>Municipality</th>
                  <th>Verified</th>
                  <th>Number of members</th>
                  <th>CreatedAt</th>
                  <th>UpdatedAt</th>
                  <th>Actions</th>
                </tr>
              </thead>

              <tbody>
                {organisations().map((organisation) => {
                  const verifiedStatus = organisation.verified ? "✅" : "❌";

                  return (
                    <tr>
                      <td>{organisation.name}</td>
                      <td>{organisation.municipality.name}</td>
                      <td>{verifiedStatus}</td>
                      <td>{organisation.users.length}</td>
                      <td>{new Date(organisation.createdAt).toLocaleString()}</td>
                      <td>{organisation.updatedAt ? new Date(organisation.updatedAt).toLocaleString() : ""}</td>
                      <td class={menu_styles.actions}>
                        <ContextMenu>
                          <ContextMenu.Trigger class={menu_styles["trigger"]}>
                            <FaSolidEllipsis />
                          </ContextMenu.Trigger>
                          <ContextMenu.Content class={menu_styles["context-menu__content"]}>
                            <ContextMenu.Item
                              onClick={() => handleEditOrganisation(organisation.id)}
                              class={menu_styles["context-menu__item"]}
                            >
                              ✏️ Edit
                            </ContextMenu.Item>
                            <ContextMenu.Item
                              onClick={() => handleDeleteOrganisation(organisation.id)}
                              class={menu_styles["context-menu__item"]}
                            >
                              🗑️ Delete
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

export default Organisations;
