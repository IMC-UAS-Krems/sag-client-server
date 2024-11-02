import { useNavigate } from "@solidjs/router";

export async function handleUnauthorized(navigate: ReturnType<typeof useNavigate>) {
  console.log("Handling unauthorized user");
  navigate("/unauthorized");
}
