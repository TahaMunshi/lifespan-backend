class ApiError extends Error {
  public statusCode: number;
  public data: any;
  public errors: any[];
  public success: boolean;

  constructor(
    statusCode: number = 500,
    message: string = "Something went wrong",
    errors: any[] = [],
    stack?: string
  ) {
    super(message);

    Object.setPrototypeOf(this, new.target.prototype);

    this.statusCode = statusCode;
    this.data = null;
    this.errors = errors;
    this.success = false;

    if (stack) {
      this.stack = stack;
    } else {
      Error.captureStackTrace(this, this.constructor);
    }
  }
}

export { ApiError };
