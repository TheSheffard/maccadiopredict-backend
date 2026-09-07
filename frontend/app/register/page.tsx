"use client";

import { type FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "../auth-context";

export default function RegisterPage() {
  const { user, loading, register } = useAuth();
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
    const password = String(form.get("password"));
    const confirmPassword = String(form.get("confirmPassword"));

    if (password !== confirmPassword) {
      setError("The passwords do not match.");
      setSubmitting(false);
      return;
    }

    try {
      await register({
        full_name: String(form.get("fullName")),
        email: String(form.get("email")),
        password,
      });
      router.replace("/dashboard");
    } catch (submissionError) {
      setError(submissionError instanceof Error ? submissionError.message : "Unable to create the account.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="auth-page">
      <section className="auth-panel">
        <div className="auth-card auth-card-wide">
          <Link href="/" className="auth-brand">CardioPredict</Link>
          <p className="auth-eyebrow">Create an account</p>
          <h1>Start your secure screening workspace.</h1>
          <p className="auth-intro">Register once to use the dashboard and keep your prediction records.</p>

          {error && <div className="auth-error" role="alert">{error}</div>}

          <form onSubmit={handleSubmit} className="auth-form">
            <label>
              Full name
              <input name="fullName" autoComplete="name" minLength={2} maxLength={100} required placeholder="Your full name" />
            </label>

            <label>
              Email address
              <input name="email" type="email" autoComplete="email" required placeholder="you@example.com" />
            </label>

            <div className="auth-form-row">
              <label>
                Password
                <div className="auth-password">
                  <input
                    name="password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="new-password"
                    minLength={8}
                    required
                    placeholder="At least 8 characters"
                  />
                  <button type="button" onClick={() => setShowPassword((current) => !current)}>
                    {showPassword ? "Hide" : "Show"}
                  </button>
                </div>
              </label>

              <label>
                Confirm password
                <input
                  name="confirmPassword"
                  type={showPassword ? "text" : "password"}
                  autoComplete="new-password"
                  minLength={8}
                  required
                  placeholder="Repeat password"
                />
              </label>
            </div>

            <button className="auth-submit" disabled={submitting || loading}>
              {submitting ? "Creating account…" : "Create account"}
            </button>
          </form>

          <p className="auth-switch">
            Already have an account? <Link href="/login">Sign in</Link>
          </p>
        </div>
      </section>

      <aside className="auth-information auth-information-register">
        <div className="auth-ecg" aria-hidden="true">
          <svg viewBox="0 0 500 100">
            <path d="M0 50 H130 L155 50 L170 12 L190 88 L210 28 L228 50 H500" />
          </svg>
        </div>
        <div>
          <p>Responsible screening</p>
          <h2>Routine measurements. Clear machine-learning estimates.</h2>
          <span>CardioPredict is a screening aid and does not replace medical diagnosis or professional care.</span>
        </div>
      </aside>
    </main>
  );
}
