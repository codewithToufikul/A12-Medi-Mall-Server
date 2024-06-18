const express = require("express");
const app = express();
const cors = require("cors");
const port = process.env.PORT || 5000;
require("dotenv").config();
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

// Middleware
app.use(cors());
app.use(express.json());

const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.ivo4yuq.mongodb.net/?retryWrites=true&w=majority`;

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {
  try {
    await client.connect();
    const medicineCollection = client.db("MediMallDB").collection("medicineCollection");
    const cartMedicineCollection = client.db("MediMallDB").collection("cartMedicineCollection");
    const categoryCollection = client.db("MediMallDB").collection("categoryCollection");
    
    app.get("/medicine", async (req, res) => {
      try {
        const result = await medicineCollection.find().toArray();
        res.send(result);
      } catch (error) {
        console.error("Error fetching medicines:", error);
        res.status(500).send({ error: "Internal Server Error" });
      }
    });

    app.post("/cart", async (req, res) => {
      try {
        const medicine = req.body;
        const result = await cartMedicineCollection.insertOne(medicine);
        res.send(result);
      } catch (error) {
        console.error("Error adding to cart:", error);
        res.status(500).send({ error: "Internal Server Error" });
      }
    });

    app.get("/carts", async (req, res) => {
      try {
        const email = req.query.email;
        const emailQuery = { userEmail: email };
        const result = await cartMedicineCollection.find(emailQuery).toArray();
        res.send(result);
      } catch (error) {
        console.error("Error fetching carts:", error);
        res.status(500).send({ error: "Internal Server Error" });
      }
    });

    app.delete("/cart/:id", async (req, res) => {
      try {
        const id = req.params.id;
        const query = { _id: new ObjectId(id) };
        const result = await cartMedicineCollection.deleteOne(query);
        res.send(result);
      } catch (error) {
        console.error("Error deleting cart item:", error);
        res.status(500).send({ error: "Internal Server Error" });
      }
    });

    app.patch("/cart/:id/increase", async (req, res) => {
      try {
        const id = req.params.id;
        const query = { _id: new ObjectId(id) };
        const updateDoc = { $inc: { quantity: 1 } };
        const result = await cartMedicineCollection.updateOne(query, updateDoc);
        res.send(result);
      } catch (error) {
        console.error("Error increasing cart item quantity:", error);
        res.status(500).send({ error: "Internal Server Error" });
      }
    });

    app.patch("/cart/:id/decrease", async (req, res) => {
      try {
        const id = req.params.id;
        const query = { _id: new ObjectId(id) };
        const updateDoc = { $inc: { quantity: -1 } };
        const result = await cartMedicineCollection.updateOne(query, updateDoc);
        res.send(result);
      } catch (error) {
        console.error("Error decreasing cart item quantity:", error);
        res.status(500).send({ error: "Internal Server Error" });
      }
    });

    app.delete("/cart", async (req, res) => {
      try {
        const email = req.query.email;
        const emailQuery = { userEmail: email };
        const result = await cartMedicineCollection.deleteMany(emailQuery);
        res.send(result);
      } catch (error) {
        console.error("Error clearing cart:", error);
        res.status(500).send({ error: "Internal Server Error" });
      }
    });

    app.get("/category", async (req, res) => {
      try {
        const result = await categoryCollection.find().toArray();
        res.send(result);
      } catch (error) {
        console.error("Error fetching categories:", error);
        res.status(500).send({ error: "Internal Server Error" });
      }
    });

app.post('/create-payment-intent', async (req, res) => {
  const { amount } = req.body;
  if (!amount) {
    return res.status(400).send({ error: 'Amount is required' });
  }

  try {
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100), 
      currency: 'usd',
    });
    res.send({
      clientSecret: paymentIntent.client_secret,
    });
  } catch (error) {
    console.error('Error creating payment intent:', error.message);
    res.status(500).send({ error: error.message });
  }
});


    console.log("Connected to MongoDB successfully!");
  } finally {
    
  }
}

run().catch(console.dir);

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
