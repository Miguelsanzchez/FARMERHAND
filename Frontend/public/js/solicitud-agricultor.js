import { getUsuario } from './auth.js'
import { apiFetch } from './api.js'

const usuario = getUsuario()

//  Control de acceso
if (!usuario || usuario.rol !== 'consumidor') {
    window.location.href = '/pages/login.html'
}

// Comprobar estado de solicitud
async function comprobarEstado() {
    try {
        const solicitud = await apiFetch('/api/agricultores/mi-solicitud')
        const estadoEl = document.getElementById('estadoSolicitud')
        const form = document.getElementById('formSolicitud')

        if (solicitud?.estado === 'pendiente') {
            estadoEl.innerHTML = `
                <div style="background:#fff8e1; border:1px solid #f9a825; border-radius:8px; padding:1rem; margin-bottom:1rem; text-align:center;">
                    <strong>Solicitud en revisión</strong><br>
                    Tu solicitud para la finca <em>${solicitud.nombre_finca}</em> está siendo revisada.
                </div>
            `
            form.style.display = 'none'
            return
        }

        if (solicitud?.estado === 'rechazado') {
            estadoEl.innerHTML = `
                <div style="background:#ffebee; border:1px solid #e53935; border-radius:8px; padding:1rem; margin-bottom:1rem; text-align:center;">
                    <strong>Solicitud no aprobada</strong><br>
                    Puedes volver a intentarlo.
                </div>
            `
        }
    } catch {
        // sin solicitud previa
    }
}

comprobarEstado()

// Enviar solicitud
document.getElementById('formSolicitud').addEventListener('submit', async (e) => {
    e.preventDefault()

    const btn = document.getElementById('btnEnviar')
    const errorEl = document.getElementById('errorSolicitud')
    const estadoEl = document.getElementById('estadoSolicitud')

    btn.disabled = true
    btn.textContent = 'Enviando...'
    errorEl.hidden = true

    const payload = {
        nombre_finca: document.getElementById('nombre_finca').value.trim(),
        localizacion: document.getElementById('localizacion').value.trim(),
        descripcion: document.getElementById('descripcion').value.trim()
    }

    try {
        await apiFetch('/api/agricultores/alta', {
            method: 'POST',
            body: JSON.stringify(payload)
        })

        document.getElementById('formSolicitud').style.display = 'none'

        estadoEl.innerHTML = `
            <div style="background:#e8f5e9; border:1px solid #43a047; border-radius:8px; padding:1.5rem; text-align:center;">
                <strong>¡Solicitud enviada!</strong><br>
                Revisaremos tu solicitud y recibirás una respuesta pronto.
                <br><br>
                <a href="../index.html" class="btn btn-primary">Volver al catálogo</a>
            </div>
        `
    } catch (err) {
        errorEl.textContent = err.message
        errorEl.hidden = false
        btn.disabled = false
        btn.textContent = 'Enviar solicitud'
    }
})