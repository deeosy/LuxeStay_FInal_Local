import { useLocation, Navigate } from "react-router-dom";
import { useEffect } from "react";
import { isConsideredSeoRoute } from "@/utils/seoRoutes";
import { Loader2 } from "lucide-react";

const NotFound = () => {
  const location = useLocation();
  const pathname = location.pathname;
  const isSeoPath = isConsideredSeoRoute(pathname);

  useEffect(() => {
    if (!isSeoPath) {
      console.warn("404 fallback triggered for:", pathname);
    }
  }, [isSeoPath, pathname]);

  // Allow SEO destination pages to pass through with a friendly loading state
  // This prevents 404s for valid virtual routes while data fetches or redirection happens
  if (isSeoPath) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-muted">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-accent mx-auto mb-4" />
          <p className="mb-4 text-xl text-muted-foreground">
            Loading destination information...
          </p>
        </div>
      </div>
    );
  }

  // Normal 404 for everything else
  return (
    <div className="flex min-h-screen items-center justify-center bg-muted">
      <div className="text-center">
        <h1 className="mb-4 text-4xl font-bold">404</h1>
        <p className="mb-4 text-xl text-muted-foreground">
          Oops! Page not found
        </p>
        <a href="/" className="text-primary underline hover:text-primary/90">
          Return to Home
        </a>
      </div>
    </div>
  );
};

export default NotFound;
