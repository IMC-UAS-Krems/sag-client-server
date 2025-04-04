import { onMount, type Component } from "solid-js";
import { Router, Route, Navigate } from "@solidjs/router";

import Home from "@client/routes/Home.tsx";
import About from "@client/routes/About.tsx";
import Editor from "@client/routes/Editor.tsx";
import SignIn from "@client/routes/SignIn.tsx";
import Users from "@client/routes/Users.tsx";
import Unauthorized from "@client/routes/Unauthorized.tsx";
import AuthGuard from "@client/guard/authGuard.tsx";
import authStore from "@client/store/authStore.ts";
import Verify from "@client/routes/Verify.tsx";
import VerifyToken from "@client/routes/VerifyToken.tsx";
import Organisations from "@client/routes/Organisations.tsx";

const DRoutes: Component = () => {
  // Initialize auth store on app mount
  onMount(async () => {
    await authStore.initializeAuth();
  });

  return (
    <Router>
      <Route path="/home" component={Home} />
      <Route path="/about" component={About} />
      <Route path="/sign-in" component={SignIn} />
      <Route path="/unauthorized" component={Unauthorized} />
      <Route path="/verify/:token" component={VerifyToken} />

      <Route
        path="/verify"
        component={() => (
          <AuthGuard role={["Manager", "Developer"]}>
            <Verify />
          </AuthGuard>
        )}
      />

      <Route
        path="/editor"
        component={() => (
          <AuthGuard role={["Manager", "Developer"]}>
            <Editor />
          </AuthGuard>
        )}
      />

      <Route
        path="/users"
        component={() => (
          <AuthGuard role="Administrator">
            <Users />
          </AuthGuard>
        )}
      />
      <Route
        path="/organisations"
        component={() => (
          <AuthGuard role="Administrator">
            <Organisations />
          </AuthGuard>
        )}
      />

      <Route path="*" component={() => <Navigate href="/home" />} />
    </Router>
  );
};

export default DRoutes;
