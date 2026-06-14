import { define } from "../utils.ts";

const DESCRIPTION =
	"Dynamically set the temperature of your Eight Sleep Pod throughout the " +
	"night — without paying for a subscription.";

export default define.page(function App({ Component, url }) {
	// Absolute URL so social scrapers can fetch the card image regardless of
	// which host the self-hosted instance is reached on.
	const ogImage = new URL("/icon.png", url).href;
	return (
		<html lang="en" data-theme="dark">
			<head>
				<meta charset="utf-8" />
				<meta content="width=device-width, initial-scale=1" name="viewport" />
				<meta name="description" content={DESCRIPTION} />
				{/* Favicon (per-page <title> is set by each route's <Head>). */}
				<link rel="icon" href="/favicon.ico" sizes="any" />
				<link rel="icon" href="/icon.png" type="image/png" />
				<link rel="apple-touch-icon" href="/icon.png" />
				{/* Open Graph / Twitter card. */}
				<meta property="og:type" content="website" />
				<meta property="og:title" content="FreeSleep" />
				<meta property="og:description" content={DESCRIPTION} />
				<meta property="og:image" content={ogImage} />
				<meta property="og:image:width" content="512" />
				<meta property="og:image:height" content="512" />
				<meta name="twitter:card" content="summary" />
				<meta name="twitter:title" content="FreeSleep" />
				<meta name="twitter:description" content={DESCRIPTION} />
				<meta name="twitter:image" content={ogImage} />
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
