const express = require("express");
const cors = require("cors");
const jwt = require("jsonwebtoken");
require("dotenv").config();
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");

const app = express();
const port = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.ivo4yuq.mongodb.net/?retryWrites=true&w=majority`;

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  await client.connect();

  const medicineCollection = client.db("MediMallDB").collection("medicineCollection");
  const cartMedicineCollection = client.db("MediMallDB").collection("cartMedicineCollection");
  const catergoryCollection = client.db("MediMallDB").collection("catergoryCollection");
  const paymentCollections = client.db("MediMallDB").collection("paymentCollections");
  const usersCollections = client.db("MediMallDB").collection("usersCollections");
  const adviceCollections = client.db("MediMallDB").collection("adviceCollections");

  // JWT
  app.post("/jwt", async (req, res) => {
    const user = req.body;
    const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {
      expiresIn: "8h",
    });
    res.send({ token });
  });

  const verifyToken = (req, res, next) => {
    if (!req.headers.authorization) {
      return res.status(401).send({ message: 'forbidden access' });
    }
    const token = req.headers.authorization.split(' ')[1];
    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
      if (err) {
        return res.status(401).send({ message: 'forbidden access' });
      }
      req.decoded = decoded;
      next();
    });
  };

  const verifyAdmin = async (req, res, next) => {
    const email = req.decoded.email;
    const query = { email: email };
    const user = await usersCollections.findOne(query);
    const isAdmin = user.role === 'admin';
    if (!isAdmin) {
      return res.status(403).send({ message: 'forbidden access' });
    }
    next();
  };

  app.get("/users", verifyToken, verifyAdmin, async (req, res) => {
    const result = await usersCollections.find().toArray();
    res.send(result);
  });

  app.get('/users/admin/:email', verifyToken, async (req, res) => {
    const email = req.params.email;
  
    if (email !== req.decoded.email) {
      return res.status(403).send({ message: 'Forbidden access' });
    }
  
    try {
      const query = { email: email };
      const user = await usersCollections.findOne(query);
      let admin = false;
      if (user) {
        admin = user.role === 'admin';
      }
      res.send({ admin });
    } catch (error) {
      console.error('Error fetching admin status:', error);
      res.status(500).send({ message: 'Failed to fetch admin status' });
    }
  });

  app.get('/users/seller/:email', verifyToken, async (req, res) => {
    const email = req.params.email;
  
    if (email !== req.decoded.email) {
      return res.status(403).send({ message: 'Forbidden access' });
    }
  
    try {
      const query = { email: email };
      const user = await usersCollections.findOne(query);
      let seller = false;
      if (user) {
        seller = user.role === 'seller';
      }
      res.send({ seller });
    } catch (error) {
      console.error('Error fetching seller status:', error);
      res.status(500).send({ message: 'Failed to fetch seller status' });
    }
});

  
  

  app.post("/users", async (req, res) => {
    const user = req.body;
    const query = { email: user.email };
    const checkInsert = await usersCollections.findOne(query);
    if (checkInsert) {
      return res.send({ message: "user already exists", insertedId: null });
    }
    const result = await usersCollections.insertOne(user);
    res.send(result);
  });

  app.get("/medicine", async (req, res) => {
    const result = await medicineCollection.find().toArray();
    res.send(result);
  });

  app.post("/cart", async (req, res) => {
    const medicine = req.body;
    const result = await cartMedicineCollection.insertOne(medicine);
    res.send(result);
  });

  app.get("/carts", verifyToken, async (req, res) => {
    const email = req.query.email;
    const emailQuery = { userEmail: email };
    const result = await cartMedicineCollection.find(emailQuery).toArray();
    res.send(result);
  });

  app.delete("/cart/:id", verifyToken, async (req, res) => {
    const id = req.params.id;
    const query = { _id: new ObjectId(id) };
    const result = await cartMedicineCollection.deleteOne(query);
    res.send(result);
  });

  app.patch("/cart/:id/increase", verifyToken, async (req, res) => {
    const id = req.params.id;
    const query = { _id: new ObjectId(id) };
    const updateDoc = { $inc: { quantity: 1 } };
    const result = await cartMedicineCollection.updateOne(query, updateDoc);
    res.send(result);
  });

  app.patch("/cart/:id/decrease", verifyToken, async (req, res) => {
    const id = req.params.id;
    const query = { _id: new ObjectId(id) };
    const updateDoc = { $inc: { quantity: -1 } };
    const result = await cartMedicineCollection.updateOne(query, updateDoc);
    res.send(result);
  });

  app.delete("/cart", verifyToken, async (req, res) => {
    const email = req.query.email;
    const emailQuery = { userEmail: email };
    const result = await cartMedicineCollection.deleteMany(emailQuery);
    res.send(result);
  });

  app.post("/create-payment-intent", async (req, res) => {
    const { amount, email } = req.body;
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100),
      currency: "usd",
      metadata: { email: email },
    });
    res.send({ clientSecret: paymentIntent.client_secret });
  });

  app.post("/save-payment-details", verifyToken, async (req, res) => {
    const { paymentIntent, userEmail, status, date } = req.body;
    const paymentRecord = {
      paymentIntentId: paymentIntent.id,
      amount: paymentIntent.amount,
      currency: paymentIntent.currency,
      status: status,
      email: userEmail,
      created: paymentIntent.created,
      date: date,
    };
    const result = await paymentCollections.insertOne(paymentRecord);
    res.send(result);
  });

  app.get("/payment-history", verifyToken, async (req, res) => {
    const result = await paymentCollections.find().toArray();
    res.send(result);
  });

  app.patch("/payment-history/:id/accept", verifyToken, verifyAdmin, async (req, res) => {
    const id = req.params.id;
    const filter = { _id: new ObjectId(id) };
    const updateDoc = {
      $set: {
        status: "paid",
      },
    };

    try {
      const result = await paymentCollections.updateOne(filter, updateDoc);
      if (result.modifiedCount === 1) {
        res.send({ message: "Payment status updated to 'paid'" });
      } else {
        res.status(404).send({ message: "Payment not found or already 'paid'" });
      }
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/advice", async (req, res) => {
    const result = await adviceCollections.find().toArray();
    res.send(result);
  });

  app.patch("/advices/:id/toggle", async (req, res) => {
    const id = req.params.id;
    const advice = await adviceCollections.findOne({ _id: new ObjectId(id) });
    if (!advice) {
      return res.status(404).send({ message: "Advice not found" });
    }
    const updatedVisibility = !advice.isVisible;
    const updateDoc = {
      $set: {
        isVisible: updatedVisibility,
      },
    };
    const result = await adviceCollections.updateOne({ _id: new ObjectId(id) }, updateDoc);
    res.send(result);
  });

  app.get("/category",  async (req, res) => {
    const result = await catergoryCollection.find().toArray();
    res.send(result);
  });

  app.post("/category", verifyToken, async (req, res) => {
    const category = req.body;
    const result = await catergoryCollection.insertOne(category);
    res.send(result);
  });

  app.delete("/category/:id",  verifyToken, async (req, res) => {
    const id = req.params.id;
    const query = { _id: new ObjectId(id) };
    const result = await catergoryCollection.deleteOne(query);
    res.send(result);
  });

  // Update a category (PATCH method)
  app.patch("/category/:id", verifyAdmin, verifyToken, async (req, res) => {
    const id = req.params.id;
    const { categoryName, image } = req.body;
    const filter = { _id: new ObjectId(id) };
    const updateDoc = {
      $set: {
        categoryName: categoryName,
        image: image,
      },
    };

    try {
      const result = await catergoryCollection.updateOne(filter, updateDoc);
      res.send(result);
    } catch (error) {
      console.error('Error updating category:', error);
      res.status(500).json({ error: 'Failed to update category' });
    }
  });

  // Update a category (PUT method)
  app.put("/category/:id", verifyToken, async (req, res) => {
    const id = req.params.id;
    const { categoryName, image } = req.body;
    const filter = { _id: new ObjectId(id) };
    const updateDoc = {
      $set: {
        categoryName: categoryName,
        image: image,
      },
    };

    try {
      const result = await catergoryCollection.updateOne(filter, updateDoc);
      res.send(result);
    } catch (error) {
      console.error('Error updating category:', error);
      res.status(500).json({ error: 'Failed to update category' });
    }
  });

  app.patch("/users/:id", async (req, res) => {
    const id = req.params.id;
    const { role } = req.body;
    const filter = { _id: new ObjectId(id) };
    const updatedDoc = {
      $set: {
        role: role,
      },
    };
    const result = await usersCollections.updateOne(filter, updatedDoc);
    res.send(result);
  });

  console.log("Connected to MongoDB successfully!");
}

run().catch(console.dir);

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
