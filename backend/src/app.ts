import express from "express";
import cors from "cors";
import swaggerUi from "swagger-ui-express";
import routes from "./routes";
import notFoundHandler from "./middlewares/notFoundHandler";
import errorHandler from "./middlewares/errorHandler";
import swaggerSpec from "./config/swagger";

const app = express();

app.use(cors());
app.use(express.json());

app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

app.get("/api-docs.json", (_req, res) => {
    res.setHeader("Content-Type", "application/json");
    res.send(swaggerSpec);
});

app.use("/api", routes);

app.use(errorHandler);
app.use(notFoundHandler);

export default app;
