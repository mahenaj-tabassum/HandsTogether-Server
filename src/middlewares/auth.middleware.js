import "dotenv/config";
import { createRemoteJWKSet, jwtVerify } from "jose";

const AUTH_URL = process.env.AUTH_URL;

// Create a JWKS resolver to retrieve public keys from the Better Auth JWKS endpoint.
// These public keys are used to verify JWT signatures.
const JWKS = createRemoteJWKSet(new URL(`${AUTH_URL}/api/auth/jwks`));

// Middleware to authenticate incoming requests
export const verifyJWT = async (req, res, next) => {
  const header = req.headers.authorization;

  // Check whether the header contains a Bearer token
  if (!header?.startsWith("Bearer ")) {
    return res
      .status(401)
      .json({ success: false, message: "Authentication required" });
  }

  // Extract the JWT token
  const token = header.split(" ")[1];
  try {
    // Verify signature, expiry, issuer and audience
    const { payload } = await jwtVerify(token, JWKS, {
      issuer: AUTH_URL,
      audience: AUTH_URL,
    });

    // Attach verified user information to the request
    // so that subsequent routes can access it through req.user
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
