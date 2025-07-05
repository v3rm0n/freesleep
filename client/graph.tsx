import type { FC } from "hono/jsx";

export const Graph: FC = () => {
	return (
		<>
			<canvas id="graph" resize></canvas>
			<script
				type="text/javascript"
				src="https://cdnjs.cloudflare.com/ajax/libs/paper.js/0.12.18/paper-full.min.js"
			/>
			<script type="text/paperscript" canvas="graph" src="paperscript.js" />
		</>
	);
};
