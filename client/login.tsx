import { hc } from "hono/client";
import { useState } from "hono/jsx/dom";
import type { AppType } from "../server/api.ts";

const client = hc<AppType>("/");

interface LoginProps {
	onLoginSuccess: () => void;
}

export const Login = ({ onLoginSuccess }: LoginProps) => {
	const [username, setUsername] = useState("");
	const [password, setPassword] = useState("");
	const [isLoading, setIsLoading] = useState(false);
	const [error, setError] = useState("");

	const handleSubmit = async (e: Event) => {
		e.preventDefault();

		if (!username || !password) {
			setError("Please enter both username and password");
			return;
		}

		setIsLoading(true);
		setError("");

		try {
			const response = await client.login.$post({
				json: {
					username,
					password,
				},
			});

			const result = await response.json();

			if (response.ok && "success" in result && result.success) {
				onLoginSuccess();
			} else {
				setError("message" in result ? result.message : "Login failed");
			}
		} catch (err) {
			setError("Network error. Please try again.");
			console.error("Login error:", err);
		} finally {
			setIsLoading(false);
		}
	};

	return (
		<div className="login-container">
			<div className="login-form">
				<h1>FreeSleep</h1>
				<p>Sign in to your Eight Sleep account</p>

				<form onSubmit={handleSubmit}>
					<div className="form-group">
						<input
							type="text"
							placeholder="Username"
							value={username}
							onChange={(e) =>
								setUsername((e.target as HTMLInputElement).value)
							}
							disabled={isLoading}
							required
						/>
					</div>

					<div className="form-group">
						<input
							type="password"
							placeholder="Password"
							value={password}
							onChange={(e) =>
								setPassword((e.target as HTMLInputElement).value)
							}
							disabled={isLoading}
							required
						/>
					</div>

					{error && <div className="error-message">{error}</div>}

					<button type="submit" disabled={isLoading}>
						{isLoading ? "Signing in..." : "Sign In"}
					</button>
				</form>
			</div>
		</div>
	);
};
