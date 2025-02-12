import { Component, createSignal, For } from "solid-js";

import MapGL, { Viewport, Marker } from "solid-map-gl";

import Header from "@client/components/Header";
import { theme } from "@client/store";
import styles from "@styles/Home.module.css";
import "mapbox-gl/dist/mapbox-gl.css";

import { Image } from "@kobalte/core";
import imc from "@assets/home/imc.jpg";
import compiler from "@assets/home/compiler.png";
import grafana from "@assets/home/grafana.png";
import imcLogo from "@assets/logos/logo_imc.png";

import { FaSolidLightbulb, FaSolidCode, FaSolidCloud } from "solid-icons/fa";

const [viewport, setViewport] = createSignal({
  center: [15.6167, 48.4100],
  zoom: 11,
} as Viewport);

const Home: Component = () => {

  return (
    <Header>
      <main class={styles["main-container"]}>
        <div class={styles["main-container__header"]}>
          <h1 class={styles["main-container__tittle"]}>Sagittarius</h1>
        </div>

        <section>
          <p class={styles["image-section-description"]}>The main goal of such research will be to asses how much can development be democratised by designing, testing and implementing human-centric interfaces that leverage the power of sofisticated DSLs and automated cloud orchestration.</p>
        </section>

        <section class={styles["benefits-section"]}>
          <h2 class={styles["benefits-section__main-title"]}>Key Benefits</h2>

          <div class={styles["benefits-container"]}>
            <div class={styles["benefits-item"]}>
              <FaSolidLightbulb class={styles.icon} />
              <h3 class={styles["benefits-item__title"]}>Visual Insights</h3>
              <p>The dashboard visually represents the collected sensor data, allowing non-technical users to gain insights into city operations and make informed decisions.</p>
            </div>

            <div class={styles["benefits-item"]}>
              <FaSolidCode class={styles.icon} />
              <h3 class={styles["benefits-item__title"]}>Streamlined Development</h3>
              <p>By combining compilers, IoT, sensor data, and smart cities, this initiative streamlines development processes for non-technical individuals.</p>
            </div>

            <div class={styles["benefits-item"]}>
              <FaSolidCloud class={styles.icon} />
              <h3 class={styles["benefits-item__title"]}>Easy Cloud Configuration</h3>
              <p>The domain-specific language, coupled with the compiler, abstracts the complexities of the underlying architecture, enabling easy specification and configuration of sensor-based cloud infrastructures.</p>
            </div>
          </div>
        </section>
        <section class={styles["image-section-container"]}>
          <p class={styles["image-section-description"]}>
            Compilers play a vital role in software development by converting high-level programming languages into machine-readable code. In this project, the compiler is instrumental in interpreting a specialized language designed to describe sensor- based cloud structures and visualizations. To leverage the potential of IoT, this project integrates sensor data into the cloud infrastructure.
          </p>
          <Image.Root fallbackDelay={600} class={styles["image-container"]}>
            <Image.Img class={styles["image"]} src={compiler} alt="Compiler Interface" />
            <Image.Fallback class={styles["image-fallback"]}>Compiler Interface</Image.Fallback>
          </Image.Root>
        </section>
        <section class={styles["image-section-container"]}>
          <Image.Root fallbackDelay={600} class={styles["image-container"]}>
            <Image.Img class={styles["image"]} src={grafana} alt="Grafana Dashboard" />
            <Image.Fallback class={styles["image-fallback"]}>Grafana Dashboard</Image.Fallback>
          </Image.Root>
          <p class={styles["image-section-description"]}>Sensors collect real-time data from various sources within the context of a smart city, such as environmental conditions, traffic patterns, and energy usage. Smart cities are urban environments where data-driven technologies and solutions enhance the quality of life. This project contributes to smart city development by utilizing sensor data and IoT to provide a comprehensive and customizable Grafana dashboard.</p>
        </section>
        <section class={styles["dashboard-section-description__container"]}>

          <section class={styles["workflow-section-container"]}>
            <h2>Workflow</h2>

            <div class={styles["workflow-section-container-items__container"]}>
              <div class={styles["workflow-section-container__item"]}>
                <h3>Write in Compiler</h3>
                <p>
                  Developers use a domain-specific language (DSL) to describe sensor-based cloud structures and visualizations.
                </p>
              </div>

              <div class={styles["workflow-section-container__item"]}>
                <h3>Deploy in Cloud</h3>
                <p>
                  The code is compiled and deployed to a cloud-based infrastructure that supports IoT integration.
                </p>
              </div>

              <div class={styles["workflow-section-container__item"]}>
                <h3>Monitor with Grafana</h3>
                <p>
                  Sensor data is visualized in Grafana, providing insights for smart city applications.
                </p>
              </div>
            </div>
            <p>
              The dashboard visually represents the collected sensor data, allowing non-technical users to gain insights into city operations and make informed decisions. By combining compilers, IoT, sensor data, and smart cities, this initiative streamlines development processes for non-technical individuals. The domain-specific language, coupled with the compiler, abstracts the complexities of the underlying architecture, enabling easy specification and configuration of sensor-based cloud infrastructures.
            </p>
          </section>
        </section>

        <section class={styles["map-section-container"]}>
          <h1 class={styles["map-section-title"]}>Navigate the map</h1>
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

        <section class={styles["imc-section-container"]}>
          <div class={styles["imc-section-inner"]}>
            <div class={styles["imc-text-container"]}>
              <img src={imcLogo} alt="IMC Logo" class={styles["imc-section-logo"]} />
              <h2>Developed at IMC Hochschule für Angewandte Wissenschaften Krems</h2>
              <p>
                This project was developed at IMC Hochschule für Angewandte Wissenschaften Krems, a university known for innovation
                in technology and research.
              </p>
            </div>
            <div class={styles["imc-image-container"]}>
              <Image.Root fallbackDelay={600} class={styles["image-container"]}>
                <Image.Img
                  class={styles["image"]}
                  src={imc}
                  alt="IMC Krems University"
                />
                <Image.Fallback class={styles["image-fallback"]}>
                  IMC Krems University
                </Image.Fallback>
              </Image.Root>
            </div>
          </div>
        </section>

      </main>
    </Header>
  );
}

export default Home;