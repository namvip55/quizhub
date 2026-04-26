import { createFileRoute } from "@tanstack/react-router";
import { ImportDocxView } from "@/components/dashboard/import/ImportDocxView";

export const Route = createFileRoute("/dashboard/import")({
  head: () => ({ meta: [{ title: "Nhập từ file DOCX — QuizHub" }] }),
  component: ImportDocxView,
});
