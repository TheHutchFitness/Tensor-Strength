// One-time seed: upload the private Athlete Edition PDF to R2 so it no longer
// needs to live in the repo / on disk. Reads S3_* creds from the environment.
import { readFile } from 'fs/promises'
import nodePath from 'path'
import { S3Client, PutObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3'

const KEY = 'private-assets/hutch-touch-athlete-edition.pdf'

function loadEnv() {
  // Minimal .env loader (dev only).
  try {
    const fs = require('fs')
  } catch {}
}

async function main() {
  const endpoint = process.env.S3_ENDPOINT
  const bucket = process.env.S3_BUCKET
  const accessKeyId = process.env.S3_ACCESS_KEY_ID
  const secretAccessKey = process.env.S3_SECRET_ACCESS_KEY
  if (!endpoint || !bucket || !accessKeyId || !secretAccessKey) {
    console.error('Missing S3_* env vars; cannot seed.')
    process.exit(2)
  }
  const s3 = new S3Client({ region: 'auto', endpoint, credentials: { accessKeyId, secretAccessKey }, forcePathStyle: true })
  try {
    await s3.send(new HeadObjectCommand({ Bucket: bucket, Key: KEY }))
    console.log('Already present in R2:', KEY)
    return
  } catch { /* not present -> upload */ }
  const filePath = nodePath.join(process.cwd(), 'private-assets', 'hutch-touch-athlete-edition.pdf')
  const bytes = await readFile(filePath)
  await s3.send(new PutObjectCommand({ Bucket: bucket, Key: KEY, Body: bytes, ContentType: 'application/pdf' }))
  console.log('Seeded R2 with', KEY, `(${bytes.length} bytes)`)
}

main().catch((e) => { console.error('Seed failed:', e?.message || e); process.exit(1) })
