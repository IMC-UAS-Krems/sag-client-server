import { Router, Route, Navigate } from "@solidjs/router";
import Home from "@client/routes/Home";
import About from "@client/routes/About";
import Editor from "@client/routes/Editor";
import SignIn from "@client/routes/SignIn";
import Users from "@client/routes/Users";
import UsersCreate from "@client/routes/UsersCreate";
import UsersEdit from "@client/routes/UsersEdit";
import NonAuthorised from "@client/routes/NonAuthorised";
import ProtectedRoute from "@client/guard/RouteGuard";

const DRoutes = () => {
  return (
    <Router>
      <Route>
        <Route path="/sign-in" component={SignIn} />
        <Route path="/non-authorised" component={NonAuthorised} />
        <Route path="/home" component={Home} />
        <Route path="/about" component={About} />

        {/* Protected Routes */}
        <Route path="/editor" component={() => <ProtectedRoute component={Editor} />} />
        <Route path="/users" component={() => <ProtectedRoute component={Users} />} />
        <Route path="/users/create" component={() => <ProtectedRoute component={UsersCreate} />} />
        <Route path="/users/edit/:userId" component={() => <ProtectedRoute component={UsersEdit} />} />

        {/* Fallback Route */}
        <Route path="*" element={<Navigate to="/home" />} />
      </Route>
    </Router>
  );
};

export default DRoutes;
