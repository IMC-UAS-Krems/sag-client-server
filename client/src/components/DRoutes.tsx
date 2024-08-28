import { type Component } from "solid-js";

import { Router, Route, Navigate, useNavigate } from "@solidjs/router";

import Home from "@client/routes/Home";
import About from "@client/routes/About";
import Editor from "@client/routes/Editor";
import SignIn from "@client/routes/SignIn";
import Users from "@client/routes/Users";
import UsersCreate from "@client/routes/UsersCreate";
import UsersEdit from "@client/routes/UsersEdit";
import authStore from "@store/authStore";

interface ProtectedRouteProps {
  component: Component;
}

const ProtectedRoute: Component<ProtectedRouteProps> = (props) => {
  const navigate = useNavigate();
  const isAuthenticated = authStore.state().isAuthenticated;

  if (!isAuthenticated) {
    navigate("/sign-in");
    return null;
  }

  return <props.component />;
};

const DRoutes: Component = () => {
  return (
    <>
      <Router>
        <Route path="/sign-in" component={SignIn} />
        <Route path="/editor" component={() => <ProtectedRoute component={Editor} />} />
        <Route path="/about" component={() => <ProtectedRoute component={About} />} />
        <Route path="/users" component={() => <ProtectedRoute component={Users} />} />
        <Route path="/users/create" component={() => <ProtectedRoute component={UsersCreate} />} />
        <Route path="/users/edit/:userId" component={() => <ProtectedRoute component={UsersEdit} />} />
        <Route path="/home" component={Home} />
        <Route path="*" component={() => <Navigate href="/home" />} />
      </Router>
    </>
  );
};

export default DRoutes;
