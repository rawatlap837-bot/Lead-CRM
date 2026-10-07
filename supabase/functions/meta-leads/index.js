import { createMetaHandler } from './handler.js';
Deno.serve(createMetaHandler({ env: name => Deno.env.get(name), fetch }));
