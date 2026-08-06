import { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Loader2, AlertTriangle, Inbox } from "lucide-react";

type Props = {
  loading?: boolean;
  error?: string | null;
  empty?: boolean;
  emptyText?: string;
  loadingText?: string;
  onRetry?: () => void;
  children?: ReactNode;
};

/** Consistent loading / error / empty presentation for every data surface. */
export const DataState = ({
  loading,
  error,
  empty,
  emptyText = "Nothing here yet.",
  loadingText = "Loading...",
  onRetry,
  children,
}: Props) => {
  if (loading) {
    return (
      <div className="flex items-center justify-center gap-2 p-10 text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        <span className="text-sm">{loadingText}</span>
      </div>
    );
  }
  if (error) {
    return (
      <div className="flex flex-col items-center gap-3 p-10 text-center">
        <AlertTriangle className="h-6 w-6 text-destructive" />
        <p className="max-w-md text-sm text-muted-foreground">{error}</p>
        {onRetry && (
          <Button size="sm" variant="outline" onClick={onRetry}>
            Try again
          </Button>
        )}
      </div>
    );
  }
  if (empty) {
    return (
      <div className="flex flex-col items-center gap-2 p-10 text-center text-muted-foreground">
        <Inbox className="h-6 w-6 opacity-60" />
        <p className="text-sm">{emptyText}</p>
      </div>
    );
  }
  return <>{children}</>;
};
