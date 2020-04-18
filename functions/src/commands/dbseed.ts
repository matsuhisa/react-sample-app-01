import commander from 'commander'
import admin from 'firebase-admin'
import fs from 'fs'
import parse from 'csv-parse/lib/sync'

import { Publisher } from '../services/mangarel/models/publisher'
import { collectionName } from '../services/mangarel/constants'
import { addCounter } from '../firestore-admin/record-counter'

import serviceAccount from '../react-sample-app-01-seecret-key.json'

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount as admin.ServiceAccount)
})

const db = admin.firestore()

const uploadSeed = async(collection: string, seedFile: string) => {
  const buffer = fs.readFileSync(seedFile)
  const record = parse(buffer.toString(), {
    columns: true,
    delimiter: '\t',
    skip_empty_lines: true,
  })
  const ref = db.collection(collection)

  switch(collection){
    case collectionName.publishers: {
      const docs: Required<Publisher>[] = 
        record.map((record: Publisher) => ({
          ...record,
          website: record.website? record.website: null,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          updaetdAt: admin.firestore.FieldValue.serverTimestamp(),
        })) || []

        for await( const doc of docs ) {
          const { id, ...docWithoutId } = doc
          await ref.doc(id).set(docWithoutId)
        }

        await addCounter(db, collection, docs.length)
        return
    }

    default: {
      throw new Error('specify target collection')
    }
  }
}

commander
  .version('0.1.0', '-v, --version')
  .arguments('<collection> <seedFile>')
  .action(uploadSeed);

commander.parse(process.argv)