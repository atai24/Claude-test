import type { Request, Response, NextFunction } from "express";
import type { ApiError } from "@pokemon-tcg/shared";

export class AppError extends Error {
  constructor(
    public readonly statusCode: number,
    message: string
  ) {
    super(message);
    this.name = "AppError";
  }
}

export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  if (err instanceof AppError) {
    const body: ApiError = {
      error: err.name,
      message: err.message,
      statusCode: err.statusCode,
    };
    res.status(err.statusCode).json(body);
    return;
  }

  console.error("[error]", err);

  const body: ApiError = {
    error: "InternalServerError",
    message: "An unexpected error occurred",
    statusCode: 500,
  };
  res.status(500).json(body);
}
