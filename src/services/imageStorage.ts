const databaseName = 'goodword-media'
const storeName = 'images'

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(databaseName, 1)
    request.onupgradeneeded = () => request.result.createObjectStore(storeName)
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(new Error('Local image storage is unavailable in this browser.'))
  })
}

export async function saveImage(file: File): Promise<string> {
  const database = await openDatabase()
  const key = crypto.randomUUID()
  await new Promise<void>((resolve, reject) => {
    const transaction = database.transaction(storeName, 'readwrite')
    transaction.objectStore(storeName).put(file, key)
    transaction.oncomplete = () => resolve()
    transaction.onerror = () => reject(new Error(`Unable to store ${file.name}.`))
  })
  database.close()
  return key
}

export async function getImage(key: string): Promise<Blob | null> {
  const database = await openDatabase()
  const result = await new Promise<Blob | null>((resolve, reject) => {
    const request = database.transaction(storeName, 'readonly').objectStore(storeName).get(key)
    request.onsuccess = () => resolve((request.result as Blob | undefined) ?? null)
    request.onerror = () => reject(new Error('Unable to read this image from local storage.'))
  })
  database.close()
  return result
}

export async function removeImages(keys: string[]) {
  if (!keys.length) return
  const database = await openDatabase()
  await new Promise<void>((resolve, reject) => {
    const transaction = database.transaction(storeName, 'readwrite')
    keys.forEach((key) => transaction.objectStore(storeName).delete(key))
    transaction.oncomplete = () => resolve()
    transaction.onerror = () => reject(new Error('Unable to clean up removed images.'))
  })
  database.close()
}