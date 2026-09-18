import { useState } from "react";
import { comprobarApi } from "./lib/api";

function App() {
  const [mensaje, setMensaje] = useState<string>('Conexión Pendiente...');
  const [probando, setProbando] = useState<boolean>(false);

  async function probarConexion() {
    setProbando(true);
    setMensaje('Probando conexión...');

    try{
      const resultado = await comprobarApi();
      setMensaje(`Conexión Exitosa: ${resultado.status}`);
    } catch (error) {
      setMensaje(`Error al conectar: ${error instanceof Error ? error.message : 'Desconocido'}`);
    } finally {
      setProbando(false);
    }
  }

  return (
    <main style={{ padding: '48px 24px', fontFamily: 'sans-serif' }}>
      <h1>GELIA Móvil</h1>
      <p>{mensaje}</p>

      <button onClick={probarConexion} disabled={probando}>
        {probando ? 'Probando…' : 'Probar conexión'}
      </button>
    </main>
  );
}

export default App;