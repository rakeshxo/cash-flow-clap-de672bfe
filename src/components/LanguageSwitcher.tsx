import { useTranslation } from "react-i18next";
import { Globe } from "lucide-react";
import { languages } from "@/i18n/resources";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export const LanguageSwitcher = ({ className = "" }: { className?: string }) => {
  const { i18n, t } = useTranslation();
  const current = languages.find((l) => l.code === i18n.resolvedLanguage)?.code ?? "en";

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <Globe className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
      <Select value={current} onValueChange={(v) => i18n.changeLanguage(v)}>
        <SelectTrigger
          aria-label={t("common.language")}
          className="h-9 w-[150px] border-border bg-secondary/60 text-sm"
        >
          <SelectValue />
        </SelectTrigger>
        <SelectContent className="max-h-72">
          {languages.map((l) => (
            <SelectItem key={l.code} value={l.code}>
              {l.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
};
