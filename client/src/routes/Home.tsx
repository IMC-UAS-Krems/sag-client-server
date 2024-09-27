import { Component, createSignal, For } from "solid-js";

import MapGL, { Viewport, Marker } from "solid-map-gl";

import Header from "@client/components/Header";
import { theme } from "@client/store";
import styles from "@styles/Home.module.css";
import "mapbox-gl/dist/mapbox-gl.css";

const [viewport, setViewport] = createSignal({
  center: [0, 52],
  zoom: 11,
} as Viewport);

const Home: Component = () => {
  return (
    <Header>
      <main class={styles["main-home-container"]}>
        <article class={styles["main-article-container"]}>
          <section class={styles["intro-section"]}>
            <h1>Sagittarius</h1>
            <p>
              The main goal of such research will be to asses how much can development be democratised by designing,
              testing and implementing human-centric interfaces that leverage the power of sofisticated DSLs and
              automated cloud orchestration.
              <br />
              Compilers play a vital role in software development by converting high-level programming languages into
              machine-readable code. In this project, the compiler is instrumental in interpreting a specialized
              language designed to describe sensor- based cloud structures and visualizations. To leverage the potential
              of IoT, this project integrates sensor data into the cloud infrastructure.
              <br />
              Sensors collect real-time data from various sources within the context of a smart city, such as
              environmental conditions, traffic patterns, and energy usage. Smart cities are urban environments where
              data-driven technologies and solutions enhance the quality of life. This project contributes to smart city
              development by utilizing sensor data and IoT to provide a comprehensive and customizable Grafana
              dashboard.
            </p>
            <p>
              The dashboard visually represents the collected sensor data, allowing non-technical users to gain insights
              into city operations and make informed decisions. By combining compilers, IoT, sensor data, and smart
              cities, this initiative streamlines development processes for non-technical individuals. The
              domain-specific language, coupled with the compiler, abstracts the complexities of the underlying
              architecture, enabling easy specification and configuration of sensor-based cloud infrastructures.
              <br />
              Non-technical professionals, including urban planners, policymakers, and administrators, can now actively
              participate in building and monitoring smart cities through this simplified approach. They can utilize the
              visualizations to gain valuable insights, identify patterns, and make data-driven decisions to improve
              infrastructure, sustainability, and livability within the city.
            </p>
          </section>
          <section class={styles["map-section-container"]}>
            <h1>Navigate the map</h1>
            <div class={styles["map-container"]}>
              <MapGL
                // style={{ border: '3px solid red', position: 'absolute', inset: 0, "z-index": -1, "border-radius": "8px" }}
                class={styles.map}
                options={{ style: `esri:${theme() === "dark" ? "world_street_night" : "world_street"}` }}
                viewport={viewport()}
                onViewportChange={(evt: Viewport) => setViewport(evt)}
              >
                <For each={[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]}>
                  {(i) => (
                    // <button onClick={() => setStyle('nav_night')}>Nav Night</button>
                    <Marker
                      lngLat={[0, 52 + i]}
                      options={{
                        color: "blue",
                        element: (
                          <svg
                            width="21"
                            height="20"
                            viewBox="0 0 21 20"
                            fill="none"
                            xmlns="http://www.w3.org/2000/svg"
                          >
                            <path
                              d="M4.98998 19.59C4.72998 19.59 4.47498 19.51 4.25498 19.35C3.86498 19.07 3.67498 18.6 3.75498 18.125L4.69498 12.635L0.709982 8.75001C0.364982 8.41501 0.244982 7.92501 0.394982 7.47001C0.544982 7.01501 0.929981 6.69001 1.40498 6.62001L6.91498 5.82001L9.37998 0.83001C9.58998 0.40001 10.02 0.13501 10.5 0.13501C10.98 0.13501 11.41 0.40001 11.62 0.83001L14.085 5.82001L19.595 6.62001C20.07 6.69001 20.455 7.01501 20.605 7.47001C20.755 7.92501 20.63 8.41501 20.29 8.75001L16.305 12.635L17.245 18.12C17.325 18.595 17.135 19.06 16.745 19.345C16.355 19.625 15.855 19.66 15.43 19.44L10.5 16.85L5.56998 19.44C5.38498 19.535 5.18498 19.585 4.98498 19.585L4.98998 19.59ZM10.5 15.16L15.68 17.88L14.69 12.115L18.88 8.03001L13.09 7.19001L10.5 1.94501L7.90998 7.19001L2.11998 8.03001L6.30998 12.115L5.31998 17.88L10.5 15.16Z"
                              fill="white"
                            />
                          </svg>
                        ),
                      }}
                      popup={{ closeButton: false, anchor: "left" }}
                    >
                      Ciao Cataldo
                    </Marker>
                  )}
                  {/* <button onClick={() => setStyle('nav_night')}>Nav Night</button> */}
                </For>
              </MapGL>
            </div>
          </section>
        </article>
      </main>
    </Header>
  );
};

export default Home;
