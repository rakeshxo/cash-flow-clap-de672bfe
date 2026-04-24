import { useEffect } from "react";
import { useSearchParams } from "react-router-dom";

// This page just forwards the panel redirect to the edge function which renders the result HTML.
// It exists so your panel can use a clean app URL like /survey-return.
const SurveyReturn = () => {
  const [params] = useSearchParams();
  useEffect(() => {
    const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
    const url = `https://${projectId}.functions.supabase.co/panel-redirect?${params.toString()}`;
    window.location.replace(url);
  }, [params]);
  return (
    <div className="flex min-h-screen items-center justify-center bg-background text-muted-foreground">
      Verifying your completion...
    </div>
  );
};

export default SurveyReturn;
