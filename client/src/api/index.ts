import type { Router } from "@server/index";
import { edenTreaty } from "@elysiajs/eden";

export const eden = edenTreaty<Router>("http://localhost:9512");
