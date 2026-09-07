"use client";

import { type FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "../auth-context";

export default function LoginPage() {
  const { user, loading, login } = useAuth();
  const router = useRouter();
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    if (!loading && user) router.replace("/dashboard");
  }, [loading, router, user]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSubmitting(true);

    const form = new FormData(event.currentTarget);
    try {
      await login(String(form.get("email")), String(form.get("password")));
      router.replace("/dashboard");
    } catch (submissionError) {
      setError(submissionError instanceof Error ? submissionError.message : "Unable to sign in.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="auth-page">
      <section className="auth-panel">
        <div className="auth-card">
          <Link href="/" className="auth-brand">CardioPredict</Link>
          <p className="auth-eyebrow">Secure access</p>
          <h1>Welcome back.</h1>
          <p className="auth-intro">Sign in before accessing the cardiovascular risk dashboard.</p>

          {error && <div className="auth-error" role="alert">{error}</div>}

          <form onSubmit={handleSubmit} className="auth-form">
            <label>
              Email address
              <input name="email" type="email" autoComplete="email" required placeholder="you@example.com" />
            </label>

            <label>
              Password
              <div className="auth-password">
                <input
                  name="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  required
                  placeholder="Enter your password"
                />
                <button type="button" onClick={() => setShowPassword((current) => !current)}>
                  {showPassword ? "Hide" : "Show"}
                </button>
              </div>
            </label>

            <button className="auth-submit" disabled={submitting || loading}>
              {submitting ? "Signing in…" : "Sign in"}
            </button>
          </form>

          <p className="auth-switch">
            New to CardioPredict? <Link href="/register">Create an account</Link>
          </p>
        </div>
      </section>

      <aside className="auth-information">
        <div className="auth-ecg" aria-hidden="true">
          <svg viewBox="0 0 500 100">
            <path d="M0 50 H130 L155 50 L170 12 L190 88 L210 28 L228 50 H500" />
          </svg>
        </div>
        <div>
          <p>Private screening workspace</p>
          <h2>Your risk estimates remain connected to your account.</h2>
          <span>Return later to access the dashboard and review previous predictions.</span>
        </div>
      </aside>
    </main>
  );
}
