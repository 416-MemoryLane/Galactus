import express from "express";
import jwt from "jsonwebtoken";
import { compareSync, hashSync } from "bcrypt";
import mongoose from "mongoose";
import dotenv from "dotenv";
import cors from "cors";
import { Album, User } from "./models/Schemas.mjs";
dotenv.config();

const app = express();
app.use(express.json());
app.use(cors());
const port = process.env.PORT || 3000;

app.post("/login", async (req, res) => {
  const {
    body: { username, password, multiaddr },
  } = req;

  if (!username || !password) {
    return res.status(400).send(`username, password required`);
  }

  let user = await User.findOne({ username });
  let message = `${username} successfully logged in`;

  if (user) {
    if (!compareSync(password, user.password)) {
      return res.status(403).send({ message: "incorrect password" });
    }
    if (multiaddr) {
      user.multiaddr = multiaddr;
      await user.save();
    }
  } else {
    user = new User({ username, password: hashSync(password, 10) });
    if (multiaddr) {
      user.multiaddr = multiaddr;
    }
    await user.save();
    message = `Account with username ${username} successfully created`;
  }

  res.send({
    username: user.username,
    token: jwt.sign({ username, multiaddr }, process.env.JWT_TOKEN),
    message,
  });
});

const authenticatedRoute = (req, res, next) => {
  const authHeader = req.header("Authorization");
  if (!authHeader) {
    return res.status(403).send({ message: "Unauthorized" });
  }
  const [_, token] = authHeader?.split("Bearer ");
  if (!token) {
    return res.status(403).send({ message: "Unauthorized" });
  }
  try {
    jwt.verify(token, process.env.JWT_TOKEN);
  } catch (err) {
    return res.status(498).send({ message: "Invalid token", error: err });
  }
  next();
};

app.post("/sync", authenticatedRoute, async (req, res) => {
  const {
    body: { username },
  } = req;

  try {
    const authorizedAlbums = await Album.find({ authorizedUsers: username });

    const result = await Promise.all(
      authorizedAlbums.map(
        async ({ uuid, albumName, authorizedUsers, createdBy }) => {
          const userMultiaddrs = await Promise.all(
            authorizedUsers.map(async (username) => {
              const user = await User.findOne({ username });
              return user.multiaddr;
            })
          );
          return {
            albumId: uuid,
            albumName,
            authorizedUsers: userMultiaddrs.filter((addr) => !!addr),
            createdBy,
          };
        }
      )
    );

    return res.status(200).send(result);
  } catch (err) {
    return res.status(500).send({ error: err });
  }
});

app.post("/add_album", authenticatedRoute, async (req, res) => {
  try {
    const {
      body: { albumName, username, authorizedUsers, uuid },
    } = req;

    const alreadyExists = await Album.find({
      $and: [{ albumName }, { createdBy: username }],
    });

    if (alreadyExists.length) {
      return res.status(500).send({
        error: `You've already created an album with the name '${albumName}'`,
      });
    }

    const newAlbum = new Album({
      albumName,
      createdBy: username,
      authorizedUsers,
      uuid,
    });

    await newAlbum.save();

    return res.status(200).send({
      message: `Album ${albumName} successfully added`,
    });
  } catch (err) {
    return res.status(500).send({ error: err });
  }
});

app.patch("/update_album", authenticatedRoute, async (req, res) => {
  try {
    const {
      body: { albumName, username, authorizedUsers },
    } = req;

    const album = await Album.findOne({
      $and: [{ albumName }, { createdBy: username }],
    });

    if (!album) {
      return res.status(404).send({
        error: `Cannot find album '${albumName}'`,
      });
    }

    album.authorizedUsers = authorizedUsers;
    await album.save();

    return res.status(200).send({
      message: `Album ${albumName} successfully updated`,
    });
  } catch (err) {
    return res.status(500).send({ error: err });
  }
});

app.patch("/leave_album", authenticatedRoute, async (req, res) => {
  const {
    query: { uuid, username },
  } = req;
  try {
    const album = await Album.findOne({ uuid });
    if (!album) {
      return res
        .status(404)
        .send({ message: `Album with uuid "${uuid}" not found` });
    }
    album.authorizedUsers = album.authorizedUsers.filter(
      (user) => user !== username
    );
    await album.save();
    return res
      .status(200)
      .send({ message: "You've been removed from album" + album.albumName });
  } catch (err) {
    return res.status(500).send({ error: err });
  }
});

app.get("/users", authenticatedRoute, async (req, res) => {
  try {
    const users = await User.find();
    return res.status(200).send(users.map(({ username }) => username));
  } catch (err) {
    return res.status(500).send({ error: err });
  }
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
