import { NextFunction, Response, Request } from "express";

interface ErrorResponse {
  message: string;
  stack?: string;
}

export function errorHandler(
  err: any,
  req: Request,
  res: Response<ErrorResponse>,
  next: NextFunction,
) {
  const statusCode = err.statusCode || 500;
  res.status(statusCode);

  const responseBody = {
    success: false,
    message: err.message,
    errors: err.errors || [],
    stack: process.env.NODE_ENV === "production" ? "" : err.stack,
  };

  console.error("Error:", responseBody);
  res.json(responseBody);
}
