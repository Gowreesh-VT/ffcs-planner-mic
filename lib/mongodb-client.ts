import { MongoClient } from 'mongodb';

const uri = process.env.MONGODB_URI || '';
const options = {};

let client: MongoClient;
let clientPromise: Promise<MongoClient>;

if (!process.env.MONGODB_URI) {
    // During build time, MONGODB_URI may not be set.
    // We create a dummy promise that will reject at runtime.
    clientPromise = Promise.reject(new Error('MONGODB_URI is not configured'));
} else if (process.env.NODE_ENV === 'development') {
    // @ts-expect-error: Using global property for MongoDB client reuse in dev
    if (!global._mongoClientPromise) {
        client = new MongoClient(uri, options);
        // @ts-expect-error: Using global property for MongoDB client reuse in dev
        global._mongoClientPromise = client.connect();
    }
    // @ts-expect-error: Using global property for MongoDB client reuse in dev
    clientPromise = global._mongoClientPromise;
} else {
    client = new MongoClient(uri, options);
    clientPromise = client.connect();
}

export default clientPromise;
