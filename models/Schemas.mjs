import { Schema, model } from "mongoose";

const userSchema = new Schema({
  username: String,
  password: String,
});

const albumSchema = new Schema({
  albumName: String,
  createdBy: String,
  authorizedUsers: [String],
});

export const User = model("User", userSchema);
export const Album = model("Album", albumSchema);
