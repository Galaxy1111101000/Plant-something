require('dotenv').config();

const express = require('express');
const cors = require('cors');
const { MongoClient, ServerApiVersion } = require('mongodb');
const { auth } = require('express-oauth2-jwt-bearer');

const app = express();
const port = process.env.PORT || 3001;

// Auth0 JWT verification middleware
const checkJwt = auth({
  audience: process.env.AUTH0_AUDIENCE,
  issuerBaseURL: process.env.AUTH0_ISSUER_BASE_URL, // e.g. https://dev-6bn3wrd7lk3tmza5.us.auth0.com/
});

// MongoDB setup
const mongoUri = process.env.MONGODB_URI;
let mongoClient = null;
let db = null;

async function connectMongoDB() {
  try {
    if (!mongoUri) {
      console.warn('MongoDB URI not provided in environment variables. Database features disabled.');
      return;
    }

    mongoClient = new MongoClient(mongoUri, {
      serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
      }
    });

    await mongoClient.connect();
    await mongoClient.db("admin").command({ ping: 1 });
    db = mongoClient.db("Plant"); // matches the "Plant" database shown in Atlas
    console.log("✅ Connected to MongoDB successfully!");
  } catch (error) {
    console.error("❌ MongoDB connection error:", error.message);
  }
}

app.use(cors());
app.use(express.json({ limit: '10mb' }));

// --- unchanged: identify-plant and chatbot routes ---
app.post('/api/identify-plant', async (req, res) => {
  try {
    const { imageBase64 } = req.body;
    const apiKey = process.env.PLANT_ID_API_KEY;

    if (!imageBase64) {
      return res.status(400).json({ error: 'No image data provided.' });
    }

    if (!apiKey) {
      return res.status(500).json({ error: 'Plant ID API key is missing.' });
    }

    const response = await fetch('https://api.plant.id/v3/identification', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Api-Key': apiKey,
      },
      body: JSON.stringify({
        images: [imageBase64],
        similar_images: true,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json({ error: data || 'Plant ID request failed.' });
    }

    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message || 'Plant ID request failed.' });
  }
});

app.post('/api/chatbot', async (req, res) => {
  try {
    const { plantName } = req.body;
    const apiKey = process.env.GEMINI_API_KEY;

    if (!plantName) {
      return res.status(400).json({ error: 'Plant name is required.' });
    }

    if (!apiKey) {
      // Mock response when API key is missing (for testing)
      console.warn('Gemini API key missing - returning mock response');
      return res.json({
        answer: `${plantName} is a wonderful plant! It's great for indoor environments and requires moderate sunlight. Water when the soil feels dry to the touch. Note: This is a test response - add GEMINI_API_KEY to backend/.env to enable real plant information.`,
      });
    }

    const model = 'gemini-2.0-flash';
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [
          {
            role: 'user',
            parts: [{ text: `Give me information about ${plantName}` }],
          },
        ],
        generationConfig: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: 'object',
            properties: {
              answer: { type: 'string', description: 'A short answer about the plant.' },
            },
            required: ['answer'],
          },
        },
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      // Fallback: return mock response on API error
      console.warn('Gemini API error - returning mock response', data);
      return res.json({
        answer: `${plantName} is a wonderful plant! It's great for indoor environments and requires moderate sunlight. Water when the soil feels dry to the touch.`,
      });
    }

    const answer = data?.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
    let parsed;

    try {
      parsed = JSON.parse(answer);
    } catch {
      parsed = { answer };
    }

    res.json(parsed);
  } catch (error) {
    // Fallback: return mock response on any error
    const plantName = req.body?.plantName || 'plant';
    console.warn('Chatbot error - returning mock response', error.message);
    res.json({
      answer: `${plantName} is a wonderful plant! It's great for indoor environments and requires moderate sunlight. Water when the soil feels dry to the touch.`,
    });
  }
});

