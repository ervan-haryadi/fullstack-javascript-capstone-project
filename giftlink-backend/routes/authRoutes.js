//Step 1 - Task 2: Import necessary packages
const dotenv = require('dotenv');
const express = require('express');
const app = express();
const router = express.Router();

const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { body, validationResult } = require('express-validator');

const connectToDatabase = require('../models/db');
const pino = require('pino');

//Step 1 - Task 3: Create a Pino logger instance
const logger = pino()
dotenv.config();

//Step 1 - Task 4: Create JWT secret
const JWT_SECRET = process.env.JWT_SECRET;

router.post('/register', async (req, res) => {
    try {
        // Task 1: Connect to `giftsdb` in MongoDB through `connectToDatabase` in `db.js`
        const db = await connectToDatabase();

        // Task 2: Access MongoDB collection
        const collection = db.collection('users');

        //Task 3: Check for existing email
        const existingEmail = await collection.findOne({ email: req.body.email });
        if (existingEmail) {
            res.status(409).json({ message: "Email already exists" });
            return;
        }

        const salt = await bcrypt.genSalt(10);
        const hash = await bcrypt.hash(req.body.password, salt);
        const email = req.body.email;

        const newUser = await collection.insertOne({
            email: req.body.email,
            firstName: req.body.firstName,
            lastName: req.body.lastName,
            password: hash,
            createdAt: new Date(),
        });

        const payload = {
            user: {
                id: newUser.insertedId,
            },
        };

        const authtoken = jwt.sign(payload, JWT_SECRET);

        logger.info('User registered successfully');
        res.json({ authtoken, email });
    } catch (e) {
        return res.status(500).send('Internal server error');
    }
});

router.post('/login', async (req, res) => {
    try {
        const db = await connectToDatabase();
        const collection = db.collection('users');

        const email = req.body.email;
        const existingUser = await collection.findOne({ email: email });
        if (existingUser) {
            let result = bcrypt.compare(req.body.password, existingUser.password);
            if (!result) {
                logger.error("Password do not match");
                return res.status(404).json({ error: "Wrong password" });
            }

            const userName = existingUser.firstName;
            const userEmail = existingUser.email;

            let payload = {
                user: {
                    id: existingUser._id.toString(),
                }
            };

            const authtoken = jwt.sign(payload, JWT_SECRET);
            res.json({ authtoken, userName, userEmail });
        } else {
            logger.error("User not found");
            return res.status(404).json({ error: 'User not found' });
        }
    } catch (e) {
        logger.error(e);
        return res.status(500).json({ error: 'Internal server error', details: e.message });
    }
})

router.put('/update', async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        logger.error('Validation errors in update request', errors.array());
        return res.status(400).json({ errors: errors.array() });
    }
    try {
        const email = req.headers.email;

        if (!email) {
            logger.error('Email not found in the request headers');
            return res.status(400).json({ error: "Email not found in the request headers" });
        }

        const db = await connectToDatabase();
        const collection = db.collection("users");
        const existingUser = await collection.findOne({ email });
        if(!existingUser) {
            logger.error('User not found');
            return res.status(404).json({error:'User not found'});
        }

        existingUser.firstName = req.body.name;
        existingUser.updatedAt = new Date();

        const updatedUser = await collection.findOneAndUpdate(
            { email },
            { $set: existingUser },
            { returnDocument: 'after' }
        );

        const payload = {
            user: {
                id: updatedUser._id.toString(),
            },
        };
        const authtoken = jwt.sign(payload, JWT_SECRET);
        res.json({ authtoken });
    } catch (err) {
        logger.error(err);
        return res.status(500).send("Internal Server Error");
    }
})

module.exports = router;