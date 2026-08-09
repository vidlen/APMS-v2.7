import { useRef, useMemo, type ChangeEvent } from "react";
import { toast } from "sonner";
import { Download, Upload, RotateCcw } from "lucide-react";
import { useData } from "@/lib/data-store";
import { usePavementData } from "@/hooks/usePavementData";
import { Button } from "@/components/ui/button";
import { downloadJson } from "@/lib/geojson-io";
import { parseMarkovForecastFile, MARKOV_FORECAST_TEMPLATE, type MarkovForecastEntry } from "@/lib/markov-forecast";

interface MarkovForecastPanelProps {
  year: string;
}

// Stable reference for a year with no imported forecast, so `?? EMPTY_ENTRIES`
// doesn't hand the matchedCount useMemo a fresh array identity every render.
const EMPTY_ENTRIES: MarkovForecastEntry[] = [];

export default function MarkovForecastPanel({ year }: MarkovForecastPanelProps) {
  const { overrides, importMarkovForecast, clearMarkovForecast } = useData();
  const { sections } = usePavementData(year);
  const fileInput = useRef<HTMLInputElement>(null);

  const entries = overrides.markovForecasts[year] ?? EMPTY_ENTRIES;
  const branchIds = useMemo(() => new Set(sections.map((s) => s.Section)), [sections]);
  const matchedCount = useMemo(
    () => entries.filter((e) => branchIds.has(e.branchId)).length,
    [entries, branchIds],
  );

  const handleImport = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    const result = await parseMarkovForecastFile(file);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    importMarkovForecast(year, result.data);
    const matched = result.data.filter((entry) => branchIds.has(entry.branchId)).length;
    toast.success(
      `Imported Tier 1 forecast for ${year}: ${matched} of ${result.data.length} entries matched a branch`,
    );
  };

  const handleDownloadTemplate = () => {
    downloadJson("markov-forecast-template.json", MARKOV_FORECAST_TEMPLATE);
  };

  const handleClear = () => {
    clearMarkovForecast(year);
    toast.success(`Tier 1 forecast cleared for ${year}`);
  };

  return (
    <div className="panel-surface rounded-lg p-4 space-y-3">
      <div>
        <h2 className="text-sm font-bold text-foreground">Tier 1 Forecast — {year}</h2>
        <p className="text-[11px] text-muted-foreground mt-0.5">
          Teammate A's Markov chain forecast (brief section 11 - backlog M). A branch with a matching
          entry scores on it automatically; every other branch keeps scoring on today's surveyed PCI
          (Tier 3), exactly as before this ever arrives.
        </p>
      </div>

      {entries.length > 0 && (
        <p className="text-xs text-foreground">
          <span className="font-mono font-semibold">{matchedCount}</span> of {entries.length} imported
          entries matched a branch in {year}
          {matchedCount < entries.length && (
            <span className="text-muted-foreground">
              {" "}
              ({entries.length - matchedCount} did not match any current branch id)
            </span>
          )}
          .
        </p>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <Button variant="outline" size="sm" onClick={() => fileInput.current?.click()}>
          <Upload size={13} />
          Upload forecast JSON
        </Button>
        <input
          ref={fileInput}
          type="file"
          accept=".json,application/json"
          className="hidden"
          onChange={handleImport}
        />
        <Button variant="secondary" size="sm" onClick={handleDownloadTemplate}>
          <Download size={13} />
          Download template
        </Button>
        {entries.length > 0 && (
          <Button variant="ghost" size="sm" onClick={handleClear}>
            <RotateCcw size={13} />
            Clear forecast
          </Button>
        )}
      </div>
    </div>
  );
}
