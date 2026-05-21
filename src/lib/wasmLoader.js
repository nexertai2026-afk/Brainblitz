// WASM module singleton — ek baar load, baar baar use
let moduleInstance = null
let loadingPromise = null

export async function loadBrainEngine() {
  if (moduleInstance) return moduleInstance
  if (loadingPromise) return loadingPromise

  loadingPromise = new Promise((resolve) => {
    // Pehle check karo WASM file exist karti hai ya nahi
    fetch('/wasm/brain_engine.js', { method: 'HEAD' })
      .then(res => {
        if (!res.ok) {
          console.warn('WASM not compiled yet — using JS fallback')
          resolve(null)
          return
        }

        const script = document.createElement('script')
        script.src = '/wasm/brain_engine.js'
        script.onload = async () => {
          try {
            const Module = await window.BrainEngineModule({
              locateFile: (file) => `/wasm/${file}`
            })
            moduleInstance = Module
            resolve(Module)
          } catch (err) {
            console.warn('WASM init failed — using JS fallback:', err)
            resolve(null)
          }
        }
        script.onerror = () => {
          console.warn('WASM script load failed — using JS fallback')
          resolve(null)
        }
        document.head.appendChild(script)
      })
      .catch(() => {
        console.warn('WASM not found — using JS fallback')
        resolve(null)
      })
  })

  return loadingPromise
}

export function getBrainEngineModule() {
  return moduleInstance
}