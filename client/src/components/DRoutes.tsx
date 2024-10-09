import { onMount, type Component } from "solid-js";
import { Router, Route, Navigate } from "@solidjs/router";

import Home from "@client/routes/Home";
import About from "@client/routes/About";
import Editor from "@client/routes/Editor";
import SignIn from "@client/routes/SignIn";
import Users from "@client/routes/Users";
import UsersCreate from "@client/routes/UsersCreate";
import UsersEdit from "@client/routes/UsersEdit";
import Unauthorized from "@client/routes/Unauthorized";
import AuthGuard from "@client/guard/authGuard";
import authStore from "@client/store/authStore";
import Verify from "@client/routes/Verify";

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
        path="/users/create"
        component={() => (
          <AuthGuard role="Administrator">
            <UsersCreate />
          </AuthGuard>
        )}
      />

      <Route
        path="/users/edit/:userId"
        component={() => (
          <AuthGuard role="Administrator">
            <UsersEdit />
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

      <Route path="*" component={() => <Navigate href="/home" />} />
    </Router>
  );
};

export default DRoutes;
