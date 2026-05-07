/**
 * Tipos mínimos do runtime Deno (Supabase Edge Functions).
 * O analisador TypeScript do Cursor/VSCode não interpreta import "jsr:..." nem @types dinâmicos;
 * este arquivo evita erro "Cannot find name 'Deno'".
 */
declare const Deno: {
  env: {
    get(key: string): string | undefined;
  };
  serve(handler: (request: Request) => Response | Promise<Response>): void;
};

declare module "https://esm.sh/@supabase/supabase-js@2" {
  /** Tipagem folgada apenas para IDE; runtime é resolvido pelo Deno Deploy. */
  export function createClient(url: string, key: string, options?: Record<string, unknown>): any;
}

declare module "jsr:@supabase/functions-js/edge-runtime.d.ts" {}
