const express = require("express");
const app = express();
const cors = require("cors");
const port = process.env.PORT || 5000;
require("dotenv").config();

// middleware
app.use(cors());
app.use(express.json());




const { MongoClient, ServerApiVersion } = require('mongodb');
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.ivo4yuq.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;


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
    
    app.get("/medicine", async(req, res) => {
        const result = await medicineCollection.find().toArray();
        res.send(result)
      });

    app.post("/cart", async(req, res)=>{
      const medicine = req.body;
      const result = await cartMedicineCollection.insertOne(medicine);
      res.send(result)
    })

    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {

  }
}
run().catch(console.dir);


app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});
