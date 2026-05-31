import { Router, type IRouter } from "express";
import healthRouter from "./health.js";
import datasetsRouter from "./datasets.js";
import modelsRouter from "./models.js";

const router: IRouter = Router();

router.use(healthRouter);
router.use(datasetsRouter);
router.use(modelsRouter);

export default router;
