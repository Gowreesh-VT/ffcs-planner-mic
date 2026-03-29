import { MongoClient } from 'mongodb';

const options = {};

declare global {
    var _mongoClientPromise: Promise<MongoClient> | undefined;
}

// Export a function that returns a Promise<MongoClient> so the connection
// is created lazily at runtime instead of during module evaluation. This
// prevents startup crashes when env vars are not yet loaded during build.
export default function getClientPromise(): Promise<MongoClient> {
    const rawUri = process.env.MONGODB_URI;
    if (!rawUri) {
        throw new Error('MONGODB_URI is not configured');
    }

    // Sometimes Vercel environment variables are pasted with surrounding quotes.
    const uri = rawUri.replace(/^["']|["']$/g, '');

    // Check if it's a valid schema before new MongoClient tries to parse it and fails the build
    if (!uri.startsWith('mongodb://') && !uri.startsWith('mongodb+srv://')) {
        throw new Error(`Invalid MONGODB_URI: Must start with "mongodb://" or "mongodb+srv://". Did you paste the wrong string in Vercel?`);
    }

    if (!global._mongoClientPromise) {
        const client = new MongoClient(uri, options);
        global._mongoClientPromise = client.connect();
    }

    return global._mongoClientPromise;
}
