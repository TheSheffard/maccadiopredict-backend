"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiRequest } from "../api-client";
import { useAuth } from "../auth-context";
import ProtectedRoute from "../components/protected-route";

type Prediction = {
  id: string;
  probability: number;
  prediction: number;
  risk_level: string;
  bmi: number;
  pulse_pressure: number;
  notes: string[];
  created_at: string;
};

type FormState = {
  age_years: string;
  gender: string;
  height: string;
  weight: string;
  ap_hi: string;
  ap_lo: string;
  cholesterol: string;
  gluc: string;
  smoke: string;
  alco: string;
  active: string;
};

const initialForm: FormState = {
  age_years: "",
  gender: "1",
  height: "",
  weight: "",
  ap_hi: "",
  ap_lo: "",
  cholesterol: "1",
  gluc: "1",
  smoke: "0",
  alco: "0",
  active: "1",
};

const sampleLowRisk: FormState = {
  age_years: "34",
  gender: "1",
  height: "168",
  weight: "60",
  ap_hi: "110",
  ap_lo: "70",
  cholesterol: "1",
  gluc: "1",
  smoke: "0",
  alco: "0",
  active: "1",
};

const sampleHighRisk: FormState = {
  age_years: "62",
  gender: "2",
  height: "172",
  weight: "98",
  ap_hi: "165",
  ap_lo: "100",
  cholesterol: "3",
  gluc: "2",
  smoke: "1",
  alco: "1",
  active: "0",
};

const inputCls =
  "w-full rounded-lg border border-line bg-white px-3.5 py-2.5 text-[15px] text-ink outline-none transition focus:border-crimson focus:ring-2 focus:ring-crimson/15 placeholder:text-muted/60";

const labelCls = "mb-1.5 block text-[13px] font-medium text-muted";

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className={labelCls}>{label}</label>
      {children}
    </div>
  );
}

function Toggle({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex items-center justify-between rounded-lg border border-line bg-white px-3.5 py-2.5">
      <span className="text-[15px]">{label}</span>
      <div className="flex gap-1">
        {["0", "1"].map((v) => (
          <button
            key={v}
            type="button"
            onClick={() => onChange(v)}
            className={`rounded-md px-3 py-1 text-[13px] font-medium transition ${
              value === v
                ? "bg-ink text-white"
                : "text-muted hover:bg-line/60"
            }`}
          >
            {v === "0" ? "No" : "Yes"}
          </button>
        ))}
      </div>
    </div>
  );
}

function Ecg({ beat }: { beat: boolean }) {
  return (
    <svg
      viewBox="0 0 320 60"
      className={`h-12 w-full ${beat ? "ecg-beat" : ""}`}
      aria-hidden="true"
    >
      <path
        className="ecg-path"
        d="M0 30 H90 L102 30 L110 14 L118 46 L126 22 L134 30 H180 L192 30 L200 14 L208 46 L216 22 L224 30 H320"
        fill="none"
        stroke="#9f2b2b"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {!beat && (
        <line
          x1="0"
          y1="30"
          x2="320"
          y2="30"
          stroke="#e7e5e4"
          strokeWidth="2"
        />
      )}
    </svg>
  );
}

