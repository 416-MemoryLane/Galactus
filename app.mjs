import express from "express";
import JWT from "jsonwebtoken";
import bcrypt from "bcrypt";
import mongoose from "mongoose";
import dotenv from "dotenv";
import { User } from "./models/Schemas.mjs";
dotenv.config();

const app = express();
app.use(express.json());
const port = 3000;

app.post("/login", async (req, res) => {
  const {
    body: { username, password },
  } = req;

  const hash = bcrypt.hashSync(password, 10);
  let user = await User.findOne({ username });
  let message = `${username} successfully logged in`;

  if (user) {
    if (!bcrypt.compareSync(password, user.password)) {
      return res.status(403).send({ message: "incorrect password" });
    }
  } else {
    user = new User({ username, password: hash });
    await user.save();
    message = `Account with username ${username} successfully created`;
  }

  res.send({
    username: user.username,
    token: "TOKEN",
    message,
  });
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
