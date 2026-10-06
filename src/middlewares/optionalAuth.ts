import jwt, { JwtPayload } from "jsonwebtoken";
import { Response, NextFunction } from "express";
import { User } from "../models/user";

export const optionalJWT = async (req: any, res: Response, next: NextFunction) => {
  try {
    const token: string | undefined =
      req.cookies?.accessToken ||
      req.header("Authorization")?.replace("Bearer ", "");
    if (!token) return next();

    const decodedToken = jwt.verify(
      token,
      process.env.ACCESS_TOKEN_SECRET as string,
    ) as JwtPayload;
    if (!decodedToken?._id) return next();

    const user: any = await User.findById(decodedToken._id).select(
      "-password -refreshToken -otp",
    );
    if (user?.isActive) req.user = user;
  } catch {
    // Public routes still work without a valid token.
  }
  next();
};