function DashboardContent() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const [form, setForm] = useState<FormState>(initialForm);
  const [result, setResult] = useState<Prediction | null>(null);
  const [history, setHistory] = useState<Prediction[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiRequest<Prediction[]>("/predictions")
      .then(setHistory)
      .catch(() => undefined);
  }, []);

  const set = (key: keyof FormState) => (value: string) =>
    setForm((f) => ({ ...f, [key]: value }));

  function loadSample(sample: FormState) {
    setForm(sample);
    setResult(null);
    setError(null);
  }

  async function handleSubmit() {
    setError(null);
    setLoading(true);
    setResult(null);
    try {
      const prediction = await apiRequest<Prediction>("/predict", {
        method: "POST",
        body: JSON.stringify({
          age_years: Number(form.age_years),
          gender: Number(form.gender),
          height: Number(form.height),
          weight: Number(form.weight),
          ap_hi: Number(form.ap_hi),
          ap_lo: Number(form.ap_lo),
          cholesterol: Number(form.cholesterol),
          gluc: Number(form.gluc),
          smoke: Number(form.smoke),
          alco: Number(form.alco),
          active: Number(form.active),
        }),
      });
      setResult(prediction);
      setHistory((current) => [prediction, ...current].slice(0, 50));
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "The prediction could not be completed."
      );
    } finally {
      setLoading(false);
    }
  }

  const filled =
    form.age_years && form.height && form.weight && form.ap_hi && form.ap_lo;

  return (
    <main className="mx-auto max-w-5xl px-5 py-12 md:py-16">
      {/* Header */}
      <header className="mb-12">
        <div className="mb-7 flex flex-col gap-4 border-b border-line pb-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-[13px] font-medium uppercase tracking-[0.14em] text-crimson">
              CardioPredict
            </p>
            <p className="mt-1 text-[13px] text-muted">
              Signed in as {user?.email}
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              logout();
              router.replace("/login");
            }}
            className="self-start rounded-lg border border-line bg-white px-4 py-2 text-[13px] font-medium text-ink transition hover:border-crimson/50 hover:text-crimson sm:self-auto"
          >
            Sign out
          </button>
        </div>
        <h1 className="font-[family-name:var(--font-display)] text-4xl font-medium leading-tight md:text-5xl">
          Cardiovascular risk, estimated from routine measurements.
        </h1>
        <p className="mt-4 max-w-xl text-[15px] leading-relaxed text-muted">
          Enter blood pressure, cholesterol, and lifestyle values to get a
          machine-learning estimate of cardiovascular disease risk, trained on
          70,000 patient records.
        </p>
      </header>

      <div className="grid gap-10 md:grid-cols-[1.15fr_1fr] md:gap-14">
        {/* Form */}
        <div className="space-y-8">
          <section>
            <h2 className="mb-3 text-[13px] font-semibold uppercase tracking-[0.12em] text-ink">
              Test with sample data
            </h2>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => loadSample(sampleLowRisk)}
                className="flex-1 rounded-lg border border-line bg-white px-4 py-2.5 text-[14px] font-medium text-ink transition hover:border-ink/40"
              >
                Load healthy sample
              </button>
              <button
                type="button"
                onClick={() => loadSample(sampleHighRisk)}
                className="flex-1 rounded-lg border border-crimson/30 bg-crimson-soft px-4 py-2.5 text-[14px] font-medium text-crimson transition hover:border-crimson/60"
              >
                Load high-risk sample
              </button>
            </div>
          </section>

          <section>
            <h2 className="mb-4 text-[13px] font-semibold uppercase tracking-[0.12em] text-ink">
              Profile
            </h2>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Age (years)">
                <input
                  type="number"
                  className={inputCls}
                  placeholder="52"
                  value={form.age_years}
                  onChange={(e) => set("age_years")(e.target.value)}
                />
              </Field>
              <Field label="Sex">
                <select
                  className={inputCls}
                  value={form.gender}
                  onChange={(e) => set("gender")(e.target.value)}
                >
                  <option value="1">Female</option>
                  <option value="2">Male</option>
                </select>
              </Field>
              <Field label="Height (cm)">
                <input
                  type="number"
                  className={inputCls}
                  placeholder="170"
                  value={form.height}
                  onChange={(e) => set("height")(e.target.value)}
                />
              </Field>
              <Field label="Weight (kg)">
                <input
                  type="number"
                  className={inputCls}
                  placeholder="74"
                  value={form.weight}
                  onChange={(e) => set("weight")(e.target.value)}
                />
              </Field>
            </div>
          </section>

          <section>
            <h2 className="mb-4 text-[13px] font-semibold uppercase tracking-[0.12em] text-ink">
              Blood work
            </h2>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Systolic pressure">
                <input
                  type="number"
                  className={inputCls}
                  placeholder="120"
                  value={form.ap_hi}
                  onChange={(e) => set("ap_hi")(e.target.value)}
                />
              </Field>
              <Field label="Diastolic pressure">
                <input
                  type="number"
                  className={inputCls}
                  placeholder="80"
                  value={form.ap_lo}
                  onChange={(e) => set("ap_lo")(e.target.value)}
                />
              </Field>
              <Field label="Cholesterol">
                <select
                  className={inputCls}
                  value={form.cholesterol}
                  onChange={(e) => set("cholesterol")(e.target.value)}
                >
                  <option value="1">Normal</option>
                  <option value="2">Above normal</option>
                  <option value="3">Well above normal</option>
                </select>
              </Field>
              <Field label="Glucose">
                <select
                  className={inputCls}
                  value={form.gluc}
                  onChange={(e) => set("gluc")(e.target.value)}
                >
                  <option value="1">Normal</option>
                  <option value="2">Above normal</option>
                  <option value="3">Well above normal</option>
                </select>
              </Field>
            </div>
          </section>

          <section>
            <h2 className="mb-4 text-[13px] font-semibold uppercase tracking-[0.12em] text-ink">
              Lifestyle
            </h2>
            <div className="space-y-3">
              <Toggle
                label="Smoker"
                value={form.smoke}
                onChange={set("smoke")}
              />
              <Toggle
                label="Drinks alcohol"
                value={form.alco}
                onChange={set("alco")}
              />
              <Toggle
                label="Physically active"
                value={form.active}
                onChange={set("active")}
              />
            </div>
          </section>

          <button
            onClick={handleSubmit}
            disabled={!filled || loading}
            className="w-full rounded-lg bg-ink px-5 py-3.5 text-[15px] font-medium text-white transition hover:bg-ink/90 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {loading ? "Estimating…" : "Estimate risk"}
          </button>

          {error && (
            <p className="rounded-lg border border-crimson/30 bg-crimson-soft px-4 py-3 text-[14px] text-crimson">
              {error}
            </p>
          )}
        </div>

        {/* Result panel */}
        <aside className="md:sticky md:top-10 md:self-start">
          <div className="rounded-2xl border border-line bg-white p-7">
            <Ecg beat={!!result} />

            {result ? (
              <div key={result.probability}>
                <p className="mt-5 font-[family-name:var(--font-display)] text-6xl font-medium text-ink">
                  {(result.probability * 100).toFixed(1)}
                  <span className="text-2xl text-muted">%</span>
                </p>
                <p className="mt-1 text-[15px]">
                  <span
                    className={
                      result.prediction === 1
                        ? "font-medium text-crimson"
                        : "font-medium text-ink"
                    }
                  >
                    {result.risk_level} risk
                  </span>{" "}
                  <span className="text-muted">
                    of cardiovascular disease
                  </span>
                </p>

                <dl className="mt-6 grid grid-cols-2 gap-4 border-t border-line pt-5 text-[14px]">
                  <div>
                    <dt className="text-muted">BMI</dt>
                    <dd className="mt-0.5 font-medium">{result.bmi}</dd>
                  </div>
                  <div>
                    <dt className="text-muted">Pulse pressure</dt>
                    <dd className="mt-0.5 font-medium">
                      {result.pulse_pressure} mmHg
                    </dd>
                  </div>
                </dl>

                <ul className="mt-5 space-y-2 border-t border-line pt-5">
                  {result.notes.map((note) => (
                    <li
                      key={note}
                      className="flex gap-2.5 text-[14px] leading-relaxed text-muted"
                    >
                      <span className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-crimson/70" />
                      {note}
                    </li>
                  ))}
                </ul>
              </div>
            ) : (
              <div className="mt-5">
                <p className="font-[family-name:var(--font-display)] text-2xl text-ink">
                  Awaiting measurements
                </p>
                <p className="mt-2 text-[14px] leading-relaxed text-muted">
                  Fill in the values on the left and the model will return a
                  risk estimate here, along with the factors that shaped it.
                </p>
              </div>
            )}
          </div>

          <p className="mt-4 px-1 text-[12px] leading-relaxed text-muted">
            This is a screening estimate from a statistical model, not a
            medical diagnosis. Consult a healthcare professional about any
            results.
          </p>
        </aside>
      </div>

      <section className="mt-16 border-t border-line pt-10">
        <div className="mb-5 flex items-end justify-between gap-5">
          <div>
            <p className="mb-2 text-[12px] font-semibold uppercase tracking-[0.12em] text-crimson">
              Account history
            </p>
            <h2 className="font-[family-name:var(--font-display)] text-2xl font-medium text-ink">
              Recent risk estimates
            </h2>
          </div>
          <span className="text-[12px] text-muted">Stored in MongoDB</span>
        </div>

        {history.length ? (
          <div className="overflow-hidden rounded-xl border border-line bg-white">
            {history.slice(0, 8).map((item) => (
              <article
                key={item.id}
                className="grid gap-3 border-b border-line px-5 py-4 last:border-b-0 sm:grid-cols-[1fr_auto_auto] sm:items-center sm:gap-7"
              >
                <div>
                  <strong className={item.prediction === 1 ? "text-crimson" : "text-ink"}>
                    {item.risk_level} risk
                  </strong>
                  <p className="mt-1 text-[12px] text-muted">
                    {new Date(item.created_at).toLocaleString()}
                  </p>
                </div>
                <div className="text-[13px] text-muted">
                  BMI <strong className="ml-1 text-ink">{item.bmi}</strong>
                </div>
                <div className="font-[family-name:var(--font-display)] text-2xl text-ink">
                  {(item.probability * 100).toFixed(1)}%
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-line bg-white px-6 py-10 text-center">
            <p className="text-[14px] text-muted">
              Your completed predictions will appear here.
            </p>
          </div>
        )}
      </section>
    </main>
  );
}

export default function DashboardPage() {
  return (
    <ProtectedRoute>
      <DashboardContent />
    </ProtectedRoute>
  );
}
