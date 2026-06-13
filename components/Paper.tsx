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

// paper.js auto-resizes a canvas that carries a `resize` attribute, and the
// stylesheet sizes `canvas[resize]`. Preact's canvas typings don't include it,
// so attach it via a spread.
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
			const paperScope = mod.default;
			if (!active || !canvasRef.current) {
				return;
			}
			paperScope.setup(canvasRef.current);
			paperScope.project.currentStyle = {
				...paperScope.project.currentStyle,
				fontFamily: "SF Pro Display",
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
			<canvas ref={canvasRef} {...RESIZE_ATTR} />
			{paper && (
				<PaperContext.Provider value={{ paper }}>
					{children}
				</PaperContext.Provider>
			)}
		</>
	);
};

export default PaperProvider;
