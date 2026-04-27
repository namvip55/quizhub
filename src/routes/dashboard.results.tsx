import { createFileRoute } from "@tanstack/react-router";
import { useState, memo } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { AttemptDetailDialog } from "@/components/dashboard/results/AttemptDetailDialog";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertTriangle, Search, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";

// #region agent log
if (import.meta.env.DEV) {
  console.warn("[agent log]", {
    sessionId: "6e5d58",
    runId: "pre-fix",
    hypothesisId: "BOOT",
    location: "src/routes/dashboard.results.tsx:module",
    message: "module loaded",
  });
  fetch("/__agent_log", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      sessionId: "6e5d58",
      runId: "pre-fix",
      hypothesisId: "BOOT",
      location: "src/routes/dashboard.results.tsx:module",
      message: "module loaded",
      data: {},
      timestamp: Date.now(),
    }),
  })
    .then(() => {
      console.warn("[agent log]", {
        sessionId: "6e5d58",
        runId: "pre-fix",
        hypothesisId: "BOOT",
        location: "src/routes/dashboard.results.tsx:module",
        message: "POST ok",
      });
    })
    .catch((e) => {
      console.warn("[agent log]", {
        sessionId: "6e5d58",
        runId: "pre-fix",
        hypothesisId: "BOOT",
        location: "src/routes/dashboard.results.tsx:module",
        message: "POST failed",
        error: String(e),
      });
    });
}
// #endregion agent log

export const Route = createFileRoute("/dashboard/results")({
  head: () => ({ meta: [{ title: "Kết quả — QuizHub" }] }),
  component: ResultsPage,
});

// React.memo to prevent chart re-rendering unnecessarily
const MemoizedChart = memo(function MemoizedChart({ data }: { data: any[] }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} />
        <XAxis dataKey="name" axisLine={false} tickLine={false} />
        <YAxis allowDecimals={false} axisLine={false} tickLine={false} />
        <Tooltip cursor={{ fill: "transparent" }} />
        <Bar dataKey="count" fill="var(--color-primary)" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
});

const PAGE_SIZE = 10;

