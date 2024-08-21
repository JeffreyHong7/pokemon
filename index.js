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
app.use(express.static(join(path, "public")));
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
  new LocalStrategy(
    { passReqToCallback: true },
    async (req, username, password, done) => {
      try {
        const client = await pool.connect();
        try {
          const result = await client.query(
            "SELECT * FROM users WHERE email = $1",
            [username]
          );
          client.release();
          if (result.rows.length === 0) {
            req.session.error = "User email is not registered";
            return done(null, false);
          }
          const userPassword = result.rows[0].password;
          bcrypt.compare(password, userPassword, (err, match) => {
            if (err) {
              return done("Error in Bcrypt hash comparison");
            } else {
              if (match) {
                return done(null, { username });
              } else {
                req.session.error =
                  userPassword === "GOOGLE"
                    ? "Email is registered under a Google account"
                    : "Incorrect Password";
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
    }
  )
);

passport.use(
  "google",
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: "http://localhost:3000/login/google/redirect",
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
          client.release();
          if (result.rows.length == 0) {
            req.session.error = "Google account is not registered!";
            return done(null, false);
          } else {
            if (result.rows[0].password === "GOOGLE") {
              return done(null, { username });
            } else {
              req.session.error = "Email is registered under a local account!";
              return done(null, false);
            }
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
      callbackURL: "http://localhost:3000/login/google/redirect",
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
            req.session.error =
              result.rows[0].password === "GOOGLE"
                ? "Google account is already registered!"
                : "Email is registered as a local account!";
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
app.get("/", (req, res) => {
  if (req.isAuthenticated()) {
    res.render("index.ejs");
  } else {
    res.redirect("/login");
  }
});

app.get("/login", (req, res) => {
  const error = req.session.error;
  req.session.error = null;
  res.render("login.ejs", { error });
});

app.get("/register", (req, res) => {
  const error = req.session.error;
  req.session.error = null;
  res.render("register.ejs", { error });
});

app.post("/register/local", async (req, res) => {
  const username = req.body.username;
  const password = req.body.password;
  const confirmedPassword = req.body["confirm-password"];
  if (password != confirmedPassword) {
    res.render("register.ejs", { error: "Password fields do not match!" });
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
          res.render("register.ejs", {
            error:
              result.rows[0].password === "GOOGLE"
                ? "Email is registered as a Google account"
                : "Email is already registered",
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
                res.render("/");
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
  "/login/local",
  passport.authenticate("local", {
    successRedirect: "/",
    failureRedirect: "/login",
  })
);

app.get(
  "/login/google",
  passport.authenticate("google", {
    scope: ["profile", "email"],
    state: "google",
  })
);

app.get("/login/google/redirect", (req, res, next) => {
  const strategy = req.query.state;
  if (strategy === "google") {
    passport.authenticate("google", {
      successRedirect: "/",
      failureRedirect: "/login",
    })(req, res, next);
  } else {
    passport.authenticate("google-register", {
      successRedirect: "/",
      failureRedirect: "/register",
    })(req, res, next);
  }
});

/*********************************{ Start Server}******************************/
app.listen(port, () => {
  console.log(`Listening in on Port ${port}`);
});
