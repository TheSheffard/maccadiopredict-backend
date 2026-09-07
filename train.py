"""
Train the cardiovascular disease model.

Dataset: Kaggle "Cardiovascular Disease dataset" (sulianova/cardiovascular-disease-dataset)
File:    cardio_train.csv  (semicolon-separated, 70,000 rows)

Usage:
    1. Download cardio_train.csv from Kaggle and place it in this folder.
    2. python train.py
    3. model.joblib is written next to this script and loaded by main.py.
"""

from pathlib import Path

import joblib
import numpy as np
import pandas as pd
from sklearn.ensemble import GradientBoostingClassifier
from sklearn.metrics import accuracy_score, roc_auc_score
from sklearn.model_selection import train_test_split

HERE = Path(__file__).parent
DATA = HERE / "cardio_train.csv"
MODEL_OUT = HERE / "model.joblib"

FEATURES = [
    "age_years", "gender", "height", "weight", "bmi",
    "ap_hi", "ap_lo", "pulse_pressure",
    "cholesterol", "gluc", "smoke", "alco", "active",
]


def load_and_clean() -> pd.DataFrame:
    df = pd.read_csv(DATA, sep=";")

    # Age comes in days -> convert to years
    df["age_years"] = (df["age"] / 365.25).round(1)

    # Drop physiologically impossible blood pressure readings (known noise in this dataset)
    df = df[(df["ap_hi"].between(80, 250)) & (df["ap_lo"].between(40, 180))]
    df = df[df["ap_hi"] > df["ap_lo"]]

    # Drop extreme height/weight outliers
    df = df[df["height"].between(120, 220) & df["weight"].between(30, 200)]

    # Engineered features
    df["bmi"] = df["weight"] / (df["height"] / 100) ** 2
    df["pulse_pressure"] = df["ap_hi"] - df["ap_lo"]

    return df


def main() -> None:
    if not DATA.exists():
        raise SystemExit(
            "cardio_train.csv not found.\n"
            "Download it from Kaggle (search: 'Cardiovascular Disease dataset', "
            "author sulianova) and place it in the backend/ folder."
        )

    df = load_and_clean()
    X = df[FEATURES]
    y = df["cardio"]

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42, stratify=y
    )

    model = GradientBoostingClassifier(
        n_estimators=300,
        learning_rate=0.08,
        max_depth=4,
        subsample=0.9,
        random_state=42,
    )
    model.fit(X_train, y_train)

    proba = model.predict_proba(X_test)[:, 1]
    preds = (proba >= 0.5).astype(int)
    print(f"Rows used:  {len(df):,}")
    print(f"Accuracy:   {accuracy_score(y_test, preds):.4f}")
    print(f"ROC AUC:    {roc_auc_score(y_test, proba):.4f}")

    joblib.dump({"model": model, "features": FEATURES}, MODEL_OUT)
    print(f"Saved -> {MODEL_OUT}")


if __name__ == "__main__":
    main()
