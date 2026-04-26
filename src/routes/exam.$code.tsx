import { createFileRoute, Navigate } from "@tanstack/react-router";

export const Route = createFileRoute("/exam/$code")({
  head: () => ({ meta: [{ title: "Take exam — QuizHub" }] }),
  component: ExamCodeRedirect,
});

// Redirect /exam/ABCDEF → /lobby/ABCDEF so students land in the lobby
function ExamCodeRedirect() {
  const { code } = Route.useParams();
  return <Navigate to="/lobby/$examCode" params={{ examCode: code }} replace />;
}
