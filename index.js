const express = require('express')
const cors = require('cors');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const app = express()
require('dotenv').config()
const port = process.env.PORT || 5000

// respond with "hello world" when a GET request is made to the homepage

app.use(cors())
app.use(express.json())


app.get('/', (req, res) => {
  res.send('hello world')
})


const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.pdscwoz.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
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
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

const categoriesCollection = client.db("libraryBook").collection("bookCategory")
const booksCollection = client.db("libraryBook").collection("books")
const userCollection = client.db("libraryBook").collection("user")

//Get: method category
app.get('/api/v1/categories', async(req, res)=>{
    const result = await categoriesCollection.find().toArray()
    res.send(result)
})
// all books
app.get('/api/v1/books', async(req, res)=>{
    const result = await booksCollection.find().toArray()
    res.send(result)
})
//category books
app.get('/api/v1/books/:bookCategory', async(req, res)=>{
    const books = req.params.bookCategory
    const query = {bookCategory: books}
    const result = await booksCollection.find(query).toArray()
    res.send(result)

})
app.get('/api/v1/book/:id', async(req, res)=>{
    const id = req.params.id
    const query = {_id: new ObjectId(id)}
    const result = await booksCollection.findOne(query)
    res.send(result)

})

app.get('/api/v1/user', async(req, res)=>{
  const result = await userCollection.find().toArray()
  res.send(result)
})

//POst: method
app.post('/api/v1/user', async(req, res)=>{
    const body = req.body
    console.log(body);
    const result = await userCollection.insertOne(body)
    res.send(result)
})

app.listen(port, ()=>{
    console.log(`library server port: ${port}`);
})