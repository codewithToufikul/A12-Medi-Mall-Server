const express = require("express");
const cors = require("cors");
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

  app.get("/medicine", async (req, res) => {
    const result = await medicineCollection.find().toArray();
    res.send(result);
  });

  app.post("/cart", async (req, res) => {
    const medicine = req.body;
    const result = await cartMedicineCollection.insertOne(medicine);
    res.send(result);
  });

  app.get("/carts", async (req, res) => {
    const email = req.query.email;
    const emailQuery = { userEmail: email };
    const result = await cartMedicineCollection.find(emailQuery).toArray();
    res.send(result);
  });

  app.delete("/cart/:id", async (req, res) => {
    const id = req.params.id;
    const query = { _id: new ObjectId(id) };
    const result = await cartMedicineCollection.deleteOne(query);
    res.send(result);
  });

  app.patch("/cart/:id/increase", async (req, res) => {
    const id = req.params.id;
    const query = { _id: new ObjectId(id) };
    const updateDoc = { $inc: { quantity: 1 } };
    const result = await cartMedicineCollection.updateOne(query, updateDoc);
    res.send(result);
  });

  app.patch("/cart/:id/decrease", async (req, res) => {
    const id = req.params.id;
    const query = { _id: new ObjectId(id) };
    const updateDoc = { $inc: { quantity: -1 } };
    const result = await cartMedicineCollection.updateOne(query, updateDoc);
    res.send(result);
  });

  app.delete("/cart", async (req, res) => {
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
      metadata: { email: email }
    });
    res.send({ clientSecret: paymentIntent.client_secret });
  });

  app.post("/save-payment-details", async (req, res) => {
    const { paymentIntent, userEmail, status } = req.body;
    const paymentRecord = {
      paymentIntentId: paymentIntent.id,
      amount: paymentIntent.amount,
      currency: paymentIntent.currency,
      status: status,
      email: userEmail,
      created: paymentIntent.created,
    };
    const result = await paymentCollections.insertOne(paymentRecord);
    res.send(result);
  });

  app.get("/payment-history", async(req, res)=>{
    const result = await paymentCollections.find().toArray();
    res.send(result)
  })

  app.get("/category", async (req, res) => {
    const result = await catergoryCollection.find().toArray();
    res.send(result);
  });

  app.post("/category", async(req, res)=>{
    const category = req.body;
    const result = await catergoryCollection.insertOne(category)
    res.send(result)
  })

  app.delete("/category/:id", async(req, res)=>{
    const id = req.params.id;
    const query = {_id: new ObjectId(id)}
    const result = await catergoryCollection.deleteOne(query);
    res.send(result)
  })

 // Update a category (PATCH method)
 app.patch("/category/:id", async (req, res) => {
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
app.put("/category/:id", async (req, res) => {
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

  app.post("/users", async(req, res)=>{
    const user = req.body;
    const result = await usersCollections.insertOne(user)
    res.send(result)
  })

  app.get("/users", async(req, res)=>{
    const result = await usersCollections.find().toArray()
    res.send(result)
  })


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
