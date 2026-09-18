const API_BASE_URL = import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, '');

export async function comprobarApi() {
    if (!API_BASE_URL) {
        throw new Error('Falta Configurar la URL de la API');
    }

    const response = await fetch(`${API_BASE_URL}/health`, {
        headers: {
            Accept: 'application/json',
        },
    });

    if (!response.ok) {
        throw new Error('Error al conectar con la API');
    }

    return response.json();
    
}