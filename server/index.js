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
      return done(
        "Error retrieving connected client from pool in Local Strategy"
      );
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
    async (req, accessToken, requestToken, profile, done) => {
      try {
        const username = profile.email;
        const client = await pool.connect();
        try {
          const result = await client.query(
            "SELECT * FROM users WHERE email = $1 AND password = $2",
            [username, "GOOGLE"]
          );
          client.release();
          if (result.rows.length == 0) {
            return done(null, false);
          } else {
            return done(null, { username });
          }
        } catch (err) {
          return done(
            "Error retrieving user info from database for google Google Strategy"
          );
        }
      } catch (err) {
        return done(
          "Error retrieving connected client from pool in google Google Strategy"
        );
      }
    }
  )
);

passport.use(
  "google-register",
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: "http://localhost:3000/auth/google/login",
      userProfileURL: "https://www.googleapis.com/oauth2/v3/userinfo",
      passReqToCallback: true,
    },
    async (req, accessToken, requestToken, profile, done) => {
      try {
        const username = profile.email;
        const client = await pool.connect();
        try {
          const result = await client.query(
            "SELECT * FROM users WHERE email = $1",
            [username]
          );
          if (result.rows.length > 0) {
            client.release();
            return done(null, false);
          } else {
            try {
              await client.query("INSERT INTO users VALUES ($1, $2)", [
                username,
                "GOOGLE",
              ]);
              client.release();
              return done(null, { username });
            } catch (err) {
              return done(
                "Error inserting user info from database for google-register Google Strategy"
              );
            }
          }
        } catch (err) {
          return done(
            "Error retrieving user info from database for google-register Google Strategy"
          );
        }
      } catch (err) {
        return done(
          "Error retrieving connected client from pool in google-register Google Strategy"
        );
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

app.post("/register/local", async (req, res) => {
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
          client.release();
          res.json({
            success: false,
            usernameMessage: "Email already in use!",
          });
        } else {
          bcrypt.hash(password, saltRounds, async (err, hash) => {
            if (err) {
              console.error("Trouble generating Bcrypt hash");
            }
            try {
              await client.query("INSERT INTO users VALUES ($1, $2)", [
                username,
                hash,
              ]);
              client.release();
              req.login({ username }, (err) => {
                if (err) {
                  console.error(
                    "Trouble authenticating using Passport Local Strategy"
                  );
                }
                res.json({ success: true });
              });
            } catch (err) {
              console.error(
                "Error inserting user info from database for /register/local route"
              );
            }
          });
        }
      } catch (err) {
        console.error(
          "Error retrieving user info from database for register route"
        );
      }
    } catch (err) {
      console.error(
        "Error retrieving connected client from pool in /register/local route"
      );
    }
  }
});

app.get(
  "/register/google",
  passport.authenticate("google-register", {
    scope: ["profile", "email"],
    state: "google-register",
  })
);

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
    state: "google",
  })
);

app.get("/auth/google/login", (req, res, next) => {
  const strategy = req.query.state;
  if (strategy === "google") {
    passport.authenticate("google", {
      successRedirect: "/",
      failureRedirect: "/auth",
    })(req, res, next);
  } else {
    passport.authenticate("google-register", {
      successRedirect: "/",
      failureRedirect: "/auth",
    })(req, res, next);
  }
});

/*********************************{ Start Server}******************************/
app.listen(port, () => {
  console.log(`Listening in on Port ${port}`);
});
