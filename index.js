const express = require("express");
const bodyParser = require("body-parser");
const methodOverride = require("method-override");

//PostgreSQL database connection
const db = require("./db"); 

const app = express();
const PORT = 3000;

app.use(express.static("public"));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(methodOverride("_method"));

app.set("view engine", "ejs");


let currentUserId = null; 
let currentUserName = null;



// Sign-up 
app.get("/signup", (req, res) => {
  res.render("signup");
});

// Sign-up
app.post("/signup", async (req, res) => {
  const { user_id, password, name } = req.body;
  try {
    // Check if user_id already exists
    const existingUser = await db.query("SELECT * FROM users WHERE user_id = $1", [user_id]);
    if (existingUser.rows.length > 0) {
      return res.send("User ID already taken. Please go back and choose another.");
    }

    // Insert new user into database
    await db.query(
      "INSERT INTO users (user_id, password, name) VALUES ($1, $2, $3)",
      [user_id, password, name]
    );
    res.redirect("/signin");
  } catch (err) {
    console.error(err);
    res.status(500).send("Error signing up");
  }
});

// Sign-in
app.get("/signin", (req, res) => {
  res.render("signin");
});


app.post("/signin", async (req, res) => {
  const { user_id, password } = req.body;
  try {
    const result = await db.query(
      "SELECT * FROM users WHERE user_id = $1 AND password = $2",
      [user_id, password]
    );

    if (result.rows.length === 0) {
      return res.send("Invalid user ID or password. Please try again.");
    }

    // Set current a
    currentUserId = result.rows[0].user_id;
    currentUserName = result.rows[0].name;

    res.redirect("/");
  } catch (err) {
    console.error(err);
    res.status(500).send("Error signing in");
  }
});



// Home Route
app.get("/", async (req, res) => {
  try {
    const result = await db.query("SELECT * FROM blogs ORDER BY date_created DESC");
    res.render("index", { 
      posts: result.rows, 
      currentUserId: currentUserId,
      currentUserName: currentUserName 
    });
  } catch (err) {
    console.error(err);
    res.status(500).send("Server Error");
  }
});

// Sign-out route
app.get("/signout", (req, res) => {
  currentUserId = null;
  currentUserName = null;
  res.redirect("/");
});

// Create Route
app.post("/posts", async (req, res) => {
  if (!currentUserId) {
    return res.redirect("/signin"); 
  }

  const { author, title, content } = req.body;
  try {
    await db.query(
      `INSERT INTO blogs (author, creator_user_id, title, content, date_created) 
       VALUES ($1, $2, $3, $4, NOW())`,
      [author.trim(), currentUserId, title.trim(), content.trim()]
    );
    res.redirect("/");
  } catch (err) {
    console.error(err);
    res.status(500).send("Error creating post");
  }
});

// Edit Route
app.get("/posts/:id/edit", async (req, res) => {
  const postId = req.params.id;
  try {
    const result = await db.query("SELECT * FROM blogs WHERE blog_id = $1", [postId]);
    const post = result.rows[0];

    if (!post) {
      return res.redirect("/");
    }

    // if logged in
    if (currentUserId && post.creator_user_id && post.creator_user_id !== currentUserId) {
      return res.status(403).send("Unauthorized: You can only edit your own posts.");
    }

    res.render("edit", { post: post });
  } catch (err) {
    console.error(err);
    res.status(500).send("Server Error");
  }
});

// Update Route
app.put("/posts/:id", async (req, res) => {
  const postId = req.params.id;
  const { author, title, content } = req.body;

  try {
    // Verify ownership 
    const check = await db.query("SELECT * FROM blogs WHERE blog_id = $1", [postId]);
    if (check.rows.length === 0) {
      return res.status(404).send("Post not found.");
    }

    if (currentUserId && check.rows[0].creator_user_id && check.rows[0].creator_user_id !== currentUserId) {
      return res.status(403).send("Unauthorized action.");
    }

    await db.query(
      "UPDATE blogs SET author = $1, title = $2, content = $3 WHERE blog_id = $4",
      [author.trim(), title.trim(), content.trim(), postId]
    );

    res.redirect("/");
  } catch (err) {
    console.error(err);
    res.status(500).send("Error updating post");
  }
});

// Delete Route
app.delete("/posts/:id", async (req, res) => {
  const postId = req.params.id;

  try {
    // Deletion if right user
    const check = await db.query("SELECT * FROM blogs WHERE blog_id = $1", [postId]);
    if (check.rows.length === 0) {
      return res.status(404).send("Post not found.");
    }

    if (currentUserId && check.rows[0].creator_user_id && check.rows[0].creator_user_id !== currentUserId) {
      return res.status(403).send("Unauthorized action.");
    }

    await db.query("DELETE FROM blogs WHERE blog_id = $1", [postId]);
    res.redirect("/");
  } catch (err) {
    console.error(err);
    res.status(500).send("Error deleting post");
  }
});

app.listen(PORT, () => {
  console.log(`Blog server running on http://localhost:${PORT}`);
});