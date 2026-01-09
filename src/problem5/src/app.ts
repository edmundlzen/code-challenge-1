import express from "express";
import itemsRouter from "./routes/items";

const app = express();
const PORT = 8000;

app.use(express.json());

app.use("/items", itemsRouter);

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
