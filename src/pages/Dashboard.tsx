import { Navigate } from "react-router";

/** The starter dashboard route now forwards to the real workspace. */
export default function Dashboard() {
  return <Navigate to="/workshop" replace />;
}
