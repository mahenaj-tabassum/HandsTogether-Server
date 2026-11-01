import { createRemoteJWKSet, jwtVerify } from "jose";
import "dotenv/config"

const AUTH_URL = process.env.CLIENT_URL;
const JWKS = createRemoteJWKSet(new URL(`${AUTH_URL}/api/auth/jwks`));
export const verifyJWT = async (req, res, next) => {
  const header = req.headers.authorization;

  // Header must look like "Bearer <toke>"
  if (!header?.startsWith("Bearer ")) {
    return res
      .status(401)
      .json({ success: false, message: "Authentication required" });
  }
  const token = header.split(" ")[1];
  try {
    // Verify signature, expiry, issuer and audience
    const { payload } = await jwtVerify(token, JWKS, {
      issuer: AUTH_URL,
      audience: AUTH_URL,
    });

    // Keep only what we need on the request
    req.user = {
      id: payload.id ?? payload.sub,
      email: payload.email,
      name: payload.name,
    };
    next();
  } catch (error) {
    return res
      .status(401)
      .json({ success: false, message: "Invalid or expired token" });
  }
};
