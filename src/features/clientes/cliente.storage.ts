import type { ClienteMovil } from './cliente.types'

const DB_NAME = 'gelia-mobile'
const DB_VERSION = 1
const CLIENTES_STORE = 'clientes'
const META_STORE = 'metadata'

interface ClienteStored extends ClienteMovil {
  storage_key: string
  scope_key: string
}

export interface ClienteSyncMetadata {
  scopeKey: string
  snapshotId: string | null
  downloaded: number
  total: number | null
  maxClienteId: number
  cursor: number | null
  complete: boolean
  lastSyncedAt: string | null
}

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)
    request.onupgradeneeded = () => {
      const database = request.result
      if (!database.objectStoreNames.contains(CLIENTES_STORE)) {
        const store = database.createObjectStore(CLIENTES_STORE, { keyPath: 'storage_key' })
        store.createIndex('by_scope_number', ['scope_key', 'numero_cliente'], { unique: true })
        store.createIndex('by_scope_id', ['scope_key', 'id'], { unique: true })
        store.createIndex('by_scope', 'scope_key')
      }
      if (!database.objectStoreNames.contains(META_STORE)) {
        database.createObjectStore(META_STORE, { keyPath: 'scopeKey' })
      }
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

function requestResult<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

function transactionDone(transaction: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve()
    transaction.onerror = () => reject(transaction.error)
    transaction.onabort = () => reject(transaction.error)
  })
}

function storedCliente(scopeKey: string, cliente: ClienteMovil): ClienteStored {
  const numero = String(cliente.numero_cliente)
  return { ...cliente, numero_cliente: numero, storage_key: `${scopeKey}:${numero}`, scope_key: scopeKey }
}

export async function buscarClienteLocal(scopeKey: string, numeroCliente: string): Promise<ClienteMovil | null> {
  const database = await openDatabase()
  const transaction = database.transaction(CLIENTES_STORE, 'readonly')
  const result = await requestResult(
    transaction.objectStore(CLIENTES_STORE).index('by_scope_number').get([scopeKey, numeroCliente]),
  ) as ClienteStored | undefined
  database.close()
  if (!result) return null
  const cliente: ClienteMovil = { ...result }
  delete cliente.storage_key
  delete cliente.scope_key
  return cliente
}

export async function guardarClientes(scopeKey: string, clientes: ClienteMovil[]) {
  if (!clientes.length) return
  const database = await openDatabase()
  const transaction = database.transaction(CLIENTES_STORE, 'readwrite')
  const store = transaction.objectStore(CLIENTES_STORE)
  clientes.forEach((cliente) => store.put(storedCliente(scopeKey, cliente)))
  await transactionDone(transaction)
  database.close()
}

export async function eliminarClientePorId(scopeKey: string, clienteId: number) {
  const database = await openDatabase()
  const transaction = database.transaction(CLIENTES_STORE, 'readwrite')
  const index = transaction.objectStore(CLIENTES_STORE).index('by_scope_id')
  const key = await requestResult(index.getKey([scopeKey, clienteId]))
  if (key !== undefined) transaction.objectStore(CLIENTES_STORE).delete(key)
  await transactionDone(transaction)
  database.close()
}

export async function limpiarCatalogo(scopeKey: string) {
  const database = await openDatabase()
  const transaction = database.transaction([CLIENTES_STORE, META_STORE], 'readwrite')
  const clientes = transaction.objectStore(CLIENTES_STORE)
  const keys = await requestResult(clientes.index('by_scope').getAllKeys(scopeKey))
  keys.forEach((key) => clientes.delete(key))
  transaction.objectStore(META_STORE).delete(scopeKey)
  await transactionDone(transaction)
  database.close()
}

export async function leerSyncMetadata(scopeKey: string): Promise<ClienteSyncMetadata | null> {
  const database = await openDatabase()
  const transaction = database.transaction(META_STORE, 'readonly')
  const value = await requestResult(transaction.objectStore(META_STORE).get(scopeKey))
  database.close()
  return (value as ClienteSyncMetadata | undefined) ?? null
}

export async function guardarSyncMetadata(metadata: ClienteSyncMetadata) {
  const database = await openDatabase()
  const transaction = database.transaction(META_STORE, 'readwrite')
  transaction.objectStore(META_STORE).put(metadata)
  await transactionDone(transaction)
  database.close()
}
