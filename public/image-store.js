(() => {
  const DATABASE_NAME = "darkia-guest-images-v1";
  const STORE_NAME = "photos";
  let databasePromise;

  function openDatabase() {
    if (!("indexedDB" in globalThis)) {
      return Promise.reject(new Error("Este navegador no permite guardar fotos localmente."));
    }
    if (databasePromise) return databasePromise;

    databasePromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DATABASE_NAME, 1);
      request.onupgradeneeded = () => {
        const database = request.result;
        if (!database.objectStoreNames.contains(STORE_NAME)) {
          database.createObjectStore(STORE_NAME, { keyPath: "id" });
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => {
        databasePromise = null;
        reject(request.error || new Error("No se pudo abrir el almacenamiento local de fotos."));
      };
      request.onblocked = () => {
        databasePromise = null;
        reject(new Error("Cierra otras pestañas de DARK IA para actualizar el almacenamiento de fotos."));
      };
    });
    return databasePromise;
  }

  function requestResult(request) {
    return new Promise((resolve, reject) => {
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error || new Error("Falló el almacenamiento local de fotos."));
    });
  }

  function transactionDone(transaction) {
    return new Promise((resolve, reject) => {
      transaction.oncomplete = () => resolve();
      transaction.onabort = transaction.onerror = () => reject(transaction.error || new Error("No se pudo guardar la foto."));
    });
  }

  async function save(record) {
    const database = await openDatabase();
    const transaction = database.transaction(STORE_NAME, "readwrite");
    const done = transactionDone(transaction);
    await requestResult(transaction.objectStore(STORE_NAME).put(record));
    await done;
    return record.id;
  }

  async function get(id) {
    const database = await openDatabase();
    const transaction = database.transaction(STORE_NAME, "readonly");
    const done = transactionDone(transaction);
    const record = await requestResult(transaction.objectStore(STORE_NAME).get(id));
    await done;
    return record || null;
  }

  async function remove(id) {
    const database = await openDatabase();
    const transaction = database.transaction(STORE_NAME, "readwrite");
    const done = transactionDone(transaction);
    await requestResult(transaction.objectStore(STORE_NAME).delete(id));
    await done;
  }

  async function clear() {
    const database = await openDatabase();
    const transaction = database.transaction(STORE_NAME, "readwrite");
    const done = transactionDone(transaction);
    await requestResult(transaction.objectStore(STORE_NAME).clear());
    await done;
  }

  globalThis.DarkImageStore = Object.freeze({ save, get, remove, clear });
})();
