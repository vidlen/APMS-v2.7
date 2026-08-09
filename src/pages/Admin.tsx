import { useState } from "react";
import { Navigate, Link } from "react-router";
import { Plane, ArrowLeft } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { useData } from "@/lib/data-store";
import YearManager from "@/components/admin/YearManager";
import SectionEditorTable from "@/components/admin/SectionEditorTable";
import SampleUnitTable from "@/components/admin/SampleUnitTable";
import ImportExportPanel from "@/components/admin/ImportExportPanel";
import RiskInventoryTable from "@/components/admin/RiskInventoryTable";

export default function Admin() {
  const { isAdmin, authReady } = useAuth();
  const { years } = useData();
  const [selectedYear, setSelectedYear] = useState<string>(() => years[0]?.id ?? "2025");
  const [expandedSection, setExpandedSection] = useState<string | null>(null);

  if (!authReady) return null;
  if (!isAdmin) return <Navigate to="/" replace />;

  const handleSelectYear = (year: string) => {
    setSelectedYear(year);
    setExpandedSection(null);
  };

  return (
    <div className="flex flex-col w-full h-screen h-dvh bg-background overflow-hidden">
      <header className="shrink-0 flex items-center gap-4 min-h-16 px-4 pt-[env(safe-area-inset-top)] bg-card border-b border-border shadow-sm z-30">
        <Link
          to="/"
          state={{ fromAdmin: true }}
          className="flex items-center gap-2 p-2 -m-2 rounded-md text-muted-foreground hover:text-foreground transition-colors text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          <ArrowLeft size={15} />
          Back to map
        </Link>
        <div className="w-px h-6 bg-border" />
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 rounded-md bg-primary flex items-center justify-center shrink-0">
            <Plane size={17} className="text-primary-foreground" />
          </div>
          <div className="leading-tight min-w-0">
            <h1 className="text-foreground text-sm font-bold leading-tight truncate">
              Admin — PCI Survey Data
            </h1>
            <p className="text-muted-foreground text-[11px] leading-tight truncate">
              Airport Pavement Management System
            </p>
          </div>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto custom-scrollbar p-6 pb-[calc(1.5rem+env(safe-area-inset-bottom))]">
        <div className="max-w-4xl mx-auto space-y-6">
          <YearManager selectedYear={selectedYear} onSelectYear={handleSelectYear} />

          <div className="panel-surface rounded-lg overflow-hidden">
            <div className="px-4 py-3 border-b border-border flex items-center justify-between">
              <h2 className="text-sm font-bold text-foreground">
                Section PCI — {selectedYear}
              </h2>
            </div>
            <SectionEditorTable year={selectedYear} onEditUnits={setExpandedSection} />
          </div>

          {expandedSection && (
            <SampleUnitTable
              year={selectedYear}
              section={expandedSection}
              onClose={() => setExpandedSection(null)}
            />
          )}

          <div className="panel-surface rounded-lg overflow-hidden">
            <div className="px-4 py-3 border-b border-border">
              <h2 className="text-sm font-bold text-foreground">
                Risk Inventory — {selectedYear}
              </h2>
            </div>
            <RiskInventoryTable year={selectedYear} />
          </div>

          <ImportExportPanel year={selectedYear} />
        </div>
      </div>
    </div>
  );
}
