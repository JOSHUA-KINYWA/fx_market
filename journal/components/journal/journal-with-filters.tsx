"use client";

import { useState, useEffect } from "react";
import { Database } from "@/types/database.types";
import { JournalFilters } from "./journal-filters";
import { JournalView } from "./journal-view";

type Trade = Database["public"]["Tables"]["trades"]["Row"];

interface JournalWithFiltersProps {
  readonly trades: Trade[];
}

export function JournalWithFilters({ trades }: JournalWithFiltersProps) {
  const [filteredTrades, setFilteredTrades] = useState<Trade[]>(trades);

  useEffect(() => {
    setFilteredTrades(trades);
  }, [trades]);

  return (
    <>
      <JournalFilters trades={trades} onFiltered={setFilteredTrades} />
      <JournalView trades={filteredTrades} />
    </>
  );
}




