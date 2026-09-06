import { useState } from "preact/hooks";
import { api } from "./client.ts";
import { Notice, ThemeToggle, TopBar } from "./Shell.tsx";
import type { Theme } from "./theme.ts";

interface LoginProps {
	theme: Theme;
	onToggleTheme: () => void;
	onLoginSuccess: () => void;
}

export const Login = ({ theme, onToggleTheme, onLoginSuccess }: LoginProps) => {
	const [username, setUsername] = useState("");
	const [password, setPassword] = useState("");
	const [isLoading, setIsLoading] = useState(false);
	const [error, setError] = useState("");

	const handleSubmit = async (e: Event) => {
		e.preventDefault();

		if (!username || !password) {
			setError("Please enter both your email and password");
			return;
		}

		setIsLoading(true);
		setError("");

		try {
			const response = await api.login({ username, password });

			if (response.ok) {
				onLoginSuccess();
			} else {
				const result = (await response.json().catch(() => null)) as {
					message?: string;
				} | null;
				setError(result?.message ?? "Login failed");
			}
		} catch (err) {
			setError("Network error. Please try again.");
			console.error("Login error:", err);
		} finally {
			setIsLoading(false);
		}
	};

	return (
		<div class="app">
			<TopBar>
				<ThemeToggle theme={theme} onToggle={onToggleTheme} />
			</TopBar>
			<main class="login">
				<div class="login-card">
					<div class="login-header">
						<img src="/icon.png" alt="" width={56} height={56} />
						<h1>FreeSleep</h1>
						<p>Sign in with your Eight Sleep account</p>
					</div>

					<form onSubmit={handleSubmit}>
						<div class="field">
							<label for="login-email">Email</label>
							<input
								id="login-email"
								type="email"
								name="username"
								autocomplete="username"
								placeholder="you@example.com"
								value={username}
								onInput={(e) =>
									setUsername((e.target as HTMLInputElement).value)
								}
								disabled={isLoading}
								required
							/>
						</div>

						<div class="field">
							<label for="login-password">Password</label>
							<input
								id="login-password"
								type="password"
								name="password"
								autocomplete="current-password"
								placeholder="Your Eight Sleep password"
								value={password}
								onInput={(e) =>
									setPassword((e.target as HTMLInputElement).value)
								}
								disabled={isLoading}
								required
							/>
						</div>

						{error && (
							<div class="form-error" role="alert">
								{error}
							</div>
						)}

						<button
							type="submit"
							class="button button--primary"
							disabled={isLoading}
						>
							{isLoading ? "Signing in…" : "Sign in"}
						</button>
					</form>

					<p class="login-note">
						Your credentials are sent to Eight Sleep and kept on this server
						only, so it can follow your schedule while the page is closed.
						FreeSleep is not affiliated with Eight Sleep.
					</p>
				</div>
			</main>
		</div>
	);
};

interface LoginUnavailableProps {
	theme: Theme;
	onToggleTheme: () => void;
	onRetry: () => void;
}

/** Shown when the session could not be checked (e.g. Eight Sleep is down). */
export const Unavailable = ({
	theme,
	onToggleTheme,
	onRetry,
}: LoginUnavailableProps) => (
	<div class="app">
		<TopBar>
			<ThemeToggle theme={theme} onToggle={onToggleTheme} />
		</TopBar>
		<Notice>
			<p>Couldn't reach your pod right now.</p>
			<button type="button" class="button" onClick={onRetry}>
				Try again
			</button>
		</Notice>
	</div>
);
