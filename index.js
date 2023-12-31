const express = require('express')
const cors = require('cors');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser')
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const app = express()
require('dotenv').config()
const port = process.env.PORT || 5000

app.use(cors({
  origin: [
    // 'http://localhost:5173','http://localhost:5174',
    'https://library-management-proje-5e232.web.app',
    'https://library-management-proje-5e232.firebaseapp.com',
  ],
  credentials: true,
}))
app.use(express.json())
app.use(cookieParser())


app.get('/', (req, res) => {
  res.send('hello world sultan')
})

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.pdscwoz.mongodb.net/?retryWrites=true&w=majority`;

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

//verify token
const verify = async(req,res,next)=>{
  const {token} = req.cookies;
  console.log(token)
  if(!token){
    return res.status(401).send({status:"unAuthorized Access", code: "401"})
  }
  jwt.verify(token, process.env.SECRET_KEY, (error, decoded)=>{

    if(error){
      return res.status(401).send({status:"unAuthorized Access", code: "401"})
    }
    console.log(decoded);
    req.user = decoded
    next()
  })
}

//Get: method category
app.get('/api/v1/categories', async (req, res) => {
  const result = await categoriesCollection.find().toArray()
  res.send(result)
})

// all books//filter//sort//pagination==smy paile krbo api ses
app.get('/api/v1/books',verify, async (req, res) => {
  let query = { bookQuantity: { $gt: 0 } }
  let queryObj = {}
  let sortObj = {}


  if (req.query.quantity !== "bookQuantity") {
    query = {}
  }
  ////quantity filter                         
  const bookQuantity = req.query.bookQuantity;
  // category filter
  const bookCategory = req.query.bookCategory
  //sorting
  const sortField = req.query.sortField
  const sortOrder = req.query.sortOrder

  // //pagination
  const page = Number(req.query.page)
  const limit = Number(req.query.limit)
  const skip = (page - 1) * limit

  if (bookQuantity) {
    query.bookCategory = bookQuantity
  }
  if (bookCategory) {
    queryObj.bookCategory = bookCategory
  }

  if (sortField && sortOrder) {
    sortObj[sortField] = sortOrder
  }
  const result = await booksCollection.find(query).skip(skip).limit(limit).sort(sortObj).toArray()
  const total = await booksCollection.countDocuments()
  res.send({ total, result })
})


//jwt
app.post('/api/v1/access-token', async (req, res) => {
  const user = req.body;
  const token = jwt.sign(user, process.env.SECRET_KEY, { expiresIn: 60 * 60 })
  // console.log(token)
  res
    .cookie("token", token, {
      httpOnly: true,
      secure: true,
      sameSite: "none",
    }).send({ success: true })
})


//category books
app.get('/api/v1/books/:bookCategory', async (req, res) => {
  const books = req.params.bookCategory
  const query = { bookCategory: books }
  const result = await booksCollection.find(query).toArray()
  res.send(result)

})

app.get('/api/v1/book/:id', async (req, res) => {
  const id = req.params.id
  const query = { _id: new ObjectId(id) }
  const result = await booksCollection.findOne(query)
  res.send(result)

})

//Get:borrow
app.get('/api/v1/user/book-borrow', async (req, res) => {
  const queryEmail = req.query.email
  let query = {};
  if (req.query?.email) {
    query.email = queryEmail
  }
  const result = await userCollection.find(query).toArray()
  res.send(result)
})

//POst/update: method
app.post('/api/v1/user/book-borrow', async (req, res) => {
  const body = req.body
  const id = body.data._id
  const item = await booksCollection.findOne({ _id: new ObjectId(id) })
  const prevQuantity = item.bookQuantity
  if (prevQuantity === 0) {
    return res.send("quantity is zero")
  }
  const update = await booksCollection.updateOne({ _id: new ObjectId(id) }, { $set: { bookQuantity: prevQuantity - 1 } })

  const result = await userCollection.insertOne(body)
  res.send(result)
})

//Post: create book
app.post('/api/v1/books/create-book',verify,  async (req, res) => {
  const body = req.body;
  const result = await booksCollection.insertOne(body)
  res.send(result)

})

//Put: update method
app.put('/api/v1/books/book-update/:id', async (req, res) => {
  const id = req.params.id;
  const query = { _id: new ObjectId(id) }
  const body = req.body;
  const option = { upsert: true }
  const updateBook = {
    $set: {
      ...body,
    }
  }
  const result = await booksCollection.updateOne(query, updateBook, option)
  console.log(result);
  res.send(result)
})

//delete: method
app.delete('/api/v1/user/cancel-borrow/:id/:addId', async (req, res) => {
  const id = req.params.id;
  const bookId = req.params.addId
  const query = { _id: new ObjectId(id) }
  const item = await booksCollection.findOne({ _id: new ObjectId(bookId) })
  console.log(item)
  const prevQuantity = item.bookQuantity
  const update = await booksCollection.updateOne({ _id: new ObjectId(bookId) }, { $set: { bookQuantity: prevQuantity + 1 } })
  const result = await userCollection.deleteOne(query)
  res.send(result)

})

app.listen(port, () => {
  console.log(`library server port: ${port}`);
})
