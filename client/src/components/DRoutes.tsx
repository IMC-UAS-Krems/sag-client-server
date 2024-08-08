import { Router, Route, Navigate } from "@solidjs/router";
import { type Component } from "solid-js";
import Home from "@client/routes/Home";
import About from "@client/routes/About";
import Editor from "@client/routes/Editor";
import SignIn from "@client/routes/SignIn";
import Users from "@client/routes/Users";

const DRoutes: Component = () => {
  return (
    <>
      <Router>
        <Route path="/sign-in" component={SignIn} />
        <Route path="/editor" component={Editor} />
        <Route path="/about" component={About} />
        <Route path="/users" component={Users} />
        <Route path="/home" component={Home} />
        <Route path="*" component={() => <Navigate href="/home" />} />
      </Router>
    </>
  );
};

export default DRoutes;
