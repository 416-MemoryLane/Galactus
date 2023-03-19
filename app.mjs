import express from "express";
import { google } from "googleapis";
import mongoose from "mongoose";
import dotenv from "dotenv";
dotenv.config();

const app = express();
app.use(express.json());
const port = 3000;

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  "http://localhost:3000/auth/callback"
);

function getGoogleAuthURL() {
  /*
   * Generate a url that asks permissions to the user's email and profile
   */
  const scopes = ["https://www.googleapis.com/auth/userinfo.email"];

  return oauth2Client.generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    scope: scopes, // If you only need one scope you can pass it as string
  });
}

// open in browser https://gist.github.com/hyg/9c4afcd91fe24316cbf0
app.get("/auth/login", (req, res) => {
  res.send(getGoogleAuthURL());
});

app.get("/auth/callback", (req, res) => {
  res.send("logged in");
});

app.get("/sync", (req, res) => {
  // TODO
});

app.get("/albums", (req, res) => {
  // TODO
});

app.get("/users", (req, res) => {
  // TODO
});

app.get("/", (req, res) => {
  res.send("Hello world");
});

(async () => {
  try {
    await mongoose.connect(process.env.ATLAS_URI);
    console.log("Connected to MongoDB");

    app.listen(port, () => {
      console.log(`Galactus running on port ${port}`);
    });
  } catch (err) {
    console.error(err);
  }
})();
