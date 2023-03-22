import express from "express";
import jwt from "jsonwebtoken";
import { compareSync, hashSync } from "bcrypt";
import mongoose from "mongoose";
import dotenv from "dotenv";
import { Album, User } from "./models/Schemas.mjs";
dotenv.config();

const app = express();
app.use(express.json());
const port = 3000;

app.post("/login", async (req, res) => {
  const {
    body: { username, password, multiaddr },
  } = req;

  if (!username || !password || !multiaddr) {
    return res.status(400).send(`username, password, and multiaddr required`);
  }

  let user = await User.findOne({ username });
  let message = `${username} successfully logged in`;

  if (user) {
    if (!compareSync(password, user.password)) {
      return res.status(403).send({ message: "incorrect password" });
    }
    user.multiaddr = multiaddr;
    await user.save();
  } else {
    user = new User({ username, password: hashSync(password, 10), multiaddr });
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
        async ({ id, albumName, authorizedUsers, createdBy }) => {
          const userMultiaddrs = await Promise.all(
            authorizedUsers.map(async (username) => {
              const user = await User.findOne({ username });
              return user.multiaddr;
            })
          );
          return {
            albumId: id,
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
      body: { albumName, username, authorizedUsers },
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
    });

    await newAlbum.save();

    return res.status(200).send({
      message: `Album ${albumName} successfully added`,
    });
  } catch (err) {
    return res.status(500).send({ error: err });
  }
});

app.delete("/delete_album", authenticatedRoute, async (req, res) => {
  const {
    query: { albumId, username },
  } = req;
  try {
    const album = await Album.findById(albumId);
    if (!album) {
      return res
        .status(404)
        .send({ message: `Album with ID "${albumId}" not found` });
    }
    if (username === album.createdBy) {
      await album.deleteOne();
      return res.status(200).send({ message: "ok" });
    }
    return res.status(403).send({
      message: `You are not authorized to delete album with ID ${albumId}`,
    });
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
