import { useEffect, useState } from "preact/hooks";

export type Theme = "dark" | "light";

// Also read by the no-flash script in routes/_app.tsx.
const STORAGE_KEY = "freesleep-theme";

/**
 * The current theme and a toggle for it. Starts from whatever the no-flash
 * script in routes/_app.tsx resolved before first paint, and persists changes.
 */
export const useResolvedTheme = (): [Theme, () => void] => {
	const [theme, setTheme] = useState<Theme>("dark");

	useEffect(() => {
		setTheme(
			document.documentElement.dataset.theme === "light" ? "light" : "dark",
		);
	}, []);

	const toggleTheme = () => {
		const next: Theme = theme === "dark" ? "light" : "dark";
		document.documentElement.dataset.theme = next;
		try {
			localStorage.setItem(STORAGE_KEY, next);
		} catch {
			// ignore storage being unavailable
		}
		setTheme(next);
	};

	return [theme, toggleTheme];
};
