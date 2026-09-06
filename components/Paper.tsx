import type { ComponentChildren, JSX } from "preact";
import { createContext } from "preact";
import { useContext, useEffect, useRef, useState } from "preact/hooks";

interface PaperContextType {
	paper: paper.PaperScope;
}

const PaperContext = createContext<PaperContextType | null>(null);

export const usePaper = () => {
	const context = useContext(PaperContext);
	if (!context) {
		throw new Error("usePaper must be used within a PaperProvider");
	}
	return context;
};

// Mirrors `--font` in assets/style.css. Canvas text is rasterised with
// whatever font is available at draw time, so a system stack (nothing to
// download) keeps the graph's labels consistent with the rest of the UI.
export const UI_FONT_FAMILY =
	'system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';

// paper.js auto-resizes a canvas that carries a `resize` attribute, reading
// its CSS layout size (see `.graph-canvas`). Preact's canvas typings don't
// include the attribute, so attach it via a spread.
const RESIZE_ATTR = {
	resize: "",
} as unknown as JSX.HTMLAttributes<HTMLCanvasElement>;

export const PaperProvider = ({
	children,
}: {
	children: ComponentChildren;
}) => {
	const canvasRef = useRef<HTMLCanvasElement>(null);
	const [paper, setPaper] = useState<paper.PaperScope | null>(null);

	useEffect(() => {
		let active = true;
		// paper.js is browser-only, so it's imported lazily here (never during
		// server-side rendering of the island). The package's `main` entry is the
		// Node build (paper-full.js, which pulls in `node:module`); the browser
		// build (paper-core.js) is what we want in the client bundle.
		(async () => {
			const mod = await import("paper/dist/paper-core.js");
			// paper-core.d.ts only pulls in the global `paper` namespace, so the
			// module's default export is untyped; at runtime it is the PaperScope.
			const paperScope = mod.default as unknown as paper.PaperScope;
			if (!active || !canvasRef.current) {
				return;
			}
			paperScope.setup(canvasRef.current);
			paperScope.project.currentStyle = {
				...paperScope.project.currentStyle,
				fontFamily: UI_FONT_FAMILY,
				fontSize: 12,
				strokeWidth: 2,
			};
			setPaper(paperScope);
		})();
		return () => {
			active = false;
		};
	}, []);

	return (
		<>
			{/* The Graph fills in a description of the schedule as aria-label. */}
			<canvas
				ref={canvasRef}
				class="graph-canvas"
				role="img"
				aria-label="Temperature schedule"
				{...RESIZE_ATTR}
			/>
			{paper && (
				<PaperContext.Provider value={{ paper }}>
					{children}
				</PaperContext.Provider>
			)}
		</>
	);
};

export default PaperProvider;
