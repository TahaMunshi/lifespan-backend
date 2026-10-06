import { Response } from "express";
import { User } from "../models/user";
import { tryCatch } from "../utils/tryCatch";
import { ApiResponse } from "../utils/apiResponse";
import { ApiError } from "../utils/apiError";
import mongoose from "mongoose";

const getAllUsers = tryCatch(async (req: any, res: Response): Promise<any> => {

  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 10;
  const keyword = req.query.keyword || "";
  const role = req.query.role || "user";


  const aggregate = User.aggregate([
    { $match: { ...(role ? { role } : { role: { $ne: "admin" } }), ...(keyword ? { fullName: { $regex: keyword, $options: "i" } } : {}) } },
    { $sort: { createdAt: -1 } },
  ]);

  const options = { page, limit };

  const result = await (User as any).aggregatePaginate(aggregate, options);

  return ApiResponse(res, "Users fetched successfully", result, 200);
});

const getUserById = tryCatch(async (req: any, res: Response): Promise<any> => {

  const { id } = req.params;

  if (!id || !mongoose.Types.ObjectId.isValid(id)) {
    throw new Error("User id is required");
  }

  const user = await User.findById(id);

  if (!user) {
    throw new ApiError(404, "User not found");
  }

  return ApiResponse(res, "User fetched successfully", user);

});

const toggleUserStatus = tryCatch(async (req: any, res: Response): Promise<any> => {

  const { id } = req.params;

  if (!id || !mongoose.Types.ObjectId.isValid(id)) {
    throw new Error("User id is required");
  }

  const user = await User.findById(id);

  if (!user) {
    throw new Error("User not found");
  }

  if (user.role === "admin") {
    throw new Error("Admin users cannot be deactivated");
  }

  user.isActive = !user.isActive;
  await user.save();


  return ApiResponse(res, `User ${user.isActive ? "activated" : "deactivated"} successfully`, user, 200);


})

export { getAllUsers, getUserById, toggleUserStatus };
