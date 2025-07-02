import type { FC } from "hono/jsx";

const Layout: FC = (props) => {
	return (
		<html lang="en">
			<head>
				<link
					href="https://fonts.cdnfonts.com/css/sf-pro-display"
					rel="stylesheet"
				/>
				<script
					type="text/javascript"
					src="https://cdnjs.cloudflare.com/ajax/libs/paper.js/0.12.18/paper-full.min.js"
				/>
				<script src="https://cdnjs.cloudflare.com/ajax/libs/tween.js/23.1.3/tween.umd.js" />
				<script type="text/paperscript" canvas="graph" src="paperscript.js" />
				<link rel="stylesheet" href="style.css" />
				<title>FreeSleep</title>
			</head>
			<body>{props.children}</body>
		</html>
	);
};

export const App: FC = () => {
	return (
		<Layout>
			<h1>Eight Sleep</h1>
			<p>Set the temperature for your sleep cycle</p>
			<canvas id="graph" resize></canvas>
			<button
				onClick="setGraphPoints([[25, 25],[95, 50],[165, 100],[235, 100],[305, 200],[375, 100]])"
				type="button"
			>
				Preset
			</button>
		</Layout>
	);
};
