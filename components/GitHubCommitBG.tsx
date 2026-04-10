"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { usePathname } from "next/navigation";

interface ContributionDay {
  contributionCount: number;
  date: string;
}

interface Week {
  contributionDays: ContributionDay[];
}

interface ViewportSize {
  width: number;
  height: number;
}

interface GridLayout {
  columns: number;
  rows: number;
  tileSize: number;
  gap: number;
}

const INTENSITY_COLORS: Record<number, string> = {
  0: "transparent",
  1: "#AA771C",
  2: "#BF953F",
  3: "#f3d076",
  4: "#FCF6BA",
};

const getIntensityLevel = (count: number): number => {
  if (count === 0) return 0;
  if (count <= 3) return 1;
  if (count <= 6) return 2;
  if (count <= 9) return 3;
  return 4;
};

const getStaggerDelay = (weekIndex: number, dayIndex: number): number => {
  const baseDelay = weekIndex * 0.2;
  const rowJitter = dayIndex * 0.008;
  return baseDelay + rowJitter;
};

const GitHubCommitBG = () => {
  const pathname = usePathname();
  const isHomePage = pathname === "/";
  const [days, setDays] = useState<ContributionDay[]>([]);
  const [viewport, setViewport] = useState<ViewportSize>({
    width: 0,
    height: 0,
  });

  useEffect(() => {
    const updateViewport = () => {
      setViewport({ width: window.innerWidth, height: window.innerHeight });
    };

    updateViewport();
    window.addEventListener("resize", updateViewport);

    return () => window.removeEventListener("resize", updateViewport);
  }, []);

  useEffect(() => {
    fetch("/api/github-contributions")
      .then((res) => res.json())
      .then((data) => {
        if (data.weeks) {
          setDays(
            data.weeks.flatMap((w: Week) => w.contributionDays)
          );
        }
      })
      .catch((err) =>
        console.error("Failed to fetch contribution data:", err)
      );
  }, []);

  const layout = useMemo<GridLayout | null>(() => {
    if (days.length === 0 || viewport.width === 0 || viewport.height === 0) {
      return null;
    }

    const gap = 12;
    let bestLayout: GridLayout | null = null;
    let bestArea = 0;

    // Find the densest square-tile grid that fits the viewport.
    for (let columns = 1; columns <= days.length; columns += 1) {
      const rows = Math.ceil(days.length / columns);
      const maxTileWidth =
        (viewport.width - gap * (columns - 1)) / columns;
      const maxTileHeight =
        (viewport.height - gap * (rows - 1)) / rows;
      const tileSize = Math.floor(Math.min(maxTileWidth, maxTileHeight));

      if (tileSize <= 0) continue;

      const usedWidth = columns * tileSize + gap * (columns - 1);
      const usedHeight = rows * tileSize + gap * (rows - 1);
      const area = usedWidth * usedHeight;

      if (area > bestArea) {
        bestArea = area;
        bestLayout = { columns, rows, tileSize, gap };
      }
    }

    return bestLayout;
  }, [days, viewport]);

  if (!isHomePage || !layout) return null;

  const totalCells = layout.columns * layout.rows;
  const fillerCount = totalCells - days.length;
  const cells = [
    ...days,
    ...new Array(fillerCount).fill(null),
  ];

  return (
    <div className="fixed left-0 inset-0 z-0 overflow-hidden pointer-events-none opacity-10">
      <div
        className="grid w-full h-full place-content-center"
        style={{
          gap: `${layout.gap}px`,
          gridTemplateColumns: `repeat(${layout.columns}, ${layout.tileSize}px)`,
          gridTemplateRows: `repeat(${layout.rows}, ${layout.tileSize}px)`,
        }}
      >
        {cells.map((day, index) => (
          <motion.div
            key={`commit-cell-${index}`}
            className="relative blur-sm"
            style={{
              width: `${layout.tileSize}px`,
              height: `${layout.tileSize}px`,
              borderRadius: `${Math.max(6, Math.floor(layout.tileSize * 0.22))}px`,
              overflow: "hidden",
              backgroundColor:
                day === null
                  ? "transparent"
                  : INTENSITY_COLORS[getIntensityLevel(day.contributionCount)],
            }}
            initial={{ opacity: 0, scale: 0.8, x: -20 }}
            animate={{ opacity: 1, scale: 1, x: 0 }}
            transition={{
              delay: getStaggerDelay(
                Math.floor(index / layout.rows),
                index % layout.rows
              ),
              duration: 2,
              ease: "easeOut",
            }}
          />
        ))}
      </div>
    </div>
  );
};

export default GitHubCommitBG;
