"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { EntityGraphPanel } from "@/components/entity/EntityGraphPanel";
import { PlaceDetailCard } from "@/components/entity/PlaceDetailCard";
import { TopicDetailCard } from "@/components/entity/TopicDetailCard";
import { ClusterStackPanel } from "@/components/events/ClusterStackPanel";
import { EventDetailCard } from "@/components/events/EventDetailCard";
import { CommandHud } from "@/components/layout/CommandHud";
import { LayerToggles } from "@/components/layout/LayerToggles";
import { RightRail } from "@/components/layout/RightRail";
import { SmartSearch } from "@/components/layout/SmartSearch";
import { LensSwitcher } from "@/components/lenses/LensSwitcher";
import { NewsPreview } from "@/components/news/NewsPreview";
import { HoverTooltip } from "@/components/layout/HoverTooltip";
import { ViewportLabels } from "@/components/layout/ViewportLabels";
import { MobileChrome } from "@/components/mobile/MobileChrome";
import { SituationsRail } from "@/components/situation/SituationsRail";
import { LensToast } from "@/components/lenses/LensToast";
import { useTrackerStore } from "@/store/tracker-store";
import { useIsMobile } from "@/hooks/useIsMobile";

const GlobeScene = dynamic(
  () =>
    import("@/components/globe/GlobeScene").then((m) => m.GlobeScene),
  {
    ssr: false,
    loading: () => (
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_35%_30%,#1a3350,#070b12_65%)]" />
    ),
  },
);

export function AppShell() {
  const selectEvent = useTrackerStore((s) => s.selectEvent);
  const previewNews = useTrackerStore((s) => s.previewNews);
  const setStackPanel = useTrackerStore((s) => s.setStackPanel);
  const clearSelection = useTrackerStore((s) => s.clearSelection);
  const selectedEvent = useTrackerStore((s) => s.selectedEvent);
  const selectedSituation = useTrackerStore((s) => s.selectedSituation);
  const selectedPlace = useTrackerStore((s) => s.selectedPlace);
  const selectedTopic = useTrackerStore((s) => s.selectedTopic);
  const previewArticle = useTrackerStore((s) => s.previewArticle);
  const stackPanel = useTrackerStore((s) => s.stackPanel);
  const situations = useTrackerStore((s) => s.situations);
  const loadGlobalPulse = useTrackerStore((s) => s.loadGlobalPulse);
  const syncFromUrl = useTrackerStore((s) => s.syncFromUrl);
  const loadBookmarks = useTrackerStore((s) => s.loadBookmarks);
  const loadHistory = useTrackerStore((s) => s.loadHistory);
  const [situationsOpen, setSituationsOpen] = useState(true);
  const isMobile = useIsMobile();

  useEffect(() => {
    syncFromUrl();
    void loadBookmarks();
    void loadHistory();
    const params = new URLSearchParams(window.location.search);
    const hasEntity =
      params.has("situation") ||
      params.has("place") ||
      params.has("topic") ||
      params.has("event") ||
      params.has("q");
    if (!hasEntity) {
      void loadGlobalPulse();
    } else if (params.get("q")) {
      void useTrackerStore.getState().runSearch(params.get("q")!);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if (previewArticle) previewNews(null);
      else if (selectedEvent) selectEvent(null);
      else if (stackPanel) setStackPanel(null);
      else if (selectedSituation || selectedPlace || selectedTopic) {
        clearSelection();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [
    previewArticle,
    selectedEvent,
    selectedSituation,
    selectedPlace,
    selectedTopic,
    stackPanel,
    previewNews,
    selectEvent,
    setStackPanel,
    clearSelection,
  ]);

  const situationsRailVisible = situationsOpen && situations.length > 0;

  return (
    <div className="relative h-dvh w-full overflow-hidden bg-[var(--bg)] text-[var(--fg)]">
      <GlobeScene />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_58%,rgba(4,8,14,0.28)_100%)]" />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-20 bg-gradient-to-b from-[rgba(4,8,14,0.55)] to-transparent" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-[rgba(4,8,14,0.5)] to-transparent" />

      {isMobile === null ? null : isMobile ? (
        <>
          <MobileChrome />
          <ViewportLabels />
          <NewsPreview />
          <LensToast />
        </>
      ) : (
        <>
          <SmartSearch onOpenSituations={() => setSituationsOpen(true)} />
          <LensSwitcher />
          <SituationsRail
            open={situationsOpen}
            onClose={() => setSituationsOpen(false)}
          />
          <EntityGraphPanel offsetForSituations={situationsRailVisible} />
          <ViewportLabels />
          <HoverTooltip />
          <RightRail />
          <LayerToggles />
          <CommandHud />
          <ClusterStackPanel />
          <EventDetailCard />
          <PlaceDetailCard />
          <TopicDetailCard />
          <NewsPreview />
          <LensToast />
        </>
      )}
    </div>
  );
}
