var express = require('express')
var cors = require('cors')
var jwt = require('jsonwebtoken');
var app = express()
require('dotenv').config()
app.use(cors())
app.use(express.json())
const port = process.env.PORT || 5000;

const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const uri = "mongodb+srv://bistro_boss:NH2lPxL0W9YUmzi4@cluster0.iagloem.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0";
// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

// Middleware to verify the token
const verifyToken = (req, res, next) => {
  const token = req.headers.authorization;
  if (!token) {
    return res.status(401).send({ message: "Unauthorized access" });
  }

  const tokenSplit = token.split(' ')[1];
  jwt.verify(tokenSplit, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
    if (err) {
      return res.status(401).send({ message: "Unauthorized access" });
    }
    req.decoded = decoded;
    next();
  });
};

async function run() {
  try {
    // await client.connect();
    const menuCollection = client.db("bistroDB").collection("menu");
    const reviewCollection = client.db("bistroDB").collection("review");
    const cartsCollection = client.db("bistroDB").collection("carts");
    const usersCollection = client.db("bistroDB").collection("users");

    // Middleware to verify admin role
    const verifyAdmin = async (req, res, next) => {
      const email = req.decoded.email;
      const query = { email: email };
      const user = await usersCollection.findOne(query);
      const isAdmin = user?.role === "admin";
      if (!isAdmin) {
        return res.status(403).send({ message: "Forbidden access" });
      }
      next();
    };

    app.post("/jwt", async (req, res) => {
      const user = req.body;
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {
        expiresIn: "7d"
      });
      res.send({ token });
    });

    app.get("/menu", async (req, res) => {
      const result = await menuCollection.find().toArray();
      res.send(result);
    });

    app.post("/menu", async (req, res) => {
      const data = req.body;
      const result = await menuCollection.insertOne(data);
      res.send(result);
    })
    app.post("/menu/:id", async (req, res) => {
      const data = req.params.id;
      const query = { _id: new ObjectId(data) }
      const result = await menuCollection.insertOne(query);
      res.send(result);
    })

    app.patch("/menu/:id", async (req, res) => {
      const item = req.body;
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      console.log(item)
      const updateDoc = {
        $set: {
          name: item.name,
          category: item.category,
          price: item.price,
          recipe: item.recipe,
          image: item.image,
        }
      }
      const result = await menuCollection.updateOne(filter, updateDoc)
      res.send(result)

    })


    app.get("/menu/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) }
      const result = await menuCollection.findOne(query)
      res.send(result)
    })

    app.get("/users", verifyToken, verifyAdmin, async (req, res) => {
      const result = await usersCollection.find().toArray();
      res.send(result);
    });

    app.get("/review", async (req, res) => {
      const result = await reviewCollection.find().toArray();
      res.send(result);
    });

    app.post("/carts", verifyToken, verifyAdmin, async (req, res) => {
      const body = req.body;
      const result = await cartsCollection.insertOne(body);
      res.send(result);
    });

    app.post("/users", async (req, res) => {
      const user = req.body;
      const query = { email: user.email };
      const existing = await usersCollection.findOne(query);
      if (existing) {
        return res.send({ message: "user already exists", insertedId: null });
      }
      const result = await usersCollection.insertOne(user);
      res.send(result);
    });

    app.delete("/user/:id", verifyToken, verifyAdmin, async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const result = await usersCollection.deleteOne(filter);
      res.send(result);
    });

    app.get("/carts", async (req, res) => {
      const email = req.query?.email;
      const query = { email: email };
      const result = await cartsCollection.find(query).toArray();
      res.send(result);
    });

    app.delete("/cart/:id", verifyToken, async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await cartsCollection.deleteOne(query);
      res.send(result);
    });

    // dashboard
    app.patch("/user/admin/:id", verifyToken, verifyAdmin, async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const updateDoc = {
        $set: {
          role: "admin"
        }
      };
      const result = await usersCollection.updateOne(query, updateDoc);
      res.send(result);
    });

    app.get("/users/admin/:email", verifyToken, async (req, res) => {
      const email = req.params.email;
      if (email !== req.decoded.email) {
        return res.status(403).send({ message: "Forbidden access" });
      }
      const query = { email: email };
      const user = await usersCollection.findOne(query);
      let admin = false;
      if (user) {
        admin = user.role === "admin";
      }
      res.send({ admin });
    });

    console.log("Pinged your deployment. You successfully connected to MongoDB!");

    app.get('/', (req, res) => {
      res.send('Hello World!');
    });

    app.listen(port, () => {
      console.log(`Example app listening on port ${port}`);
    });
  } finally {
    // Do not close the client here to keep the connection alive for incoming requests
  }
}

run().catch(console.dir);
