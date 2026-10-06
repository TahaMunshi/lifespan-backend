import { Request, Response } from "express";
import { User } from "../models/user";
import sendEmail from "../utils/nodeMailer";
import { tryCatch } from "../utils/tryCatch";
import { ApiResponse } from "../utils/apiResponse";
import { ApiError } from "../utils/apiError";
import { cookieOptions } from "../config/cookieOptions";

const signup = tryCatch(async (req: any, res: Response): Promise<any> => {
  if (String(process.env.ENABLE_SIGNUP || "").toLowerCase() !== "true") {
    throw new ApiError(403, "Signup is disabled");
  }
  const { fullName, email, password } = req.body;
  const image = req?.files && req?.files?.image ? req?.files?.image[0]?.path : null;

  // check if email already exists
  const existingUser = await User.findOne({ email });
  if (existingUser) {
    throw new ApiError(400, "User already exists");
  }

  const user = await User.create({
    fullName,
    email,
    password,
    image
  });

  if (!user) {
    throw new ApiError(500, "Failed to create user");
  }

  return ApiResponse(res, "User created successfully", user);
});

const login = tryCatch(async (req: Request, res: Response): Promise<any> => {
  const { email, password } = req.body;

  if (!email || !password) {
    throw new ApiError(400, "Please provide email and password");
  }
  const user: any = await User.findOne({ email });
  if (!user) {
    throw new ApiError(401, "user not found");
  }

  // check for user
  const isPasswordValid = await user.isPasswordCorrect(password);

  if (!isPasswordValid) {
    throw new ApiError(401, "Invalid credentials");
  }

  // generate JWT
  // generate JWT
  const accessToken = user.generateAccessToken();
  const refreshToken = user.generateRefreshToken();
  user.refreshToken = refreshToken;
  await user.save({ validateBeforeSave: false });

  res.cookie("refreshToken", refreshToken, cookieOptions);
  res.cookie("accessToken", accessToken, cookieOptions);

  return ApiResponse(res, "Login successful", { user, accessToken, refreshToken });
});

const logout = tryCatch(async (req: any, res: Response): Promise<any> => {
  await User.findByIdAndUpdate(
    req?.user?._id,
    {
      $set: {
        refreshToken: null,
      },
    },
    {
      new: true,
    },
  );

  res.clearCookie("accessToken", cookieOptions)
    .clearCookie("refreshToken", cookieOptions)

  return ApiResponse(res, "Logout successful");
});

const forgotPassword = tryCatch(async (req: Request, res: Response): Promise<any> => {
  const { email } = req.body;

  if (!email) {
    throw new ApiError(400, "Please provide your email");
  }

  const user = await User.findOne({ email });

  if (!user) {
    throw new ApiError(404, "User not found");
  }

  const otp = Math.floor(1000 + Math.random() * 9000);

  user.otp = otp;
  await user.save({ validateBeforeSave: false });

  const message = `Your Otp Verification Code is ${otp}`;

  await sendEmail(user.email, "Password Reset Request", message);

  return ApiResponse(res, "Otp sent to your email successfully");
},
);

const verifyOtp = tryCatch(async (req: Request, res: Response): Promise<any> => {
  const { email, otp } = req.body;

  if (!email || !otp) {
    throw new ApiError(400, "Please provide all required fields");
  }

  const user = await User.findOne({ email });

  if (!user) {
    throw new ApiError(404, "User not found");
  }

  if (user.otp !== otp) {
    throw new ApiError(401, "Invalid OTP");
  }

  return ApiResponse(res, "OTP verified successfully");
});

const resetPassword = tryCatch(async (req: Request, res: Response): Promise<any> => {
  const { email, password, otp } = req.body;

  if (!email || !password || !otp) {
    throw new ApiError(400, "Please provide all required fields");
  }

  const user: any = await User.findOne({ email });

  if (!user) {
    throw new ApiError(404, "User not found");
  }

  if (user.otp !== otp) {
    throw new ApiError(401, "Invalid OTP");
  }

  user.otp = null;
  user.password = password;
  await user.save();

  return ApiResponse(res, "Password Reset Successfully!");
},
);

const changePassword = tryCatch(async (req: any, res: Response): Promise<any> => {
  const { oldPassword, newPassword } = req.body;
  const user: any = await User.findById(req.user._id).select("-otp");

  if (!user) {
    throw new ApiError(404, "User not found");
  }

  // check for user
  const isPasswordValid = await user.isPasswordCorrect(oldPassword);

  if (!isPasswordValid) {
    throw new ApiError(401, "Invalid old password");
  }

  user.password = newPassword;
  await user.save();

  return ApiResponse(res, "Password changed successfully");
},
);

export {
  changePassword,
  forgotPassword,
  login,
  logout,
  resetPassword,
  signup,
  verifyOtp,
};
