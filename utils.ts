import { createDefine } from "fresh";

// This specifies the type of "ctx.state" which is shared among middlewares,
// layouts and routes. Authentication is resolved per-handler (see
// server/auth.ts), so no shared state is required yet.
// biome-ignore lint/suspicious/noEmptyInterface: reserved for future shared state
export interface State {}

export const define = createDefine<State>();