function ResultsPage() {
  const { user } = useAuth();
  const [selectedExam, setSelectedExam] = useState<string>("all");
  const [searchName, setSearchName] = useState("");
  const [viewingAttempt, setViewingAttempt] = useState<any>(null);
  const [page, setPage] = useState(0);

  // #region agent log
  if (import.meta.env.DEV) {
    console.warn("[agent log]", {
      sessionId: "6e5d58",
      runId: "pre-fix",
      hypothesisId: "H1",
      location: "src/routes/dashboard.results.tsx:ResultsPage",
      message: "Render state snapshot",
      hasUser: !!user,
      selectedExam,
      page,
    });
    fetch("/__agent_log", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sessionId: "6e5d58",
        runId: "pre-fix",
        hypothesisId: "H1",
        location: "src/routes/dashboard.results.tsx:ResultsPage",
        message: "Render state snapshot",
        data: { hasUser: !!user, selectedExam, page },
        timestamp: Date.now(),
      }),
    })
      .then(() => {
        console.warn("[agent log]", {
          sessionId: "6e5d58",
          runId: "pre-fix",
          hypothesisId: "H1",
          location: "src/routes/dashboard.results.tsx:ResultsPage",
          message: "POST ok",
        });
      })
      .catch((e) => {
        console.warn("[agent log]", {
          sessionId: "6e5d58",
          runId: "pre-fix",
          hypothesisId: "H1",
          location: "src/routes/dashboard.results.tsx:ResultsPage",
          message: "POST failed",
          error: String(e),
        });
      });
  }
  // #endregion agent log

  const { data: exams, isLoading: examsLoading } = useQuery({
    queryKey: ["exams-list", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("exams")
        .select("id, title")
        .eq("created_by", user.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
  });

  const {
    data: resultsData,
    isLoading: attemptsLoading,
    error,
    refetch,
    isFetching,
  } = useQuery({
    queryKey: ["attempts", selectedExam, searchName, page],
    queryFn: async () => {
      // #region agent log
      if (import.meta.env.DEV) {
        console.warn("[agent log]", {
          sessionId: "6e5d58",
          runId: "pre-fix",
          hypothesisId: "H2",
          location: "src/routes/dashboard.results.tsx:attemptsQueryFn",
          message: "attempts query start",
          hasUser: !!user,
          selectedExam,
          page,
          pageSize: PAGE_SIZE,
        });
        fetch("/__agent_log", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sessionId: "6e5d58",
            runId: "pre-fix",
            hypothesisId: "H2",
            location: "src/routes/dashboard.results.tsx:attemptsQueryFn",
            message: "attempts query start",
            data: { hasUser: !!user, selectedExam, page, pageSize: PAGE_SIZE },
            timestamp: Date.now(),
          }),
        })
          .then(() => {
            console.warn("[agent log]", {
              sessionId: "6e5d58",
              runId: "pre-fix",
              hypothesisId: "H2",
              location: "src/routes/dashboard.results.tsx:attemptsQueryFn",
              message: "POST ok",
            });
          })
          .catch((e) => {
            console.warn("[agent log]", {
              sessionId: "6e5d58",
              runId: "pre-fix",
              hypothesisId: "H2",
              location: "src/routes/dashboard.results.tsx:attemptsQueryFn",
              message: "POST failed",
              error: String(e),
            });
          });
      }
      // #endregion agent log

      let query = supabase
        .from("exam_attempts")
        .select("*, exams(title)", { count: "exact" })
        .eq("is_finished", true);

      if (selectedExam !== "all") {
        query = query.eq("exam_id", selectedExam);
      } else if (exams && exams.length > 0) {
        // Filter by all exams belonging to this teacher
        query = query.in("exam_id", exams.map(e => e.id));
      } else if (exams && exams.length === 0) {
        // No exams means no results
        return { attempts: [], totalCount: 0 };
      }

      if (searchName.trim()) {
        query = query.ilike("student_name", `%${searchName.trim()}%`);
      }

      const { data, error, count } = await query
        .order("submitted_at", { ascending: false })
        .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

      // #region agent log
      if (import.meta.env.DEV) {
        console.warn("[agent log]", {
          sessionId: "6e5d58",
          runId: "pre-fix",
          hypothesisId: "H3",
          location: "src/routes/dashboard.results.tsx:attemptsQueryFn",
          message: "attempts query result",
          hasError: !!error,
          count,
          returned: Array.isArray(data) ? data.length : null,
        });
        fetch("/__agent_log", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sessionId: "6e5d58",
            runId: "pre-fix",
            hypothesisId: "H3",
            location: "src/routes/dashboard.results.tsx:attemptsQueryFn",
            message: "attempts query result",
            data: {
              hasError: !!error,
              count,
              returned: Array.isArray(data) ? data.length : null,
              sampleKeys: Array.isArray(data) && data[0] ? Object.keys(data[0]).slice(0, 12) : null,
            },
            timestamp: Date.now(),
          }),
        })
          .then(() => {
            console.warn("[agent log]", {
              sessionId: "6e5d58",
              runId: "pre-fix",
              hypothesisId: "H3",
              location: "src/routes/dashboard.results.tsx:attemptsQueryFn",
              message: "POST ok",
            });
          })
          .catch((e) => {
            console.warn("[agent log]", {
              sessionId: "6e5d58",
              runId: "pre-fix",
              hypothesisId: "H3",
              location: "src/routes/dashboard.results.tsx:attemptsQueryFn",
              message: "POST failed",
              error: String(e),
            });
          });
      }
      // #endregion agent log

      if (error) throw error;
      return { attempts: data, totalCount: count || 0 };
    },
    staleTime: 60 * 1000,
  });

  // Separate query for accurate stats across ALL pages
  const { data: allScores } = useQuery({
    queryKey: ["attempts-stats", selectedExam, searchName],
    queryFn: async () => {
      if (!user) return [];
      let query = supabase
        .from("exam_attempts")
        .select("score")
        .eq("is_finished", true);

      if (selectedExam !== "all") {
        query = query.eq("exam_id", selectedExam);
      } else if (exams && exams.length > 0) {
        query = query.in("exam_id", exams.map(e => e.id));
      } else if (exams && exams.length === 0) {
        return [];
      }

      if (searchName.trim()) {
        query = query.ilike("student_name", `%${searchName.trim()}%`);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data.map((d) => d.score || 0);
    },
    enabled: !!user && !!exams,
    staleTime: 5 * 60 * 1000,
  });

  const attempts = resultsData?.attempts;
  const totalCount = resultsData?.totalCount || 0;
  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  const calculateStats = () => {
    if (!allScores || allScores.length === 0) return null;
    const scores = allScores;
    const avgScore = (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1);
    const passCount = scores.filter((s) => s >= 5).length;
    const passRate = ((passCount / scores.length) * 100).toFixed(0);

    const histogram = Array.from({ length: 11 }, (_, i) => ({ name: i.toString(), count: 0 }));
    scores.forEach((s) => {
      const bucket = Math.round(s);
      if (histogram[bucket]) histogram[bucket].count++;
    });

    return { avgScore, passRate, total: scores.length, histogram };
  };

  const stats = calculateStats();
  const isLoading = examsLoading || attemptsLoading;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Kết quả & Phân tích</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Theo dõi kết quả của học sinh và thống kê bài thi.
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative w-full sm:w-[250px]">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Tìm tên học sinh..."
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 pl-9 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              value={searchName}
              onChange={(e) => {
                setSearchName(e.target.value);
                setPage(0);
              }}
            />
          </div>
          <Select
            value={selectedExam}
            onValueChange={(val) => {
              setSelectedExam(val);
              setPage(0);
            }}
          >
            <SelectTrigger className="w-full sm:w-[250px]">
              <SelectValue placeholder="Chọn một bài thi" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tất cả bài thi</SelectItem>
              {exams?.map((e) => (
                <SelectItem key={e.id} value={e.id}>
                  {e.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {error ? (
        <div className="flex flex-col items-center justify-center p-8 text-center border rounded-xl bg-card">
          <AlertTriangle className="h-10 w-10 text-destructive mb-4" />
          <p className="font-semibold mb-2">Lỗi mạng</p>
          <p className="text-sm text-muted-foreground mb-4">
            Không tải được kết quả. Vui lòng thử lại.
          </p>
          <Button onClick={() => refetch()} variant="outline">
            {isFetching ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Thử lại"}
          </Button>
        </div>
      ) : isLoading ? (
        <div className="space-y-6">
          <div className="grid gap-4 md:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-24 w-full rounded-xl" />
            ))}
          </div>
          <Skeleton className="h-[300px] w-full rounded-xl" />
          <Skeleton className="h-64 w-full rounded-xl" />
        </div>
      ) : !stats ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border/60 bg-card/60 p-12 text-center text-sm text-muted-foreground">
          <Search className="h-8 w-8 text-muted-foreground/50 mb-4" />
          <p className="font-medium text-foreground mb-1">Không tìm thấy kết quả</p>
          <p>Chưa có lượt làm bài nào cho bài thi này.</p>
        </div>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="rounded-xl border bg-card p-6 shadow-sm">
              <h3 className="text-sm font-medium text-muted-foreground">Tổng số lượt làm bài</h3>
              <p className="mt-2 text-3xl font-bold">{stats.total}</p>
            </div>
            <div className="rounded-xl border bg-card p-6 shadow-sm">
              <h3 className="text-sm font-medium text-muted-foreground">Điểm trung bình</h3>
              <p className="mt-2 text-3xl font-bold">
                {stats.avgScore}{" "}
                <span className="text-sm font-normal text-muted-foreground">/ 10</span>
              </p>
            </div>
            <div className="rounded-xl border bg-card p-6 shadow-sm">
              <h3 className="text-sm font-medium text-muted-foreground">Tỉ lệ đạt (≥ 5)</h3>
              <p className="mt-2 text-3xl font-bold">{stats.passRate}%</p>
            </div>
          </div>

          <div className="rounded-xl border bg-card p-4 sm:p-6 shadow-sm">
            <h3 className="text-lg font-medium mb-4">Phân phối điểm số</h3>
            <div className="h-[250px] sm:h-[300px] w-full">
              <MemoizedChart data={stats.histogram} />
            </div>
          </div>

          {/* Responsive list/table for attempts */}
          <div className={`rounded-md border bg-card overflow-hidden transition-opacity ${isFetching ? 'opacity-50' : 'opacity-100'}`}>
            <div className="md:hidden divide-y">
              {attempts?.map((a) => {
                const diffMs = a.started_at && a.submitted_at 
                  ? new Date(a.submitted_at).getTime() - new Date(a.started_at).getTime()
                  : 0;
                const m = Math.floor(diffMs / 60000);
                const s = Math.floor((diffMs % 60000) / 1000);
                const timeSpentStr = m > 0 ? `${m}ph ${s}s` : `${s}s`;
                
                return (
                  <div
                    key={a.id}
                    className="p-4 space-y-2 cursor-pointer hover:bg-muted/50"
                    onClick={() => setViewingAttempt(a)}
                  >
                    <div className="flex justify-between items-start">
                      <div className="font-medium">{a.student_name}</div>
                      <div className="font-bold text-primary">{a.score?.toFixed(1) || 0}</div>
                    </div>
                    {selectedExam === "all" && (
                      <div className="text-xs text-muted-foreground">{a.exams?.title}</div>
                    )}
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>Thời gian: {timeSpentStr}</span>
                      <span>
                        {a.submitted_at ? new Date(a.submitted_at).toLocaleString("vi-VN") : "-"}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            <table className="hidden md:table w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50 text-left">
                  <th className="p-4 font-medium">Tên học sinh</th>
                  {selectedExam === "all" && <th className="p-4 font-medium">Bài thi</th>}
                  <th className="p-4 font-medium text-center">Điểm</th>
                  <th className="p-4 font-medium text-center">Thời gian làm bài</th>
                  <th className="p-4 font-medium text-right">Nộp lúc</th>
                </tr>
              </thead>
              <tbody>
                {attempts?.map((a) => {
                  const diffMs = a.started_at && a.submitted_at 
                    ? new Date(a.submitted_at).getTime() - new Date(a.started_at).getTime()
                    : 0;
                  const m = Math.floor(diffMs / 60000);
                  const s = Math.floor((diffMs % 60000) / 1000);
                  const timeSpentStr = m > 0 ? `${m}ph ${s}s` : `${s}s`;

                  return (
                    <tr
                      key={a.id}
                      className="border-b transition-colors hover:bg-muted/50 cursor-pointer"
                      onClick={() => setViewingAttempt(a)}
                    >
                      <td className="p-4 font-medium">{a.student_name}</td>
                      {selectedExam === "all" && (
                        <td className="p-4 text-muted-foreground">{a.exams?.title}</td>
                      )}
                      <td className="p-4 text-center font-bold text-primary">
                        {a.score?.toFixed(1) || 0}
                      </td>
                      <td className="p-4 text-center">{timeSpentStr}</td>
                      <td className="p-4 text-right text-muted-foreground">
                        {a.submitted_at ? new Date(a.submitted_at).toLocaleString("vi-VN") : "-"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between px-2 py-4">
              <div className="text-sm text-muted-foreground">
                Hiển thị {page * PAGE_SIZE + 1} - {Math.min((page + 1) * PAGE_SIZE, totalCount)} trong{" "}
                {totalCount} kết quả
              </div>
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                  disabled={page === 0}
                >
                  Trước
                </Button>
                <div className="text-sm font-medium">
                  Trang {page + 1} / {totalPages}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                  disabled={page >= totalPages - 1}
                >
                  Sau
                </Button>
              </div>
            </div>
          )}
        </>
      )}

      {viewingAttempt && (
        <AttemptDetailDialog
          attempt={viewingAttempt}
          open={!!viewingAttempt}
          onOpenChange={(val) => !val && setViewingAttempt(null)}
        />
      )}
    </div>
  );
}
