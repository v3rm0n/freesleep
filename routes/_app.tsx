import { define } from "../utils.ts";

export default define.page(function App({ Component }) {
	return (
		<html lang="en" data-theme="dark">
			<head>
				<meta charset="utf-8" />
				<meta content="width=device-width, initial-scale=1" name="viewport" />
				{/* Resolve the saved/system theme before first paint to avoid a flash. */}
				<script
					dangerouslySetInnerHTML={{
						__html:
							"(()=>{try{var t=localStorage.getItem('freesleep-theme');" +
							"if(!t){t=matchMedia('(prefers-color-scheme: light)').matches?'light':'dark';}" +
							"document.documentElement.dataset.theme=t;}catch(e){}})();",
					}}
				/>
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
