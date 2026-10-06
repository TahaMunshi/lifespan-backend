const NODE_ENV = process.env.NODE_ENV

const hour = 24 * 30

export const cookieOptions: any = {
  maxAge: hour * 60 * 60 * 1000,
  httpOnly: false,
  secure: NODE_ENV !== "development",
  sameSite: NODE_ENV !== "development" ? "none" : "lax",
  domain: NODE_ENV?.includes("live") ? ".domain.extension" : undefined,
  path: "/"
}

// export const cookieOptions: any = {
//   httpOnly: false,
//   secure: ["customdev", "live"].includes(process.env.NODE_ENV as string),
//   sameSite: ["customdev", "live"].includes(process.env.NODE_ENV as string) ? "none" : "lax",
// };