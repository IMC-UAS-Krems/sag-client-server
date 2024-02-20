import type { Router } from "@server/index";
import { edenTreaty } from "@elysiajs/eden";

// export const eden = edenTreaty<Router>("http://localhost:9512");
const serverUrl = import.meta.env.VITE_SERVER_URL || "http://localhost:9512";


export const eden = edenTreaty<Router>(
    `${serverUrl}`
);
