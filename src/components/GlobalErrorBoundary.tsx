import React from "react";
import { Button } from "@/components/ui/button";
import { AlertTriangle, RefreshCcw } from "lucide-react";

export class GlobalErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-screen flex-col items-center justify-center p-4 text-center bg-background">
          <AlertTriangle className="h-16 w-16 text-destructive mb-6" />
          <h1 className="text-3xl font-bold mb-2">Đã có lỗi xảy ra</h1>
          <p className="text-muted-foreground mb-8 max-w-md">
            Một lỗi không mong muốn đã xảy ra. Chúng tôi đã ghi nhận sự cố này.
          </p>
          <div className="flex gap-4">
            <Button onClick={() => window.location.reload()}>
              <RefreshCcw className="mr-2 h-4 w-4" /> Tải lại trang
            </Button>
            <Button variant="outline" onClick={() => (window.location.href = "/")}>
              Về trang chủ
            </Button>
          </div>
          {import.meta.env.DEV && (
            <pre className="mt-8 p-4 bg-muted text-left text-xs rounded-md w-full max-w-2xl overflow-auto">
              {this.state.error?.stack}
            </pre>
          )}
        </div>
      );
    }

    return this.props.children;
  }
}
