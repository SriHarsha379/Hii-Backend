// === MongoDB Export Script ===
// Run: node exportAllDatabase.js

import { MongoClient } from "mongodb";
import fs from "fs";
import path from "path";

const uri = "mongodb+srv://dev_db_user:FlhcqjbyH1HauTmb@cluster0.vcucve0.mongodb.net/nightlifeDB"
const outputDir = "dbjson";

// === CONFIG ===
const EXPORT_ALL = false;
const SINGLE_DB_NAME = "nightlifeDB";

function serialize(doc) {
  if (!doc || typeof doc !== "object") return doc;

  if (doc instanceof Date) return { $date: doc.toISOString() };
  if (doc._bsontype === "ObjectId") return { $oid: doc.toString() };

  if (Array.isArray(doc)) return doc.map(serialize);

  const obj = {};
  for (const key in doc) {
    obj[key] = serialize(doc[key]);
  }
  return obj;
}

async function exportDatabases() {
  const client = new MongoClient(uri);

  try {
    await client.connect();
    console.log("✅ Connected to MongoDB");

    const adminDb = client.db().admin();
    const dbList = EXPORT_ALL
      ? (await adminDb.listDatabases()).databases.map(d => d.name)
      : [SINGLE_DB_NAME];

    for (const dbName of dbList) {
      const db = client.db(dbName);
      const dbPath = path.join(outputDir, dbName);
      fs.mkdirSync(dbPath, { recursive: true });

      const collections = await db.listCollections().toArray();

      for (const { name } of collections) {
        const data = await db.collection(name).find({}).toArray();
        const serialized = data.map(serialize);

        fs.writeFileSync(
          path.join(dbPath, `${name}.json`),
          JSON.stringify(serialized, null, 2)
        );

        console.log(`📁 Exported: ${dbName}/${name}.json`);
      }
    }

    console.log("🎉 EXPORT COMPLETED");
  } catch (err) {
    console.error("❌ Export Error:", err);
  } finally {
    await client.close();
  }
}

exportDatabases();
