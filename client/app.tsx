import { hc } from "hono/client";
import { render } from "hono/jsx/dom";
import type { AppType } from "../api.ts";
import { Graph } from "./graph.tsx";

const _client = hc<AppType>("/");

function App() {
	return <Graph />;
}

// biome-ignore-start lint/style/noNonNullAssertion: ignore
const root = document.getElementById("root")!;
// biome-ignore-end lint/style/noNonNullAssertion: ignore

render(<App />, root);
