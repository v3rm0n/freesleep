import { Head } from "fresh/runtime";
import Demo from "../islands/Demo.tsx";
import { define } from "../utils.ts";

export default define.page(function DemoPage() {
	return (
		<>
			<Head>
				<title>FreeSleep component demo</title>
			</Head>
			<Demo />
		</>
	);
});
