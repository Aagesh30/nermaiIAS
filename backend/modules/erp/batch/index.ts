import { Router } from "express";
import { BatchController } from "./controller";

export default Router()
    .get("/", BatchController.getAll)
    .post("/", BatchController.create)
    .put("/:id", BatchController.update)
    .delete("/:id", BatchController.delete);
