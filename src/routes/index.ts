import express from "express";
import { authRouter } from "./auth";
import { profileRouter } from "./profile";
import { userManagementRouter } from "./userManagement";
import { lmsRouter } from "./lms";

const router = express.Router();

router.use("/auth", authRouter);
router.use("/profile", profileRouter);
router.use("/user-management", userManagementRouter);
router.use("/lms", lmsRouter);


export { router };
