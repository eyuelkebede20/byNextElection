import mongoose, { type Mongoose } from 'mongoose';
import { env } from '$env/dynamic/private';

interface Connection {
  isConnected?: number;
}

const connection: Connection = {};

const dbConnect: () => Promise<void> = async () => {
  if (connection.isConnected) {
    return;
  }
  if (!env.SECRET_MONGO_URI) {
    throw new Error('Please define the SECRET_MONGO_URI environment variable inside .env');
  }

  const db: Mongoose = await mongoose.connect(env.SECRET_MONGO_URI);

  connection.isConnected = db.connections[0].readyState;
  console.log('DB Connected: ', connection.isConnected);
};

export { dbConnect };
