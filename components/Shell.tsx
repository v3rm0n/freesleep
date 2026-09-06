import type { ComponentChildren } from "preact";
import type { Theme } from "./theme.ts";

interface TopBarProps {
	/** Small label next to the wordmark, e.g. "Demo". */
	badge?: string;
	/** Actions shown at the trailing end of the bar. */
	children?: ComponentChildren;
}

/** The app's header: brand on the left, actions on the right. */
export const TopBar = ({ badge, children }: TopBarProps) => (
	<header class="topbar">
		<a class="brand" href="/">
			<img src="/icon.png" alt="" width={28} height={28} />
			<span>FreeSleep</span>
			{badge && <span class="brand-badge">{badge}</span>}
		</a>
		<div class="topbar-actions">{children}</div>
	</header>
);

const SunIcon = () => (
	<svg
		viewBox="0 0 24 24"
		fill="none"
		stroke="currentColor"
		stroke-width="2"
		stroke-linecap="round"
		stroke-linejoin="round"
		aria-hidden="true"
	>
		<circle cx="12" cy="12" r="4" />
		<path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
	</svg>
);

const MoonIcon = () => (
	<svg
		viewBox="0 0 24 24"
		fill="none"
		stroke="currentColor"
		stroke-width="2"
		stroke-linecap="round"
		stroke-linejoin="round"
		aria-hidden="true"
	>
		<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
	</svg>
);

interface ThemeToggleProps {
	theme: Theme;
	onToggle: () => void;
}

/** Switches between the dark and light theme. */
export const ThemeToggle = ({ theme, onToggle }: ThemeToggleProps) => {
	const label = `Switch to ${theme === "dark" ? "light" : "dark"} theme`;
	return (
		<button
			type="button"
			class="button icon-button"
			onClick={onToggle}
			aria-label={label}
			title={label}
		>
			{theme === "dark" ? <SunIcon /> : <MoonIcon />}
		</button>
	);
};

interface NoticeProps {
	/** Show a spinner above the message. */
	busy?: boolean;
	children: ComponentChildren;
}

/** Centered full-page message, used for the loading and error states. */
export const Notice = ({ busy = false, children }: NoticeProps) => (
	<div class="notice" role="status" aria-live="polite">
		{busy && <div class="spinner" aria-hidden="true" />}
		{children}
	</div>
);
