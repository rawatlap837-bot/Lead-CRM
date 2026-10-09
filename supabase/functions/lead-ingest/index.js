import { createLeadHandler } from "./handler.js";
Deno.serve(
  createLeadHandler({ env: (name) => Deno.env.get(name), fetch: globalThis.fetch }),
);
