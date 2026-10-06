import { Router } from "express";
import { getAllUsers, getUserById, toggleUserStatus } from "../controllers/userManagement";
import { AllowOnly } from "../middlewares/allowOnly";

const userManagementRouter = Router();

userManagementRouter.route("/users").get(AllowOnly("admin"), getAllUsers);
userManagementRouter.route("/users/:id").get(AllowOnly("admin"), getUserById);
userManagementRouter.route("/toggle-status/:id").put(AllowOnly("admin"), toggleUserStatus);


export { userManagementRouter };

