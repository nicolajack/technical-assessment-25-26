import express from 'express'
import cors from 'cors'
import bodyParser from 'body-parser'
import dotenv from 'dotenv'
import { GoogleGenerativeAI } from '@google/generative-ai'
import { MongoClient } from 'mongodb'

// configure environment to hide apikey and mongourl
dotenv.config()

// setup app using express
const app = express()
app.use(cors())
app.use(bodyParser.json())

// setting up a local port for the backend to run on
const PORT = process.env.PORT || 4000

// setting up mongo
const mongourl = process.env.MONGO_URL
const mongoclient = new MongoClient(mongourl, {})
mongoclient.connect().then(() => {
    console.log('MongoDB connected')
})

// setting up genAI model and setting system instructions
const genAI = new GoogleGenerativeAI(process.env.API_KEY);
const model = genAI.getGenerativeModel({
    model: "gemini-1.5-flash",
    systemInstruction: `You are a helpful assistant that finds a place in a different part of the world with similar sunrise and sunset times to a given location. Respond with something like "A location with similar times is [place name] in [country name]." Feel free to add a fun fact about the location. Try and make neighboring regions display different similar parts of the world to make responses more interesting. Focus on similar times rather than super well-known places.`,
});

// to get information about a place in a totally different part of the world with similar sunrise and sunset times using gemini api
// this function should take the const userLocation from the frontend file background.jsx, return the ai result, and set it as the second span in this line of code in the background.jsx file: <span>your location has similar times to</span> <span>wip</span>
app.post('/findSimilarPlace', async (req, res) => {
    const userLocation = req.body.userLocation;
    console.log(userLocation);
    if (!userLocation) {
        return res.status(400).json({ message: 'User location is required' });
    }
    try {
        const result = await model.generateContent(`${userLocation}`);
        const response = result.response;
        const text = response.text();
        res.status(200).json({ similarPlace: text });
        await mongoclient.db('dawn2dusk').collection('logs').insertOne({
            userLocation: userLocation,
            similarPlace: text,
            timestamp: new Date()
        })
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error generating content' });
    }
});




app.get('/', (req, res) => {
    res.send('Backend is running');
});


// to declare what port the server is running on
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`)
});


// to log to mongodb
app.get('/logs', async (req, res) => {
    try {
        const logs = await mongoclient.db('dawn2dusk').collection('logs').find({}).toArray()
        res.status(200).json(logs)
    } catch (error) {
        console.error(error)
        res.status(500).json({ message: 'Error' })
    }
}) 