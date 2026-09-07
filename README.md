# CardioPredict Full-Stack System

CardioPredict is a protected cardiovascular risk prediction dashboard. Users must register or sign in before opening the dashboard. Accounts and prediction history are stored in MongoDB, passwords are hashed with bcrypt, and authenticated requests use JWT bearer tokens.

## Technology stack

- Frontend: Next.js 16, React 19, TypeScript and Tailwind CSS
- Backend: FastAPI and Python
- Database: MongoDB with PyMongo
- Machine learning: scikit-learn, pandas and the included `model.joblib`
- Authentication: JWT and bcrypt password hashing

## Run MongoDB

You can use MongoDB Atlas or a locally installed MongoDB service.

If using local MongoDB on Windows, open **Services** and start **MongoDB Server**, or run the following from an Administrator terminal:

```powershell
net start MongoDB
```

If you receive a connection-refused error for `localhost:27017`, MongoDB is not running. Start the service or place your MongoDB Atlas connection string in `backend/.env`.

## Backend setup

```bash
cd backend
python -m venv .venv
```

Activate the environment on Windows:

```powershell
.venv\Scripts\activate
```

Install the packages:

```bash
pip install -r requirements.txt
```

Copy `.env.example` to `.env` and update the values:

```env
MONGODB_URI=mongodb://127.0.0.1:27017/cardio_predict
MONGODB_DATABASE=cardio_predict
JWT_SECRET=replace-with-a-long-random-secret
JWT_EXPIRES_HOURS=168
ALLOWED_ORIGINS=http://localhost:3000
```

Start the API:

```bash
uvicorn main:app --reload --port 8000
```

## Frontend setup

Open a second terminal:

```bash
cd frontend
npm install
```

Copy `.env.example` to `.env.local`:

```env
NEXT_PUBLIC_API_URL=http://localhost:8000
```

Start the frontend:

```bash
npm run dev
```

Open `http://localhost:3000`. The application redirects unauthenticated visitors to `/login`. Registration signs the user in immediately and opens the protected dashboard.

## API routes

| Method | Route | Access | Description |
|---|---|---|---|
| `GET` | `/` | Public | API and database health |
| `POST` | `/auth/register` | Public | Create a MongoDB user and receive a JWT |
| `POST` | `/auth/login` | Public | Authenticate an existing user |
| `GET` | `/auth/me` | Authenticated | Restore the signed-in user |
| `POST` | `/predict` | Authenticated | Run and save a prediction |
| `GET` | `/predictions` | Authenticated | Retrieve the current user's prediction history |

## MongoDB collections

- `users`: names, normalized emails, bcrypt password hashes and account timestamps
- `predictions`: user ownership, submitted measurements, prediction results and timestamps

The raw password is never stored in MongoDB.

## Production

Build the frontend with:

```bash
npm run build
```

For deployment, configure the same backend environment variables on the backend host. Set `ALLOWED_ORIGINS` to the deployed frontend address and set `NEXT_PUBLIC_API_URL` to the deployed FastAPI address before building the frontend.
