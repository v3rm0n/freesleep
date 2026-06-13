import { Head } from "fresh/runtime";
import App from "../islands/App.tsx";
import { define } from "../utils.ts";

export default define.page(function Home() {
	return (
		<>
			<Head>
				<title>FreeSleep</title>
			</Head>
			<App />
		</>
	);
});
