import { Schema, model } from "mongoose";

const userSchema = new Schema({
  username: String,
  password: String,
});

const albumSchema = new Schema({
  albumName: String,
  authorizedUsers: [String],
  createdBy: String,
});

export const User = model("User", userSchema);
export const Album = model("Album", userSchema);
