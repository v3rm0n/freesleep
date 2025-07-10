import { hc } from "hono/client";
import { render } from "hono/jsx/dom";
import type { AppType } from "../api.ts";
import { Graph } from "./graph.tsx";

const _client = hc<AppType>("/");

function App() {
	return <Graph />;
}

const root = document.getElementById("root");

if (root) {
	render(<App />, root);
}
