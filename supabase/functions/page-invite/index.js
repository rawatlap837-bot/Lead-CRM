import { createInviteHandler } from "./handler.js";
Deno.serve(
  createInviteHandler({ env: (name) => Deno.env.get(name), fetch: globalThis.fetch }),
);
