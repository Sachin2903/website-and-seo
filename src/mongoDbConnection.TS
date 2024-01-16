import { MongoClient } from 'mongodb';

const mongoURI:string = process.env.MONGO_URI||"mongodb+srv://omnileadz:ZaxQHJ86l3rseBMg@cluster0.691sv4e.mongodb.net/?retryWrites=true&w=majority";

let client:any;

export async function connectToMongoDB() {
  try {
    client = new MongoClient(mongoURI);
    await client.connect();
    console.log('Connected to MongoDB');
    return client
  } catch (error) {
    console.error('Error connecting to MongoDB:', error);
  }
}

export function disconnectFromMongoDB() {
  if (client) {
    client.close();
    console.log('Disconnected from MongoDB');
  }
}

