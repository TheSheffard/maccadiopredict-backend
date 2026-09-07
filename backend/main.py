"""CardioPredict API with MongoDB authentication and prediction history."""

from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Annotated
import os

import bcrypt
import joblib
import jwt
import pandas as pd
from bson import ObjectId
from dotenv import load_dotenv
from fastapi import Depends, FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from pydantic import BaseModel, EmailStr, Field
from pymongo import ASCENDING, DESCENDING, MongoClient
from pymongo.database import Database
from pymongo.errors import DuplicateKeyError, PyMongoError

HERE = Path(__file__).parent
MODEL_PATH = HERE / "model.joblib"

load_dotenv(HERE / ".env")

MONGODB_URI = os.getenv(
    "MONGODB_URI",
    "mongodb://127.0.0.1:27017/cardio_predict",
)
MONGODB_DATABASE = os.getenv("MONGODB_DATABASE", "cardio_predict")
JWT_SECRET = os.getenv("JWT_SECRET", "development-only-change-this-secret")
JWT_EXPIRES_HOURS = int(os.getenv("JWT_EXPIRES_HOURS", "168"))

app = FastAPI(title="CardioPredict API", version="2.0.0")

allowed_origins = [
    origin.strip().rstrip("/")
    for origin in os.getenv(
        "ALLOWED_ORIGINS",
        "http://localhost:3000",
    ).split(",")
    if origin.strip()
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["Content-Type", "Authorization"],
)

security = HTTPBearer(auto_error=False)
mongo_client: MongoClient | None = None
indexes_created = False
model_bundle = None


class RegisterInput(BaseModel):
    full_name: str = Field(..., min_length=2, max_length=100)
    email: EmailStr
    password: str = Field(..., min_length=8, max_length=128)


class LoginInput(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=1, max_length=128)


class UserOut(BaseModel):
    id: str
    full_name: str
    email: EmailStr
    created_at: datetime


class AuthOut(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut


class PatientInput(BaseModel):
    age_years: float = Field(..., ge=18, le=100)
    gender: int = Field(..., ge=1, le=2)
    height: float = Field(..., ge=120, le=220)
    weight: float = Field(..., ge=30, le=200)
    ap_hi: int = Field(..., ge=80, le=250)
    ap_lo: int = Field(..., ge=40, le=180)
    cholesterol: int = Field(..., ge=1, le=3)
    gluc: int = Field(..., ge=1, le=3)
    smoke: int = Field(..., ge=0, le=1)
    alco: int = Field(..., ge=0, le=1)
    active: int = Field(..., ge=0, le=1)


class PredictionOut(BaseModel):
    id: str
    probability: float
    prediction: int
    risk_level: str
    bmi: float
    pulse_pressure: int
    notes: list[str]
    created_at: datetime


def get_database() -> Database:
    """Connect lazily so an unavailable database does not crash API startup."""
    global mongo_client, indexes_created

    try:
        if mongo_client is None:
            mongo_client = MongoClient(
                MONGODB_URI,
                serverSelectionTimeoutMS=5000,
                connectTimeoutMS=5000,
                maxPoolSize=20,
            )

        mongo_client.admin.command("ping")
        database = mongo_client[MONGODB_DATABASE]

        if not indexes_created:
            database.users.create_index(
                [("email", ASCENDING)],
                unique=True,
            )
            database.predictions.create_index(
                [("user_id", ASCENDING), ("created_at", DESCENDING)]
            )
            indexes_created = True

        return database
    except PyMongoError as error:
        mongo_client = None
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=(
                "The database is unavailable. Check MONGODB_URI and make "
                "sure MongoDB is running."
            ),
        ) from error


def get_model_bundle():
    global model_bundle

    if model_bundle is None:
        if not MODEL_PATH.exists():
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Model not trained yet. Run python train.py first.",
            )

        model_bundle = joblib.load(MODEL_PATH)

    return model_bundle


def normalize_email(email: str) -> str:
    return email.strip().lower()


def hash_password(password: str) -> str:
    return bcrypt.hashpw(
        password.encode("utf-8"),
        bcrypt.gensalt(rounds=12),
    ).decode("utf-8")


def verify_password(password: str, password_hash: str) -> bool:
    try:
        return bcrypt.checkpw(
            password.encode("utf-8"),
            password_hash.encode("utf-8"),
        )
    except (ValueError, TypeError):
        return False


def create_access_token(user_id: str) -> str:
    now = datetime.now(timezone.utc)

    return jwt.encode(
        {
            "sub": user_id,
            "iat": now,
            "exp": now + timedelta(hours=JWT_EXPIRES_HOURS),
        },
        JWT_SECRET,
        algorithm="HS256",
    )


def serialize_user(user: dict) -> UserOut:
    return UserOut(
        id=str(user["_id"]),
        full_name=user["full_name"],
        email=user["email"],
        created_at=user["created_at"],
    )


def serialize_prediction(prediction: dict) -> PredictionOut:
    result = prediction["result"]

    return PredictionOut(
        id=str(prediction["_id"]),
        probability=result["probability"],
        prediction=result["prediction"],
        risk_level=result["risk_level"],
        bmi=result["bmi"],
        pulse_pressure=result["pulse_pressure"],
        notes=result["notes"],
        created_at=prediction["created_at"],
    )


