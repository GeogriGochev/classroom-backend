import "dotenv/config";
import express, { type Request, type Response } from "express";
import subjectsRoute from "./routes/subjects";
import departmentsRoute from "./routes/departments";
import cors from "cors";
import securityMiddleware from "./middleware/security";
import { toNodeHandler } from "better-auth/node";
import { auth } from "./lib/auth";
import usersRoute from "./routes/users";
import classesRoute from "./routes/classes";
import enrollmentsRoute from "./routes/enrollments";

const app = express();
const PORT = process.env.PORT || 8000;

if (!process.env.FRONTEND_URL) {
  throw new Error("FRONTEND_URL is not set in environment variables");
}

app.use(cors({
  origin: process.env.FRONTEND_URL,
  methods: ["GET", "POST", "PUT", "DELETE"],
  credentials: true,
}));

app.all("/api/auth/*splat", toNodeHandler(auth));

app.use(express.json());

// app.use(securityMiddleware);

app.use("/api/users", usersRoute);

app.use("/api/departments", departmentsRoute);

app.use("/api/classes", classesRoute);

app.use("/api/enrollments", enrollmentsRoute);

app.use("/api/subjects", subjectsRoute);

app.get("/", (_req: Request, res: Response) => {
  res.json({ message: "Classroom backend is running." });
});

app.listen(PORT, () => {
  console.log(`Server started: http://localhost:${PORT}`);
});
