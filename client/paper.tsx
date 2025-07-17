import {
	createContext,
	type PropsWithChildren,
	useContext,
	useEffect,
	useRef,
	useState,
} from "hono/jsx/dom";
import paper from "paper";

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

export const PaperProvider = ({ children }: PropsWithChildren) => {
	const canvasRef = useRef<HTMLCanvasElement>(null);
	const [isReady, setIsReady] = useState(false);

	useEffect(() => {
		if (canvasRef.current) {
			paper.setup(canvasRef.current);

			paper.project.currentStyle = {
				...paper.project.currentStyle,
				fontFamily: "SF Pro Display",
				fontSize: 12,
				strokeWidth: 2,
			};

			setIsReady(true);

			return () => {
				paper?.remove();
			};
		}
	}, []);

	const contextValue: PaperContextType | null =
		isReady && canvasRef.current
			? {
					paper,
				}
			: null;

	return (
		<>
			<canvas ref={canvasRef} resize />
			{isReady && contextValue && (
				<PaperContext.Provider value={contextValue}>
					{children}
				</PaperContext.Provider>
			)}
		</>
	);
};

export default PaperProvider;
