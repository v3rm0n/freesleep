import { define } from "../utils.ts";

export default define.page(function App({ Component }) {
	return (
		<html lang="en">
			<head>
				<meta charset="utf-8" />
				<meta content="width=device-width, initial-scale=1" name="viewport" />
				<link
					href="https://fonts.cdnfonts.com/css/sf-pro-display"
					rel="stylesheet"
				/>
			</head>
			<body>
				<Component />
			</body>
		</html>
	);
});
