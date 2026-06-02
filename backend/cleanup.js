const path = require('path')
require('dotenv').config({ path: path.join(__dirname, '.env') })
const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY)

const DEMO_EMAILS = [
  'admin@farmerhand.com',
  'agricultor@farmerhand.com',
  'consumidor@farmerhand.com'
]

function ok(msg)  { console.log(`  ✅ ${msg}`) }
function err(msg) { console.error(`  ❌ ${msg}`) }
function info(msg){ console.log(`\n── ${msg}`) }

async function cleanup() {
  console.log('🧹 Limpieza de BD — FarmerHand\n')

  // ── 1. Obtener IDs de los tres usuarios demo ─────────────────────
  info('Buscando usuarios demo...')
  const { data: demos, error: e0 } = await supabase
    .from('usuarios')
    .select('id, email, rol')
    .in('email', DEMO_EMAILS)

  if (e0 || !demos?.length) {
    err('Usuarios demo no encontrados. Ejecuta node seed.js primero.')
    process.exit(1)
  }

  const demoIds       = demos.map(u => u.id)
  const demoAgriUser  = demos.find(u => u.email === 'agricultor@farmerhand.com')
  demos.forEach(u => ok(`${u.rol.padEnd(12)} ${u.email}`))

  // ── 2. Obtener el perfil agricultor demo ─────────────────────────
  info('Buscando perfil agricultor demo...')
  const { data: demoAgriPerfil } = await supabase
    .from('agricultores')
    .select('id')
    .eq('usuario_id', demoAgriUser.id)
    .single()

  if (!demoAgriPerfil) {
    err('Perfil agricultor demo no encontrado. Ejecuta node seed.js primero.')
    process.exit(1)
  }
  const demoAgriId = demoAgriPerfil.id
  ok(`Agricultor demo ID: ${demoAgriId}`)

  // ── 3. Identificar qué hay que eliminar ──────────────────────────
  info('Analizando datos a eliminar...')

  const { data: todosUsuarios }    = await supabase.from('usuarios').select('id')
  const { data: todosAgricultores} = await supabase.from('agricultores').select('id')

  const usuariosNonDemo = (todosUsuarios    || []).map(u => u.id).filter(id => !demoIds.includes(id))
  const agriNonDemo     = (todosAgricultores|| []).map(a => a.id).filter(id => id !== demoAgriId)

  ok(`Usuarios no-demo encontrados: ${usuariosNonDemo.length}`)
  ok(`Agricultores no-demo encontrados: ${agriNonDemo.length}`)

  // ── 4. Reasignar productos y líneas al agricultor demo ───────────
  if (agriNonDemo.length > 0) {
    info('Reasignando productos al agricultor demo...')

    const { error: ep } = await supabase
      .from('productos')
      .update({ agricultor_id: demoAgriId })
      .in('agricultor_id', agriNonDemo)
    if (ep) err(`Reasignar productos: ${ep.message}`)
    else ok('Productos reasignados')

    const { error: el } = await supabase
      .from('lineas_pedido')
      .update({ agricultor_id: demoAgriId })
      .in('agricultor_id', agriNonDemo)
    if (el) err(`Reasignar lineas_pedido: ${el.message}`)
    else ok('Líneas de pedido reasignadas')
  }

  // ── 5. Borrar pedidos de usuarios no-demo (con su cascada) ───────
  if (usuariosNonDemo.length > 0) {
    info('Eliminando pedidos de usuarios no-demo...')

    const { data: pedidosNonDemo } = await supabase
      .from('pedidos')
      .select('id')
      .in('consumidor_id', usuariosNonDemo)

    const pedidoIds = (pedidosNonDemo || []).map(p => p.id)
    ok(`Pedidos no-demo encontrados: ${pedidoIds.length}`)

    if (pedidoIds.length > 0) {
      const { error: ev } = await supabase
        .from('valoraciones')
        .delete()
        .in('pedido_id', pedidoIds)
      if (ev) err(`Borrar valoraciones: ${ev.message}`)
      else ok('Valoraciones de esos pedidos eliminadas')

      const { error: elp } = await supabase
        .from('lineas_pedido')
        .delete()
        .in('pedido_id', pedidoIds)
      if (elp) err(`Borrar lineas_pedido: ${elp.message}`)
      else ok('Líneas de pedido eliminadas')

      const { error: eped } = await supabase
        .from('pedidos')
        .delete()
        .in('id', pedidoIds)
      if (eped) err(`Borrar pedidos: ${eped.message}`)
      else ok('Pedidos eliminados')
    }

    // Valoraciones residuales de consumidores no-demo
    const { error: evr } = await supabase
      .from('valoraciones')
      .delete()
      .in('consumidor_id', usuariosNonDemo)
    if (evr) err(`Valoraciones residuales: ${evr.message}`)
    else ok('Valoraciones residuales eliminadas')
  }

  // ── 6. Borrar agricultores no-demo ───────────────────────────────
  if (agriNonDemo.length > 0) {
    info('Eliminando perfiles agricultor no-demo...')
    const { error: ea } = await supabase
      .from('agricultores')
      .delete()
      .in('id', agriNonDemo)
    if (ea) err(`Borrar agricultores: ${ea.message}`)
    else ok('Perfiles agricultor eliminados')
  }

  // ── 7. Borrar usuarios no-demo ───────────────────────────────────
  if (usuariosNonDemo.length > 0) {
    info('Eliminando usuarios no-demo...')
    const { error: eu } = await supabase
      .from('usuarios')
      .delete()
      .in('id', usuariosNonDemo)
    if (eu) err(`Borrar usuarios: ${eu.message}`)
    else ok('Usuarios eliminados')
  }

  // ── Resultado ────────────────────────────────────────────────────
  console.log('\n✅ Base de datos lista para demo')
  console.log('─────────────────────────────────────')
  console.log('  admin@farmerhand.com       / admin1234')
  console.log('  agricultor@farmerhand.com  / demo1234')
  console.log('  consumidor@farmerhand.com  / demo1234')
  console.log('─────────────────────────────────────')
  process.exit(0)
}

cleanup().catch(err => {
  console.error('❌ Error fatal:', err)
  process.exit(1)
})