def get_current_user(
    credentials: Annotated[
        HTTPAuthorizationCredentials | None,
        Depends(security),
    ],
) -> dict:
    if credentials is None or credentials.scheme.lower() != "bearer":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Please sign in to continue.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    try:
        payload = jwt.decode(
            credentials.credentials,
            JWT_SECRET,
            algorithms=["HS256"],
        )
        user_id = payload.get("sub")

        if not user_id or not ObjectId.is_valid(user_id):
            raise ValueError("Invalid user identifier")
    except (jwt.InvalidTokenError, ValueError) as error:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Your session is invalid or has expired.",
            headers={"WWW-Authenticate": "Bearer"},
        ) from error

    user = get_database().users.find_one({"_id": ObjectId(user_id)})

    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="This account could not be found.",
        )

    return user


def risk_label(probability: float) -> str:
    if probability < 0.30:
        return "Low"
    if probability < 0.55:
        return "Moderate"
    if probability < 0.75:
        return "Elevated"
    return "High"


def build_notes(data: PatientInput, bmi: float) -> list[str]:
    notes: list[str] = []

    if data.ap_hi >= 140 or data.ap_lo >= 90:
        notes.append("Blood pressure is in the hypertensive range (140/90 or higher).")
    elif data.ap_hi >= 130:
        notes.append("Systolic pressure is slightly elevated.")

    if bmi >= 30:
        notes.append(f"BMI of {bmi:.1f} falls in the obese range.")
    elif bmi >= 25:
        notes.append(f"BMI of {bmi:.1f} falls in the overweight range.")

    if data.cholesterol >= 2:
        notes.append("Cholesterol is above normal.")
    if data.gluc >= 2:
        notes.append("Glucose is above normal.")
    if data.smoke == 1:
        notes.append("Smoking is a significant cardiovascular risk factor.")
    if data.active == 0:
        notes.append("Low physical activity increases cardiovascular risk.")
    if not notes:
        notes.append("No major risk factors were flagged in the supplied values.")

    return notes


@app.get("/")
def root():
    database_connected = False

    try:
        get_database()
        database_connected = True
    except HTTPException:
        pass

    return {
        "status": "ok",
        "service": "CardioPredict API",
        "database_connected": database_connected,
    }


@app.post(
    "/auth/register",
    response_model=AuthOut,
    status_code=status.HTTP_201_CREATED,
)
def register(data: RegisterInput):
    database = get_database()
    email = normalize_email(str(data.email))
    now = datetime.now(timezone.utc)

    user = {
        "full_name": data.full_name.strip(),
        "email": email,
        "password_hash": hash_password(data.password),
        "created_at": now,
        "updated_at": now,
    }

    try:
        result = database.users.insert_one(user)
    except DuplicateKeyError as error:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="An account with this email address already exists.",
        ) from error

    user["_id"] = result.inserted_id

    return AuthOut(
        access_token=create_access_token(str(result.inserted_id)),
        user=serialize_user(user),
    )


@app.post("/auth/login", response_model=AuthOut)
def login(data: LoginInput):
    database = get_database()
    email = normalize_email(str(data.email))
    user = database.users.find_one({"email": email})

    if not user or not verify_password(data.password, user["password_hash"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email address or password.",
        )

    return AuthOut(
        access_token=create_access_token(str(user["_id"])),
        user=serialize_user(user),
    )


@app.get("/auth/me", response_model=UserOut)
def get_me(current_user: Annotated[dict, Depends(get_current_user)]):
    return serialize_user(current_user)


@app.post("/predict", response_model=PredictionOut)
def predict(
    data: PatientInput,
    current_user: Annotated[dict, Depends(get_current_user)],
):
    if data.ap_hi <= data.ap_lo:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Systolic pressure must be greater than diastolic pressure.",
        )

    bundle = get_model_bundle()
    model = bundle["model"]
    features = bundle["features"]

    bmi = data.weight / (data.height / 100) ** 2
    pulse_pressure = data.ap_hi - data.ap_lo

    row = pd.DataFrame(
        [{
            "age_years": data.age_years,
            "gender": data.gender,
            "height": data.height,
            "weight": data.weight,
            "bmi": bmi,
            "ap_hi": data.ap_hi,
            "ap_lo": data.ap_lo,
            "pulse_pressure": pulse_pressure,
            "cholesterol": data.cholesterol,
            "gluc": data.gluc,
            "smoke": data.smoke,
            "alco": data.alco,
            "active": data.active,
        }]
    )[features]

    probability = float(model.predict_proba(row)[0, 1])
    created_at = datetime.now(timezone.utc)
    result = {
        "probability": round(probability, 4),
        "prediction": int(probability >= 0.5),
        "risk_level": risk_label(probability),
        "bmi": round(bmi, 1),
        "pulse_pressure": pulse_pressure,
        "notes": build_notes(data, bmi),
    }

    prediction_document = {
        "user_id": current_user["_id"],
        "input": data.model_dump(),
        "result": result,
        "created_at": created_at,
    }

    inserted = get_database().predictions.insert_one(prediction_document)
    prediction_document["_id"] = inserted.inserted_id

    return serialize_prediction(prediction_document)


@app.get("/predictions", response_model=list[PredictionOut])
def prediction_history(
    current_user: Annotated[dict, Depends(get_current_user)],
):
    predictions = get_database().predictions.find(
        {"user_id": current_user["_id"]}
    ).sort("created_at", DESCENDING).limit(50)

    return [serialize_prediction(item) for item in predictions]
