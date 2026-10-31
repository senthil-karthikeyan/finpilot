import { redirect } from "next/navigation";

/**
 * The root path "/" simply redirects to the login page.
 * All actual pages live under (app)/ or (auth)/ route groups
 * which are added in the web feature branches.
 */
export default function Home() {
  redirect("/login");
}
