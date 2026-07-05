'use server';

import clientPromise from '@/lib/mongodb';

export interface CabLog {
  id: string;
  date: string;
  gasVolume: number;
  gasCost: number;
  tripsCount: number;
  amountReceived: number;
  driverPay: number;
  balance: number;
  notes?: string;
}

/**
 * Check if the database has a MONGODB_URI configured.
 * This determines whether we use server-side MongoDB or client-side localStorage.
 */
export async function isDbConfigured(): Promise<boolean> {
  return !!process.env.MONGODB_URI;
}

/**
 * Get all logs from MongoDB sorted by date descending.
 */
export async function getLogs(): Promise<CabLog[]> {
  if (!process.env.MONGODB_URI || !clientPromise) {
    return [];
  }

  try {
    const client = await clientPromise;
    const db = client.db('cab_expense');
    const collection = db.collection('cab_logs');

    const logs = await collection.find({}).sort({ date: -1 }).toArray();

    return logs.map(doc => ({
      id: doc.id || doc._id.toString(),
      date: doc.date,
      gasVolume: Number(doc.gasVolume ?? 0),
      gasCost: Number(doc.gasCost ?? 0),
      tripsCount: Number(doc.tripsCount ?? 0),
      amountReceived: Number(doc.amountReceived ?? 0),
      driverPay: Number(doc.driverPay ?? 0),
      balance: Number(doc.balance ?? (Number(doc.amountReceived) - Number(doc.gasCost) - Number(doc.driverPay))),
      notes: doc.notes || '',
    }));
  } catch (error) {
    console.error('Failed to fetch logs from MongoDB:', error);
    return [];
  }
}

/**
 * Insert or update a cab log in MongoDB.
 * The tally balance is calculated automatically on save.
 */
export async function saveLog(log: Omit<CabLog, 'balance' | 'id'> & { id?: string }): Promise<{ success: boolean; log?: CabLog; error?: string }> {
  if (!process.env.MONGODB_URI || !clientPromise) {
    return { success: false, error: 'Database is not configured' };
  }

  const balance = Number(log.amountReceived) - Number(log.gasCost) - Number(log.driverPay);
  const id = log.id || new Date().getTime().toString() + Math.random().toString(36).substring(2, 7);

  const newLog: CabLog = {
    id,
    date: log.date,
    gasVolume: Number(log.gasVolume),
    gasCost: Number(log.gasCost),
    tripsCount: Number(log.tripsCount),
    amountReceived: Number(log.amountReceived),
    driverPay: Number(log.driverPay),
    balance,
    notes: log.notes || '',
  };

  try {
    const client = await clientPromise;
    const db = client.db('cab_expense');
    const collection = db.collection('cab_logs');

    await collection.updateOne(
      { id: newLog.id },
      { $set: newLog },
      { upsert: true }
    );

    return { success: true, log: newLog };
  } catch (error) {
    console.error('Failed to save log to MongoDB:', error);
    return { success: false, error: 'Failed to save to database' };
  }
}

/**
 * Delete a cab log from MongoDB.
 */
export async function deleteLog(id: string): Promise<{ success: boolean; error?: string }> {
  if (!process.env.MONGODB_URI || !clientPromise) {
    return { success: false, error: 'Database is not configured' };
  }

  try {
    const client = await clientPromise;
    const db = client.db('cab_expense');
    const collection = db.collection('cab_logs');

    const result = await collection.deleteOne({ id });
    return { success: result.deletedCount > 0 };
  } catch (error) {
    console.error('Failed to delete log from MongoDB:', error);
    return { success: false, error: 'Failed to delete from database' };
  }
}

/**
 * Get paginated logs from MongoDB with search filters and sorting.
 */
export async function getLogsPaginated(
  page: number = 1,
  limit: number = 10,
  query: string = ''
): Promise<{ logs: CabLog[]; total: number; totalPages: number }> {
  if (!process.env.MONGODB_URI || !clientPromise) {
    return { logs: [], total: 0, totalPages: 0 };
  }

  try {
    const client = await clientPromise;
    const db = client.db('cab_expense');
    const collection = db.collection('cab_logs');

    const filter: any = {};
    if (query.trim()) {
      filter.$or = [
        { date: { $regex: query, $options: 'i' } },
        { notes: { $regex: query, $options: 'i' } }
      ];
    }

    const skip = (page - 1) * limit;
    const total = await collection.countDocuments(filter);
    const totalPages = Math.ceil(total / limit);

    const docs = await collection
      .find(filter)
      .sort({ date: -1 })
      .skip(skip)
      .limit(limit)
      .toArray();

    const logs = docs.map(doc => ({
      id: doc.id || doc._id.toString(),
      date: doc.date,
      gasVolume: Number(doc.gasVolume ?? 0),
      gasCost: Number(doc.gasCost ?? 0),
      tripsCount: Number(doc.tripsCount ?? 0),
      amountReceived: Number(doc.amountReceived ?? 0),
      driverPay: Number(doc.driverPay ?? 0),
      balance: Number(doc.balance ?? (Number(doc.amountReceived) - Number(doc.gasCost) - Number(doc.driverPay))),
      notes: doc.notes || '',
    }));

    return { logs, total, totalPages };
  } catch (error) {
    console.error('Failed to fetch paginated logs from MongoDB:', error);
    return { logs: [], total: 0, totalPages: 0 };
  }
}
