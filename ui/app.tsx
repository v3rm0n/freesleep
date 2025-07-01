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
			<canvas id="graph" resize></canvas>
		</Layout>
	);
};
