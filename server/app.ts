import { type Server } from "node:http";

import express, {
  type Express,
  type Request,
  Response,
  NextFunction,
} from "express";
import session from "express-session";
import connectPgSimple from "connect-pg-simple";
import * as client from "openid-client";
import { storage } from "./db-storage";

import { registerRoutes } from "./routes";

export function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  console.log(`${formattedTime} [${source}] ${message}`);
}

export const app = express();

declare module 'http' {
  interface IncomingMessage {
    rawBody: unknown
  }
}

declare module "express-session" {
  interface SessionData {
    userId?: string;
    codeVerifier?: string;
    state?: string;
  }
}

app.use(express.json({
  verify: (req, _res, buf) => {
    req.rawBody = buf;
  }
}));
app.use(express.urlencoded({ extended: false }));

const PgSession = connectPgSimple(session);

app.use(
  session({
    store: new PgSession({
      conString: process.env.DATABASE_URL,
      createTableIfMissing: true,
    }),
    secret: process.env.SESSION_SECRET || "fallback-secret-change-in-production",
    resave: false,
    saveUninitialized: false,
    cookie: {
      maxAge: 30 * 24 * 60 * 60 * 1000,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
    },
  })
);

let oidcConfig: client.Configuration | null = null;

async function getOIDCConfig() {
  if (oidcConfig) return oidcConfig;

  const issuerUrl = new URL(process.env.ISSUER_URL || "https://replit.com");
  const clientId = process.env.REPLIT_DOMAINS || "localhost:5000";
  
  oidcConfig = await client.discovery(issuerUrl, clientId, "");
  return oidcConfig;
}

function getRedirectUri() {
  return process.env.REPL_ID
    ? `https://${process.env.REPL_ID.toLowerCase()}.${process.env.REPLIT_DOMAINS?.split(",")[0]}/api/auth/callback`
    : "http://localhost:5000/api/auth/callback";
}

app.get("/api/login", async (req, res) => {
  try {
    const config = await getOIDCConfig();
    const codeVerifier = client.randomPKCECodeVerifier();
    const codeChallenge = await client.calculatePKCECodeChallenge(codeVerifier);
    const state = client.randomState();

    req.session.codeVerifier = codeVerifier;
    req.session.state = state;

    const redirectUri = getRedirectUri();
    const authUrl = client.buildAuthorizationUrl(config, {
      redirect_uri: redirectUri,
      scope: "openid profile email",
      code_challenge: codeChallenge,
      code_challenge_method: "S256",
      state,
    });

    res.redirect(authUrl.href);
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).send("Authentication error");
  }
});

app.get("/api/auth/callback", async (req, res) => {
  try {
    const config = await getOIDCConfig();
    const { codeVerifier, state } = req.session;

    if (!codeVerifier || !state) {
      return res.status(400).send("Invalid session");
    }

    const callbackUrl = new URL(getRedirectUri());
    callbackUrl.search = new URL(req.url, "http://localhost").search;

    const tokens = await client.authorizationCodeGrant(config, callbackUrl, {
      pkceCodeVerifier: codeVerifier,
      expectedState: state,
      idTokenExpected: true,
    });

    const userinfo = await client.fetchUserInfo(config, tokens.access_token, tokens.token_type);

    const user = await storage.upsertUser({
      id: userinfo.sub as string,
      email: (userinfo.email as string) || null,
      firstName: (userinfo.given_name as string) || null,
      lastName: (userinfo.family_name as string) || null,
      profileImageUrl: (userinfo.picture as string) || null,
    });

    req.session.userId = user.id;
    delete req.session.codeVerifier;
    delete req.session.state;

    res.redirect("/");
  } catch (error) {
    console.error("Callback error:", error);
    res.status(500).send("Authentication failed");
  }
});

app.get("/api/logout", (req, res) => {
  req.session.destroy(() => {
    res.redirect("/");
  });
});

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

export default async function runApp(
  setup: (app: Express, server: Server) => Promise<void>,
) {
  const server = await registerRoutes(app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  // importantly run the final setup after setting up all the other routes so
  // the catch-all route doesn't interfere with the other routes
  await setup(app, server);

  // ALWAYS serve the app on the port specified in the environment variable PORT
  // Other ports are firewalled. Default to 5000 if not specified.
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = parseInt(process.env.PORT || '5000', 10);
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true,
  }, () => {
    log(`serving on port ${port}`);
  });
}
