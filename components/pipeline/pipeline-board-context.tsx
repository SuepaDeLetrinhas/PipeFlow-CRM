"use client";

import * as React from "react";

import type { DealStage } from "@/types";

type MoveDeal = (id: string, stage: DealStage) => void;

/**
 * Permite que o menu de um card mova o negócio sem que a callback atravesse
 * board → coluna → card → menu como prop. O board é o único provedor.
 */
const MoveDealContext = React.createContext<MoveDeal | null>(null);

export function MoveDealProvider({
  value,
  children,
}: {
  value: MoveDeal;
  children: React.ReactNode;
}) {
  return (
    <MoveDealContext.Provider value={value}>
      {children}
    </MoveDealContext.Provider>
  );
}

export function useMoveDeal(): MoveDeal {
  const context = React.useContext(MoveDealContext);

  if (!context) {
    throw new Error("useMoveDeal precisa estar dentro de <MoveDealProvider>.");
  }

  return context;
}
