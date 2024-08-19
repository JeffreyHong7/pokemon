import express from "express";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import env from "dotenv";
import pkgPg from "pg";
import connectPgSimple from "connect-pg-simple";
import session from "express-session";
import bodyParser from "body-parser";
import passport from "passport";
import LocalStrategy from "passport-local";
import bcrypt from "bcrypt";
import GoogleStrategy from "passport-google-oauth2";

/*******************{ Initialize Important Variables }*************************/
const app = express();
const port = 3000;

const path = dirname(fileURLToPath(import.meta.url));

const saltRounds = 10;

env.config();

const { Pool } = pkgPg;
const pool = new Pool({
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_DATABASE,
});

const PgSession = connectPgSimple(session);
const sessionStore = new PgSession({
  pool,
  tableName: "session_store",
  cleanupInterval: 1000 * 60 * 60,
});

/*************************{ Initialize Middleware }****************************/
app.use(express.static(join(path, "../client/dist")));
app.use(
  session({
    store: sessionStore,
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: true,
    cookies: { maxAge: 1000 * 60 * 60 },
  })
);
app.use(bodyParser.urlencoded({ extended: true }));
app.use(passport.initialize());
app.use(passport.session());

/*****************{ Initialize Authentication Strategies }*********************/
passport.use(
  "local",
  new LocalStrategy(async (username, password, done) => {
    try {
      const client = await pool.connect();
      try {
        const result = await client.query(
          "SELECT * FROM users WHERE email = $1",
          [username]
        );
        client.release();
        if (result.rows.length < 1) {
          return done("User not found");
        }
        const userPassword = result.rows[0].password;
        bcrypt.compare(password, userPassword, (err, match) => {
          if (err) {
            return done("Error in Bcrypt hash comparison");
          } else {
            if (match) {
              return done(null, { username });
            } else {
              return done(null, false);
            }
          }
        });
      } catch (err) {
        console.error(err.stack);
        return done(
          "Error retrieving user info from database for local login route"
        );
      }
    } catch (err) {
      return done("Error retrieving connected client from pool");
    }
  })
);

passport.use(
  "google",
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: "http://localhost:3000/auth/google/login",
      userProfileURL: "https://www.googleapis.com/oauth2/v3/userinfo",
      passReqToCallback: true,
    },
    (req, accessToken, requestToken, profile, done) => {
      try {
        return done(null, { username: profile.email });
      } catch (err) {
        return done(err);
      }
    }
  )
);

/****************{ Passport Serialization/Deserialization }********************/
passport.serializeUser((user, cb) => {
  cb(null, user);
});

passport.deserializeUser((user, cb) => {
  cb(null, user);
});

/***********************{ Initialize Route handlers }**************************/
function serveReact(_, res) {
  res.sendFile(join(path, "../client/dist/index.html"));
}

app.get("/", serveReact);

app.get("/auth", serveReact);

app.post("/register", async (req, res) => {
  const username = req.body.username;
  const password = req.body.password;
  const confirmedPassword = req.body["confirm-password"];
  if (password != confirmedPassword) {
    res.json({
      success: false,
      passwordMessage: "Passwords do not match!",
    });
  } else {
    try {
      const client = await pool.connect();
      try {
        const result = await client.query(
          "SELECT * FROM users WHERE email = $1",
          [username]
        );
        if (result.rows.length > 0) {
          res.json({
            success: false,
            usernameMessage: "Email already in use!",
          });
        } else {
          bcrypt.hash(password, saltRounds, (err, hash) => {
            if (err) {
              console.error("Trouble generating Bcrypt hash");
            }
            client.query("INSERT INTO users VALUES ($1, $2)", [username, hash]);
            client.release();
            req.login({ username }, (err) => {
              if (err) {
                console.error(
                  "Trouble authenticating using Passport Local Strategy"
                );
              }
              res.json({ success: true });
            });
          });
        }
      } catch (err) {
        console.error(
          "Error retrieving user info from database for register route"
        );
      }
    } catch (err) {
      console.error("Error retrieving connected client from pool");
    }
  }
});

app.post(
  "/auth/local",
  passport.authenticate("local", {
    successRedirect: "/",
    failureRedirect: "/auth",
  })
);

app.get(
  "/auth/google",
  passport.authenticate("google", {
    scope: ["profile", "email"],
  })
);

app.get(
  "/auth/google/login",
  passport.authenticate("google", {
    successRedirect: "/",
    failureRedirect: "/auth",
  })
);

/*********************************{ Start Server}******************************/
app.listen(port, () => {
  console.log(`Listening in on Port ${port}`);
});
