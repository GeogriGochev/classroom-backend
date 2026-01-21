import "dotenv/config";
import express, { type Request, type Response } from "express";
import subjectsRoute from "./routes/subjects";
import cors from "cors";

const app = express();
const PORT = process.env.PORT || 8000;

app.use(cors({
  origin: process.env.FRONTEND_URL,
  methods: ["GET", "POST", "PUT", "DELETE"],
  credentials: true,
}));

app.use(express.json());

app.use("/api/subjects", subjectsRoute);

app.get("/", (_req: Request, res: Response) => {
  res.json({ message: "Classroom backend is running." });
});

app.listen(PORT, () => {
  console.log(`Server started: http://localhost:${PORT}`);
});
