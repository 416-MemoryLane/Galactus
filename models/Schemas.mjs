import { Schema, model } from "mongoose";

const userSchema = new Schema({
  username: String,
  password: String,
  multiaddr: String
});

const albumSchema = new Schema({
  albumName: String,
  createdBy: String,
  authorizedUsers: [String],
  uuid: String
});

export const User = model("User", userSchema);
export const Album = model("Album", albumSchema);
