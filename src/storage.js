const DB_NAME = 'tea-rose'
const DB_VERSION = 1
const STORE_NAME = 'data'
export const DATA_KEY = 'tearose-data-v1'

function openDatabase() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)

    request.onupgradeneeded = () => {
      const database = request.result
      if (!database.objectStoreNames.contains(STORE_NAME)) {
        database.createObjectStore(STORE_NAME)
      }
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
    request.onblocked = () => reject(new Error('IndexedDB blocked'))
  })
}

function runRequest(mode, operation) {
  return openDatabase().then(
    (database) =>
      new Promise((resolve, reject) => {
        const transaction = database.transaction(STORE_NAME, mode)
        const store = transaction.objectStore(STORE_NAME)
        const request = operation(store)
        let result

        request.onsuccess = () => {
          result = request.result
        }
        request.onerror = () => reject(request.error)
        transaction.onabort = () => reject(transaction.error)
        transaction.oncomplete = () => {
          database.close()
          resolve(result)
        }
      }),
  )
}

export function loadData() {
  return runRequest('readonly', (store) => store.get(DATA_KEY))
}

export function saveData(data) {
  return runRequest('readwrite', (store) => store.put(data, DATA_KEY))
}

export function clearData() {
  return runRequest('readwrite', (store) => store.delete(DATA_KEY))
}