app.get('/health', (_req, res) => {
  res.json({ ok: true, database: db ? 'connected' : 'disconnected' });
});

// --- protected by checkJwt, userId comes from the verified token ---
app.post('/api/save-plant', checkJwt, async (req, res) => {
  try {
    if (!db) {
      return res.status(503).json({ error: 'Database not connected.' });
    }

    const userId = req.auth.payload.sub; // trusted identity from Auth0, not the client
    const { plantName, imageUrl, plantInfo } = req.body;

    if (!plantName) {
      return res.status(400).json({ error: 'Plant name is required.' });
    }

    const plantsCollection = db.collection('User_Plant_Data'); // matches Atlas collection name
    const result = await plantsCollection.insertOne({
      plantName,
      userId,
      imageUrl,
      plantInfo,
      createdAt: new Date(),
    });

    res.json({ success: true, id: result.insertedId });
  } catch (error) {
    res.status(500).json({ error: error.message || 'Failed to save plant.' });
  }
});

app.get('/api/user-plants', checkJwt, async (req, res) => {
  try {
    if (!db) {
      return res.status(503).json({ error: 'Database not connected.' });
    }

    const userId = req.auth.payload.sub; // trusted identity from Auth0
    const plantsCollection = db.collection('User_Plant_Data'); // matches Atlas collection name
    const plants = await plantsCollection.find({ userId }).toArray();

    res.json({ plants });
  } catch (error) {
    res.status(500).json({ error: error.message || 'Failed to fetch plants.' });
  }
});

app.get('/api/garden-layout', checkJwt, async (req, res) => {
  try {
    if (!db) {
      return res.status(503).json({ error: 'Database not connected.' });
    }

    const userId = req.auth.payload.sub;
    const gardenLayoutCollection = db.collection('User_Garden_Layout');
    const doc = await gardenLayoutCollection.findOne({ userId });

    res.json({ layout: Array.isArray(doc?.layout) ? doc.layout : [] });
  } catch (error) {
    res.status(500).json({ error: error.message || 'Failed to fetch garden layout.' });
  }
});

app.post('/api/garden-layout', checkJwt, async (req, res) => {
  try {
    if (!db) {
      return res.status(503).json({ error: 'Database not connected.' });
    }

    const userId = req.auth.payload.sub;
    const { layout } = req.body;

    if (!Array.isArray(layout)) {
      return res.status(400).json({ error: 'layout must be an array.' });
    }

    const normalizedLayout = layout
      .filter((item) => (
        item
        && typeof item.id === 'number'
        && typeof item.x === 'number'
        && typeof item.y === 'number'
        && typeof item.type === 'string'
      ))
      .map((item) => ({
        id: item.id,
        x: item.x,
        y: item.y,
        type: item.type,
      }));

    const gardenLayoutCollection = db.collection('User_Garden_Layout');
    await gardenLayoutCollection.updateOne(
      { userId },
      {
        $set: {
          userId,
          layout: normalizedLayout,
          updatedAt: new Date(),
        },
      },
      { upsert: true },
    );

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message || 'Failed to save garden layout.' });
  }
});

// Debug endpoint: check all plants in database (remove in production)
app.get('/debug/all-plants', async (req, res) => {
  try {
    if (!db) {
      return res.status(503).json({ error: 'Database not connected.' });
    }

    const plantsCollection = db.collection('plants');
    const count = await plantsCollection.countDocuments();
    const plants = await plantsCollection.find({}).toArray();

    res.json({
      totalCount: count,
      plants: plants.map(p => ({
        _id: p._id,
        plantName: p.plantName,
        userId: p.userId,
        createdAt: p.createdAt,
        hasImage: !!p.imageUrl,
      })),
    });
  } catch (error) {
    res.status(500).json({ error: error.message || 'Failed to fetch plants.' });
  }
});

async function startServer() {
  await connectMongoDB();

  app.listen(port, () => {
    console.log(`Backend listening on port ${port}`);
  });
}

startServer().catch(console.error);