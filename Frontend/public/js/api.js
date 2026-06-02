import { API_BASE as BASE_URL } from './config.js'                                                                                                                    
                                              
  export async function apiFetch(endpoint, options = {}) {                                                                                                    
      const token = localStorage.getItem('token')                                                                                                           
                                                                                                                                                              
      const headers = {                                                                                                                                     
          'Content-Type': 'application/json',                                                                                                                 
          ...(token && { Authorization: `Bearer ${token}` }),                                                                                                 
          ...options.headers                  
      }                                                                                                                                                       
                                                                                                                                                            
      const res = await fetch(`${BASE_URL}${endpoint}`, {                                                                                                     
          ...options,
          headers                                                                                                                                             
      })                                                                                                                                                    
                                              
      if (res.status === 401) {
          localStorage.removeItem('token')
          localStorage.removeItem('usuario')
          window.location.replace('/pages/login.html')
          return
      }                                                                                                                                                     

      let data                                                                                                                                                
      const contentType = res.headers.get('content-type')
                                                                                                                                                              
      if (contentType && contentType.includes('application/json')) {                                                                                        
          data = await res.json()
      } else {                                                                                                                                                
          data = { error: await res.text() }
      }                                                                                                                                                       
                                                                                                                                                            
      if (!res.ok) {                      
          throw new Error(data.error || 'Error en la petición')
      }                                                                                                                                                       
   
      return data                                                                                                                                             
  }                                                              