import { Component, createSignal, For } from "solid-js";

import MapGL, { Viewport, Marker } from "solid-map-gl";

import Header from "@client/components/Header.tsx";
import { theme } from "@client/store/index.ts";
import "mapbox-gl/dist/mapbox-gl.css";

import { Image } from "@kobalte/core";
import imc from "@assets/home/imc.webp";
import compiler from "@assets/home/compiler.webp";
import grafana from "@assets/home/grafana.webp";
import imcLogo from "@assets/logos/logo_imc.png";

import { FaSolidLightbulb, FaSolidCode, FaSolidCloud } from "solid-icons/fa";

const [viewport, setViewport] = createSignal({
  center: [15.6167, 48.41],
  zoom: 11,
} as Viewport);

const Home: Component = () => {
  return (
    <Header>
      <main class="flex flex-col justify-center items-center py-16 my-16">
        <h1 class="text-5xl font-bold mb-8">Sagittarius</h1>
        <section>
          <p class="text-lg text-center max-w-[60%] mx-auto">
            The main goal of such research will be to asses how much can development be democratised by designing,
            testing and implementing human-centric interfaces that leverage the power of sofisticated DSLs and automated
            cloud orchestration.
          </p>
        </section>

        <section class="text-center mt-32">
          <h2 class="text-3xl font-bold mb-8">Key Benefits</h2>

          <div class="flex flex-wrap justify-center max-w-[1200px] mx-auto gap-10">
            <div class="flex flex-col justify-center items-center rounded-lg drop-shadow-md p-6 bg-secondary w-72 transition-all hover:translate-y-[-2px] hover:drop-shadow-lg">
              <FaSolidLightbulb class="w-8 h-8 mb-3 text-blue-400" />
              <h3 class="text-xl font-bold mb-2">Visual Insights</h3>
              <p>
                The dashboard visually represents the collected sensor data, allowing non-technical users to gain
                insights into city operations and make informed decisions.
              </p>
            </div>

            <div class="flex flex-col justify-center items-center rounded-lg drop-shadow-md p-6 bg-secondary w-72 transition-all hover:translate-y-[-2px] hover:drop-shadow-lg">
              <FaSolidCode class="w-8 h-8 mb-3 text-blue-400" />
              <h3 class="text-xl font-bold mb-2">Streamlined Development</h3>
              <p>
                By combining compilers, IoT, sensor data, and smart cities, this initiative streamlines development
                processes for non-technical individuals.
              </p>
            </div>

            <div class="flex flex-col justify-center items-center rounded-lg drop-shadow-md p-6 bg-secondary w-72 transition-all hover:translate-y-[-2px] hover:drop-shadow-lg">
              <FaSolidCloud class="w-8 h-8 mb-3 text-blue-400" />
              <h3 class="text-xl font-bold mb-2">Easy Cloud Configuration</h3>
              <p>
                The domain-specific language, coupled with the compiler, abstracts the complexities of the underlying
                architecture, enabling easy specification and configuration of sensor-based cloud infrastructures.
              </p>
            </div>
          </div>
        </section>

        <section class="flex flex-col lg:flex-row items-center gap-8 px-4 lg:px-24 mt-32">
          {/* Text Section */}
          <div class="lg:basis-1/2">
            <p class="text-center lg:text-right text-lg">
              Compilers play a vital role in software development by converting high-level programming languages into
              machine-readable code. In this project, the compiler is instrumental in interpreting a specialized
              language designed to describe sensor-based cloud structures and visualizations. To leverage the potential
              of IoT, this project integrates sensor data into the cloud infrastructure.
            </p>
          </div>
          {/* Image Section */}
          <div class="lg:basis-1/2 flex justify-center">
            <div class="w-full max-w-md rounded overflow-hidden">
              <Image.Root fallbackDelay={600} class="w-full">
                <Image.Img class="block w-full" src={compiler} alt="Compiler Interface" />
                <Image.Fallback class="flex justify-center items-center bg-accent h-45 select-none">
                  Compiler Interface
                </Image.Fallback>
              </Image.Root>
            </div>
          </div>
        </section>

        <section class="flex flex-col lg:flex-row-reverse items-center gap-8 px-4 lg:px-24 mt-32">
          {/* Text Section */}
          <div class="lg:basis-1/2">
            <p class="text-center lg:text-left text-lg">
              Sensors collect real-time data from various sources within the context of a smart city, such as
              environmental conditions, traffic patterns, and energy usage. Smart cities are urban environments where
              data-driven technologies and solutions enhance the quality of life. This project contributes to smart city
              development by utilizing sensor data and IoT to provide a comprehensive and customizable Grafana
              dashboard.
            </p>
          </div>
          {/* Image Section */}
          <div class="lg:basis-1/2 flex justify-center">
            <div class="w-full max-w-md rounded overflow-hidden">
              <Image.Root fallbackDelay={600} class="w-full">
                <Image.Img class="block w-full" src={grafana} alt="Grafana Dashboard" />
                <Image.Fallback class="flex justify-center items-center bg-accent h-45 select-none">
                  Grafana Dashboard Image
                </Image.Fallback>
              </Image.Root>
            </div>
          </div>
        </section>

        <section class="text-center mt-32">
          <h2 class="text-3xl font-bold mb-8">Workflow</h2>

          <div class="flex flex-wrap justify-center max-w-[1200px] mx-auto gap-10">
            <div class="flex flex-col justify-center items-center rounded-lg drop-shadow-md p-6 bg-secondary w-72 transition-all hover:translate-y-[-2px] hover:drop-shadow-lg">
              <div class="bg-blue-400 rounded-4xl px-4 py-2 text-secondary font-bold text-lg mb-2">Step 1</div>
              <h3 class="text-xl font-bold mb-2">Write in Compiler</h3>
              <p>
                Developers use a domain-specific language (DSL) to describe sensor-based cloud structures and
                visualizations.
              </p>
            </div>

            <div class="flex flex-col justify-center items-center rounded-lg drop-shadow-md p-6 bg-secondary w-72 transition-all hover:translate-y-[-2px] hover:drop-shadow-lg">
              <div class="bg-blue-400 rounded-4xl px-4 py-2 text-secondary font-bold text-lg mb-2">Step 2</div>
              <h3 class="text-xl font-bold mb-2">Deploy in Cloud</h3>
              <p>The code is compiled and deployed to a cloud-based infrastructure that supports IoT integration.</p>
            </div>

            <div class="flex flex-col justify-center items-center rounded-lg drop-shadow-md p-6 bg-secondary w-72 transition-all hover:translate-y-[-2px] hover:drop-shadow-lg">
              <div class="bg-blue-400 rounded-4xl px-4 py-2 text-secondary font-bold text-lg mb-2">Step 3</div>
              <h3 class="text-xl font-bold mb-2">Monitor with Grafana</h3>
              <p>Sensor data is visualized in Grafana, providing insights for smart city applications.</p>
            </div>
          </div>

          <p class="text-lg text-center max-w-[70%] mx-auto mt-16">
            The dashboard visually represents the collected sensor data, allowing non-technical users to gain insights
            into city operations and make informed decisions. By combining compilers, IoT, sensor data, and smart
            cities, this initiative streamlines development processes for non-technical individuals. The domain-specific
            language, coupled with the compiler, abstracts the complexities of the underlying architecture, enabling
            easy specification and configuration of sensor-based cloud infrastructures.
          </p>
        </section>

        <section class="mt-32 w-full text-center">
          <h2 class="text-3xl font-bold mb-8">Navigate the map</h2>
          <div class="h-[500px] w-[85%] mx-auto rounded overflow-hidden">
            <MapGL
              // style={{ border: '3px solid red', position: 'absolute', inset: 0, "z-index": -1, "border-radius": "8px" }}
              class="w-full h-full"
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
                        <svg width="21" height="20" viewBox="0 0 21 20" fill="none" xmlns="http://www.w3.org/2000/svg">
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

        <section class="flex flex-col lg:flex-row items-center gap-8 px-4 lg:px-24 mt-32">
          {/* Text Section with extra logo */}
          <div class="lg:basis-2/3 flex flex-col gap-4">
            {/* Logo container */}
            <div class="flex justify-center lg:justify-start">
              <img src={imcLogo} alt="IMC Logo" class="w-44 h-auto" />
            </div>
            {/* Text Block */}
            <div class="text-center lg:text-left">
              <p class="mt-2 text-lg">
                This project was developed at <b>IMC Hochschule für Angewandte Wissenschaften Krems</b>, a university
                known for innovation in technology and research.
              </p>
            </div>
          </div>
          {/* Image Section */}
          <div class="lg:basis-1/3 flex justify-center">
            <div class="w-full max-w-md rounded overflow-hidden">
              <Image.Root fallbackDelay={600} class="w-full">
                <Image.Img class="block w-full" src={imc} alt="IMC Krems University" />
                <Image.Fallback class="flex justify-center items-center bg-accent select-none p-4">
                  IMC Krems University
                </Image.Fallback>
              </Image.Root>
            </div>
          </div>
        </section>
      </main>
    </Header>
  );
};

export default Home;
