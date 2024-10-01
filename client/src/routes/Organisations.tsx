import { eden } from "@client/api";
import { createSignal, onMount, Component } from "solid-js";
import { useNavigate } from "@solidjs/router";
import { Menu, Item, useContextMenu, animation, Separator } from "solid-contextmenu";
import styles from "@styles/Organisations.module.css";
import { theme } from "@store/index";
import { FaSolidEllipsis } from "solid-icons/fa";


import { handleUnauthorized} from "@client/utils/authUtils";
import { OrganisationDetails } from "@server/types";
import Header from "@client/components/Header";


const Organisations: Component = () => {

  const navigate = useNavigate();

  const [error, setError] = createSignal<string | null>(null);
  const [loading, setLoading] = createSignal(true);
  const [_animation] = createSignal(animation.scale);

  const [organisations, setOrganisations] = createSignal<OrganisationDetails[]>([]);

  onMount(async () => {
    await fetchOrganisations();
  });

  async function fetchOrganisations() {
    try{
      const fetchedOrganisations = await eden.admin.organisations.get({
        $fetch: {
          mode: "cors",
          credentials: "include",
          method: "GET",
        },
      });

      if (fetchedOrganisations.status === 401 || fetchedOrganisations.status === 403) {
        handleUnauthorized(navigate);
        return;
      }

      if (fetchedOrganisations.data) {
        if (fetchedOrganisations.status !== 200) {
          if (!Array.isArray(fetchedOrganisations.data) && "error" in fetchedOrganisations.data) {
            setError(fetchedOrganisations.data.error || "Unknown error");
          } else {
            throw new Error("Failed to fetch users, data is not correct form");
          }
        } else {
          if (Array.isArray(fetchedOrganisations.data)) {
            setOrganisations(fetchedOrganisations.data);
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

  return (
    <Header>
      <main class={styles["users-main"]}>
        <h1>Admin Organisations page</h1>
        <div class={styles["nav-button-container"]}>
          <button onClick={(e)=>{console.log(e)}} class={styles["nav-button"]}>
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
                  <th>CreatedAt</th>
                  <th>UpdatedAt</th>
                  <th>Actions</th>
                </tr>
              </thead>

              <tbody>
                {organisations().map((organisation) => {
                  const { show } = useContextMenu({ id: organisation.id });
                  const verifiedStatus = organisation.verified ? "✅" : "❌";

                  return (
                    <tr>
                      <td>{organisation.name}</td>
                      <td>{organisation.municipality.name}</td>
                      <td>{verifiedStatus}</td>
                      <td>{new Date(organisation.createdAt).toLocaleString()}</td>
                      <td>{organisation.updatedAt ? new Date(organisation.updatedAt).toLocaleString() : ""}</td>
                      <td
                        onClick={(e) => {
                          show(e, { props: organisation.id });
                        }}
                        class={styles.actions}
                      >
                        <FaSolidEllipsis />
                        <Menu id={organisation.id} animation={_animation()} theme={theme() === "dark" ? "dark" : "light"}>
                          <Item onClick={(e)=>{console.log(e)}} >
                            ✏️ Edit
                          </Item>
                          <Item
                            onClick={(e)=> {console.log(e)}}
                          >
                            🗑️ Delete
                          </Item>
                          <Separator />
                          <Item
                            onClick={(e)=> {console.log(e)}}
                            
                          >
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
}

export default Organisations;