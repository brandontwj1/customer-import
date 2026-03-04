const express = require('express');
const { MongoClient } = require('mongodb');
require('dotenv').config();

const app = express();

const uri = process.env.MONGO_URI;
const client = new MongoClient(uri);

async function startServer() {
  try {
    await client.connect();
    console.log("✅ Connected to MongoDB");

    app.get('/', async (req, res) => {
      const db = client.db("testdb");
      const result = await db.collection("test").insertOne({ message: "Hello Mongo!" });

      res.send("Inserted document with ID: " + result.insertedId);
    });

    app.listen(3000, '0.0.0.0', () => {
      console.log('🚀 Server running on port 3000');
    });

  } catch (err) {
    console.error("❌ MongoDB connection failed:", err);
  }
}

startServer();
