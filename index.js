const express = require("express");
const app = express();
const cors = require("cors");
const mongoose = require("mongoose");
require("dotenv").config();
const User = require("./models/User");
const Exercise = require("./models/Exercise");

app.use(cors());
app.use(express.static("public"));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use((req, res, next) => {
  console.log(`Method: ${req.method}`);
  console.log(`Request Body: ${JSON.stringify(req.body)}`);
  console.log(`Path: ${req.path}`);
  next();
});

mongoose.connect(process.env.MONGODB_URI);
const db = mongoose.connection;
db.on("connected", () => {
  console.log("DB connected");
});
db.on("error", (error) => {
  console.log({ error: error });
});

app.get("/", (req, res) => {
  res.sendFile(__dirname + "/views/index.html");
});

app.get("/api/users", async (req, res) => {
  const users = await User.find({});
  res.json(users);
});

app.post("/api/users", async (req, res) => {
  const { username } = req.body;
  console.log(username);

  try {
    const newUser = new User({ username });
    const savedUser = await newUser.save();
    console.log("user saved successfully!");
    res.json({
      username: savedUser.username,
      _id: savedUser._id,
    });
  } catch (error) {
    console.log({ error: "error on saving the user" });
    res.end();
  }
});

app.post("/api/users/:_id/exercises", async (req, res) => {
  const userId = req.params._id;
  console.log("current userId: ", userId);

  const { description, duration, date } = req.body;
  //const exerciseDate = date ? new Date(date) : Date.now();
  let exerciseDate = date ? new Date(date) : new Date();

  try {
    //find user from the database
    const foundUser = await User.findById(userId);
    if (!foundUser) return res.status(404).json({ error: "user not found" });
    const username = foundUser.username;

    console.log("exercise object ", {
      username,
      description,
      duration,
      date: exerciseDate.toDateString(),
      exercises: foundUser.exercises,
    });

    const newExercise = new Exercise({
      user: foundUser._id,
      description,
      duration,
      date: exerciseDate,
    });

    const savedExercise = await newExercise.save();

    foundUser.exercises.push(newExercise);
    await foundUser.save();

    console.log("new exercise successfully saved!");
    res.status(201).json({
      username: foundUser.username,
      _id: foundUser._id,
      description: savedExercise.description,
      duration: savedExercise.duration,
      date: savedExercise.date.toDateString(),
    });
  } catch (error) {
    console.error({ error: "error saving the exercise" });
  }
});

app.get("/api/users/:_id/logs", async (req, res) => {
  const userId = req.params._id;

  const { from, to, limit } = req.query;

  try {
    const foundUser = await User.findById(userId).populate("exercises");
    if (!foundUser) return res.json({ error: "Invalid user" });

    let filteredExercises = foundUser.exercises;

    if (from) {
      const fromDate = new Date(from);
      if (!isNaN(fromDate)) {
        filteredExercises = filteredExercises.filter(
          (exercise) => new Date(exercise.date) >= fromDate
        );
      }
    }

    if (to) {
      const toDate = new Date(to);
      if (!isNaN(toDate)) {
        filteredExercises = filteredExercises.filter(
          (exercise) => new Date(exercise.date) <= toDate
        );
      }
    }

    if (limit) {
      filteredExercises = filteredExercises.slice(0, parseInt(limit));
    }

    // const count = foundUser.exercises.length;
    const log = filteredExercises.map(({ description, duration, date }) => ({
      description,
      duration,
      date: new Date(date).toDateString(),
    }));

    const logObject = {
      username: foundUser.username,
      count: log.length,
      _id: foundUser._id,
      log,
    };

    res.status(200).json(logObject);
    
  } catch (error) {
    console.log("error fetching the logs: ", error.message);
    res.json({ error: "Internal server error" });
  }
});

const listener = app.listen(process.env.PORT || 3000, () => {
  console.log("Your app is listening on port " + listener.address().port);
});
