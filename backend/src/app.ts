import express from "express";
import cors from "cors";
import routes from "./routes";
import notFoundHandler from "./middlewares/notFoundHandler";
import errorHandler from "./middlewares/errorHandler";

const app = express();

app.use(cors());
app.use(express.json());

app.use("/api", routes);

app.use(errorHandler);
app.use(notFoundHandler);

export default app;
