import { Routes, Route, Navigate } from "@solidjs/router";
import { Show, type Component } from "solid-js";
import Home from "@client/routes/Home";
import About from "@client/routes/About";
import Editor from "@client/routes/Editor";
import SignIn from "@client/routes/SignIn";

const DRoutes: Component = () => {
  return (
    <>
      <Routes>
        <Route path="/" component={SignIn} />
        <Route path="/editor" component={Editor} />
        <Route path="/about" component={About} />
        <Route path="/home" component={Home} />
        <Route path="*" component={() => <Navigate href="/" />} />
      </Routes>
    </>
  );
};

export default DRoutes;