
import { apiFetch } from './api.js'


 export async function login (email, password) {
    const data = await apiFetch ('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({email, password }) 
    })
    
    localStorage.setItem('token', data.token)
    localStorage.setItem('usuario', JSON.stringify(data.usuario))
    
    return data.usuario 
    }

    export async function registro (nombre, email, password) {
        const data = await apiFetch('/api/auth/registro', {
            method:'POST',
            body: JSON.stringify({ nombre, email, password })
        })

        localStorage.setItem('token', data.token)
        localStorage.setItem('usuario', JSON.stringify(data.usuario))

            return data.usuario
    }

     export function logout() {
      if (!confirm('¿Seguro que quieres cerrar sesión?')) return
      localStorage.removeItem('token')
      localStorage.removeItem('usuario')
      window.location.replace('/index.html')
     }

     export function getUsuario() {
        const raw = localStorage.getItem('usuario')
        return raw ? JSON.parse (raw) : null
     }
    
     export function estaAutenticado() {
        return !!localStorage.getItem('token')
     }

     export function redirigirSegunRol(usuario) {
      if (!usuario || !usuario.rol) {
          window.location.href = '/pages/login.html'
          return
      }

        const rutas = {
          agricultor: '/pages/panel-agricultor.html',
          consumidor: '/pages/panel-consumidor.html',
          admin:      '/pages/panel-admin.html'
      }
      window.location.href = rutas[usuario.rol] || '/index.html'
  }


    
    

