/**
 * PLACEHOLDER — substituído pelo arquivo gerado assim que as tabelas existirem:
 *
 *   npm run db:types
 *
 * O formato abaixo é o mesmo que `supabase gen types typescript` emite, para
 * que os clientes já sejam genéricos (`SupabaseClient<Database>`) desde agora e
 * a troca não toque em nenhum outro arquivo. Não edite à mão depois de gerado
 * (CLAUDE.md: "tipos do banco são gerados, nunca escritos à mão").
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: Record<string, never>;
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}
