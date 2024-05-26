// db.js
require('dotenv').config();
const MongoClient = require('mongodb').MongoClient;

// MongoDB connection URL with authentication options
let url = `${process.env.MONGO_URL}`;

let dbInstance = null;
const dbName = "giftdb";

async function connectToDatabase() {
    if (dbInstance){
        return dbInstance
    };

    const client = new MongoClient(url);      

    // Task 1: Connect to MongoDB
    try {
        await client.connect();
        console.log("Connected successfully to server")

        dbInstance = client.db(dbName);

        return dbInstance;

    } catch(err) {
        console.log(err);
    };
};

module.exports = connectToDatabase;
