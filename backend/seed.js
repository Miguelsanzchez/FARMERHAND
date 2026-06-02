const path = require('path')
require('dotenv').config({ path: path.join(__dirname, '.env') })
const { createClient } = require('@supabase/supabase-js')
const bcrypt = require('bcrypt')

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY)

// ── Helpers ───────────────────────────────────────────────────────────────────

function ok(msg)     { console.log(`  ✔  ${msg}`) }
function skip(msg)   { console.log(`  →  ${msg} (ya existe)`) }
function fail(msg, e){ console.error(`  ✖  ${msg}:`, e?.message ?? e) }

function toSlug(str) {
  return str.toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

async function upsertUsuario(nombre, email, password, rol) {
  const { data: existente } = await supabase
    .from('usuarios').select('id').eq('email', email).maybeSingle()

  if (existente) { skip(`Usuario ${email}`); return existente.id }

  const password_hash = await bcrypt.hash(password, 10)
  const { data, error } = await supabase
    .from('usuarios')
    .insert([{ nombre, email, password_hash, rol }])
    .select('id').single()

  if (error) { fail(`Usuario ${email}`, error); return null }
  ok(`Usuario: ${email} (${rol})`)
  return data.id
}

async function upsertAgricultor(usuario_id, perfil) {
  const { data: existente } = await supabase
    .from('agricultores').select('id').eq('usuario_id', usuario_id).maybeSingle()

  if (existente) { skip(`Perfil "${perfil.nombre_finca}"`); return existente.id }

  const { data, error } = await supabase
    .from('agricultores')
    .insert([{ usuario_id, ...perfil, estado: 'aprobado' }])
    .select('id').single()

  if (error) { fail(`Perfil "${perfil.nombre_finca}"`, error); return null }
  ok(`Perfil: ${perfil.nombre_finca} (${perfil.localizacion})`)
  return data.id
}

async function crearProductos(agricultor_id, productos) {
  for (const p of productos) {
    const slug = p.slug ?? toSlug(p.nombre)

    const { data: existente } = await supabase
      .from('productos').select('id')
      .eq('agricultor_id', agricultor_id).eq('slug', slug).maybeSingle()

    if (existente) {
      const { cajas, ...campos } = p
      const { error: eu } = await supabase
        .from('productos').update({ ...campos, slug }).eq('id', existente.id)
      if (eu) fail(`Update "${p.nombre}"`, eu)
      else skip(`Producto "${p.nombre}"`)
      continue
    }

    const { cajas, ...campos } = p
    const { data: prod, error } = await supabase
      .from('productos')
      .insert([{ ...campos, slug, agricultor_id, disponible: true }])
      .select('id').single()

    if (error) { fail(`Producto "${p.nombre}"`, error); continue }
    ok(`Producto: ${p.nombre} — €${p.precio_por_kg}/kg`)

    for (const c of (cajas ?? [])) {
      const { error: ec } = await supabase
        .from('opciones_caja')
        .insert([{ producto_id: prod.id, kg: c.kg, precio_total: c.precio_total, descuento: c.descuento ?? 0 }])
      if (ec) fail(`Caja ${c.kg}kg de "${p.nombre}"`, ec)
    }
  }
}

// ── Datos ─────────────────────────────────────────────────────────────────────

const PRODUCTOS_VERDURAS = [
  {
    nombre: 'Tomates ecológicos',
    descripcion: 'Tomates  dulces y jugosos, cultivados bajo el sol de Murcia. Recogidos a mano en su punto óptimo de madurez.',
    precio_por_kg: 3.80, categoria: 'Verduras', tiempo_envio: 2, envio_refrigerado: true,
    cajas: [{ kg: 1, precio_total: 3.50, descuento: 8 }, { kg: 3, precio_total: 9.50, descuento: 17 }],
    foto_url: '/assets/img/productos/verduras/tomates.jpg',   slug: 'tomates-ecologicos'
  },
  {
    nombre: 'Pimientos verdes',
    descripcion: 'Pimientos rojos maduros y carnosos, sin pesticidas. Ideales para asar o consumo en crudo.',
    precio_por_kg: 4.20, categoria: 'Verduras', tiempo_envio: 2, envio_refrigerado: false,
    cajas: [{ kg: 2, precio_total: 7.50, descuento: 11 }, { kg: 5, precio_total: 17.00, descuento: 19 }],
    foto_url: '/assets/img/productos/verduras/pimientos.jpg',  slug: 'pimientos-verdes'
  },
  {
    nombre: 'Berenjenas',
    descripcion: 'Berenjenas moradas frescas de cultivo tradicional, recogidas antes del envío.',
    precio_por_kg: 3.50, categoria: 'Verduras', tiempo_envio: 2, envio_refrigerado: false,
    cajas: [{ kg: 2, precio_total: 6.00, descuento: 14 }, { kg: 5, precio_total: 14.00, descuento: 20 }],
    foto_url: '/assets/img/productos/verduras/berenjenas.jpg', slug: 'berenjenas'
  },
  {
    nombre: 'Calabacines',
    descripcion: 'Calabacines tiernos de variedad italiana. Perfectos para parrilla, salteados o rellenos.',
    precio_por_kg: 2.90, categoria: 'Verduras', tiempo_envio: 2, envio_refrigerado: false,
    cajas: [{ kg: 2, precio_total: 5.00, descuento: 14 }, { kg: 5, precio_total: 11.50, descuento: 21 }],
    foto_url: '/assets/img/productos/verduras/calabacines.jpg', slug: 'calabacines'
  },
  {
    nombre: 'Judías verdes',
    descripcion: 'Judías verdes finas recogidas en el momento de máxima ternura. Sin hebra, listas para cocinar.',
    precio_por_kg: 5.50, categoria: 'Verduras', tiempo_envio: 1, envio_refrigerado: true,
    cajas: [{ kg: 1, precio_total: 5.00, descuento: 9 }, { kg: 2, precio_total: 9.50, descuento: 14 }],
    foto_url: '/assets/img/productos/verduras/judias-verdes.jpg', slug: 'judias-verdes'
  },
  {
    nombre: 'Pepinos ecológicos',
    descripcion: 'Pepinos crujientes y refrescantes, sin cera ni tratamientos postcosecha. Ideales para ensaladas.',
    precio_por_kg: 2.50, categoria: 'Verduras', tiempo_envio: 2, envio_refrigerado: true,
    cajas: [{ kg: 2, precio_total: 4.50, descuento: 10 }, { kg: 5, precio_total: 10.50, descuento: 16 }],
    foto_url: '/assets/img/productos/verduras/plantar-pepinos.jpg', slug: 'pepinos-ecologicos'
  },
  {
    nombre: 'Lechuga romana',
    descripcion: 'Lechugas romanas frescas con hojas crujientes y bien formadas. Cosechadas cada mañana.',
    precio_por_kg: 2.20, categoria: 'Verduras', tiempo_envio: 1, envio_refrigerado: true,
    cajas: [{ kg: 1, precio_total: 2.00, descuento: 9 }, { kg: 3, precio_total: 5.50, descuento: 17 }],
    foto_url: '/assets/img/productos/verduras/lechuga-romana.jpg', slug: 'lechuga-romana'
  },
  {
    nombre: 'Cebollas moradas',
    descripcion: 'Cebollas moradas de sabor suave y ligeramente dulce. Perfectas para ensaladas y sofritos.',
    precio_por_kg: 2.80, categoria: 'Verduras', tiempo_envio: 3, envio_refrigerado: false,
    cajas: [{ kg: 2, precio_total: 5.00, descuento: 11 }, { kg: 5, precio_total: 11.50, descuento: 18 }],
    foto_url: '/assets/img/productos/verduras/cebolla-morada.jpg',  slug: 'cebollas-moradas'
  },
  {
    nombre: 'Zanahorias ecológicas',
    descripcion: 'Zanahorias dulces y tiernas de cultivo en tierra arenosa. Con tierra, tal como salen del campo.',
    precio_por_kg: 2.40, categoria: 'Verduras', tiempo_envio: 3, envio_refrigerado: false,
    cajas: [{ kg: 2, precio_total: 4.30, descuento: 10 }, { kg: 5, precio_total: 10.00, descuento: 17 }],
    foto_url: '/assets/img/productos/verduras/zanahoria.jpg',       slug: 'zanahorias-ecologicas'
  },
  {
    nombre: 'Espinacas baby',
    descripcion: 'Espinacas baby tiernas, ricas en hierro y vitaminas. Listas para ensalada sin necesidad de corte.',
    precio_por_kg: 4.80, categoria: 'Verduras', tiempo_envio: 1, envio_refrigerado: true,
    cajas: [{ kg: 0.5, precio_total: 2.20, descuento: 8 }, { kg: 1, precio_total: 4.20, descuento: 13 }],
    foto_url: '/assets/img/productos/verduras/espinaca-baby.jpg',   slug: 'espinacas-baby'
  }
]

const PRODUCTOS_FRUTAS = [
  {
    nombre: 'Naranjas Valencia',
    descripcion: 'Naranjas de zumo variedad Valencia, con alto contenido vitamínico. Sin tratamientos postcosecha.',
    precio_por_kg: 2.80, categoria: 'Frutas', tiempo_envio: 3, envio_refrigerado: false,
    cajas: [{ kg: 5, precio_total: 12.00, descuento: 14 }, { kg: 10, precio_total: 22.00, descuento: 21 }],
    foto_url: '/assets/img/productos/frutas/naranjas.jpg',          slug: 'naranjas-valencia'
  },
  {
    nombre: 'Manzanas Golden',
    descripcion: 'Manzanas Golden dulces y crujientes, calibre extra. Sin ceras ni conservantes.',
    precio_por_kg: 3.20, categoria: 'Frutas', tiempo_envio: 3, envio_refrigerado: false,
    cajas: [{ kg: 3, precio_total: 8.50, descuento: 11 }, { kg: 6, precio_total: 16.00, descuento: 17 }],
    foto_url: '/assets/img/productos/frutas/manzanas.golden.jpg',   slug: 'manzanas-golden'
  },
  {
    nombre: 'Fresas de temporada',
    descripcion: 'Fresas frescas, grandes y con aroma intenso. Sin pesticidas, recogidas a mano y enviadas el mismo día.',
    precio_por_kg: 5.90, categoria: 'Frutas', tiempo_envio: 1, envio_refrigerado: true,
    cajas: [{ kg: 1, precio_total: 5.50, descuento: 7 }, { kg: 2, precio_total: 10.50, descuento: 11 }],
    foto_url: '/assets/img/productos/frutas/fresas-temporada.jpg',  slug: 'fresas-de-temporada'
  },
  {
    nombre: 'Uvas moscatel',
    descripcion: 'Uvas moscatel blancas, dulces y muy aromáticas, con piel fina. Racimos seleccionados a mano.',
    precio_por_kg: 4.50, categoria: 'Frutas', tiempo_envio: 2, envio_refrigerado: true,
    cajas: [{ kg: 1, precio_total: 4.00, descuento: 11 }, { kg: 3, precio_total: 11.50, descuento: 15 }],
    foto_url: '/assets/img/productos/frutas/uva-moscatel.jpg',      slug: 'uvas-moscatel'
  },
  {
    nombre: 'Melocotones de viña',
    descripcion: 'Melocotones de viña con piel aterciopelada y hueso pequeño. Dulces y muy aromáticos.',
    precio_por_kg: 4.20, categoria: 'Frutas', tiempo_envio: 2, envio_refrigerado: false,
    cajas: [{ kg: 2, precio_total: 7.50, descuento: 11 }, { kg: 5, precio_total: 17.50, descuento: 17 }],
    foto_url: '/assets/img/productos/frutas/melocotones.jpg',       slug: 'melocotones-de-vina'
  },
  {
    nombre: 'Ciruelas claudias',
    descripcion: 'Ciruelas claudias verdes de sabor dulcísimo y textura melosa. Variedad tradicional de alta demanda.',
    precio_por_kg: 3.80, categoria: 'Frutas', tiempo_envio: 2, envio_refrigerado: false,
    cajas: [{ kg: 2, precio_total: 6.80, descuento: 11 }, { kg: 5, precio_total: 16.00, descuento: 16 }],
    foto_url: '/assets/img/productos/frutas/ciruelas.jpg',          slug: 'ciruelas-claudias'
  },
  {
    nombre: 'Limones Verna',
    descripcion: 'Limones Verna sin encerar, con zumo abundante y piel gruesa ideal para repostería.',
    precio_por_kg: 2.60, categoria: 'Frutas', tiempo_envio: 3, envio_refrigerado: false,
    cajas: [{ kg: 3, precio_total: 6.50, descuento: 17 }, { kg: 6, precio_total: 12.00, descuento: 23 }],
    foto_url: '/assets/img/productos/frutas/limones-verna.jpg',     slug: 'limones-verna'
  },
  {
    nombre: 'Kiwis Hayward',
    descripcion: 'Kiwis grandes y ricos en vitamina C, producidos localmente. Sabor equilibrado entre dulce y ácido.',
    precio_por_kg: 4.80, categoria: 'Frutas', tiempo_envio: 3, envio_refrigerado: false,
    cajas: [{ kg: 1, precio_total: 4.30, descuento: 10 }, { kg: 3, precio_total: 12.00, descuento: 17 }],
    foto_url: '/assets/img/productos/frutas/kiwis-jpg.jpeg',        slug: 'kiwis-hayward'
  },
  {
    nombre: 'Mandarinas clementinas',
    descripcion: 'Clementinas sin pepitas, fáciles de pelar y con alto contenido en vitamina C. Perfectas para toda la familia.',
    precio_por_kg: 2.90, categoria: 'Frutas', tiempo_envio: 3, envio_refrigerado: false,
    cajas: [{ kg: 5, precio_total: 12.50, descuento: 14 }, { kg: 10, precio_total: 23.00, descuento: 21 }],
    foto_url: '/assets/img/productos/frutas/mandarinas.jpg',        slug: 'mandarinas-clementinas'
  },
  {
    nombre: 'Peras Conferencia',
    descripcion: 'Peras Conferencia aromáticas y jugosas, recolectadas en su punto justo de madurez.',
    precio_por_kg: 3.50, categoria: 'Frutas', tiempo_envio: 3, envio_refrigerado: false,
    cajas: [{ kg: 2, precio_total: 6.00, descuento: 14 }, { kg: 5, precio_total: 14.00, descuento: 20 }],
    foto_url: '/assets/img/productos/frutas/peras-conferencia.jpg', slug: 'peras-conferencia'
  }
]

const PRODUCTOS_LACTEOS = [
  {
    nombre: 'Queso manchego curado',
    descripcion: 'Queso manchego D.O.P. con 12 meses de curación. Sabor intenso, textura firme. Elaborado con leche cruda de oveja manchega.',
    precio_por_kg: 22.00, categoria: 'Lacteos', tiempo_envio: 3, envio_refrigerado: true,
    cajas: [{ kg: 0.5, precio_total: 10.00, descuento: 9 }, { kg: 1, precio_total: 19.50, descuento: 11 }],
    foto_url: '/assets/img/productos/lacteos/queso-manchego.jpg',   slug: 'queso-manchego-curado'
  },
  {
    nombre: 'Queso fresco de cabra',
    descripcion: 'Queso fresco elaborado con leche de cabra pasteurizada. Textura cremosa, sabor suave con toque ácido.',
    precio_por_kg: 14.00, categoria: 'Lacteos', tiempo_envio: 2, envio_refrigerado: true,
    cajas: [{ kg: 0.5, precio_total: 6.50, descuento: 7 }, { kg: 1, precio_total: 12.50, descuento: 11 }],
    foto_url: '/assets/img/productos/lacteos/queso-cabra.jpg',      slug: 'queso-fresco-de-cabra'
  },
  {
    nombre: 'Queso semicurado de oveja',
    descripcion: 'Semicurado con 3 meses de maduración. Sabor equilibrado y textura elástica. Leche de oveja churra.',
    precio_por_kg: 18.00, categoria: 'Lacteos', tiempo_envio: 3, envio_refrigerado: true,
    cajas: [{ kg: 0.5, precio_total: 8.50, descuento: 6 }, { kg: 1, precio_total: 16.00, descuento: 11 }],
    foto_url: '/assets/img/productos/lacteos/queso-oveja.jpg',      slug: 'queso-semicurado-de-oveja'
  },
  {
    nombre: 'Queso tierno de leche cruda',
    descripcion: 'Queso tierno de leche cruda de oveja, menos de 7 días de maduración. Sabor lácteo fresco y muy suave.',
    precio_por_kg: 16.00, categoria: 'Lacteos', tiempo_envio: 2, envio_refrigerado: true,
    cajas: [{ kg: 0.5, precio_total: 7.50, descuento: 6 }, { kg: 1, precio_total: 14.50, descuento: 9 }],
    foto_url: '/assets/img/productos/lacteos/queso-leche-cruda.jpg', slug: 'queso-tierno-de-leche-cruda'
  },
  {
    nombre: 'Queso de cabra con pimentón',
    descripcion: 'Queso de cabra de 6 meses de curación con cobertura de pimentón de la Vera. Sabor ahumado y persistente.',
    precio_por_kg: 20.00, categoria: 'Lacteos', tiempo_envio: 3, envio_refrigerado: true,
    cajas: [{ kg: 0.5, precio_total: 9.50, descuento: 5 }, { kg: 1, precio_total: 18.00, descuento: 10 }],
    foto_url: '/assets/img/productos/lacteos/queso-pimento.jpg',     slug: 'queso-de-cabra-con-pimenton'
  },
  {
    nombre: 'Aceite Picual virgen extra',
    descripcion: 'AOVE monovarietal Picual de cosecha temprana. Acidez menor a 0,2%. Sabor intenso con notas frutadas verdes.',
    precio_por_kg: 12.00, categoria: 'Aceites', tiempo_envio: 5, envio_refrigerado: false,
    cajas: [{ kg: 0.5, precio_total: 5.50, descuento: 8 }, { kg: 1, precio_total: 10.50, descuento: 13 }, { kg: 3, precio_total: 29.00, descuento: 19 }],
    foto_url: '/assets/img/productos/aceites/aceite.jpg',            slug: 'aceite-picual-virgen-extra'
  },
  {
    nombre: 'Miel de azahar',
    descripcion: 'Miel artesanal de nuestras colmenas, con intenso aroma floral. Sin procesar, directo del colmenar.',
    precio_por_kg: 10.00, categoria: 'Aceites', tiempo_envio: 5, envio_refrigerado: false,
    cajas: [{ kg: 0.5, precio_total: 4.80, descuento: 4 }, { kg: 1, precio_total: 9.00, descuento: 10 }],
    foto_url: '/assets/img/productos/aceites/miel-azahar.webp',      slug: 'miel-de-azahar'
  }
]

// ── Main ──────────────────────────────────────────────────────────────────────

async function seed() {
  console.log('\n🌱  Iniciando seed FarmerHand...\n')

  // Usuarios sin rol de agricultor
  await upsertUsuario('Admin FarmerHand',  'admin@farmerhand.com',       'admin1234', 'admin')
  await upsertUsuario('Carlos López',      'consumidor@farmerhand.com',  'demo1234',  'consumidor')
  // Usuario demo del README (agricultor@farmerhand.com)
  const idAgriDemo = await upsertUsuario('María García', 'agricultor@farmerhand.com', 'demo1234', 'agricultor')

  // Perfil del agricultor demo (el que usa el README)
  if (idAgriDemo) {
    const agriDemoId = await upsertAgricultor(idAgriDemo, {
      nombre_finca: 'Huerta La Vega',
      localizacion: 'Murcia, España',
      descripcion: 'Finca familiar ecológica con más de 20 años de experiencia en el cultivo de hortalizas.'
    })
    // No creamos productos aquí — se crean con los agricultores de verduras/frutas/lácteos
    if (agriDemoId) ok('Perfil demo listo (sin productos propios)')
  }

  // ── Agricultor Verduras ────────────────────────────────────────────────────
  console.log('\n🥦  Agricultor — Verduras')
  const idUserVerduras = await upsertUsuario('Ana Martínez', 'verduras@farmerhand.com', 'demo1234', 'agricultor')
  if (idUserVerduras) {
    const agriVerduras = await upsertAgricultor(idUserVerduras, {
      nombre_finca: 'Huerta Ecológica del Valle',
      localizacion: 'Almería, España',
      descripcion: 'Finca familiar con 20 años cultivando hortalizas de temporada en el sureste español.',
      certificacion: true,
      zonas_envio: ['Andalucía', 'Murcia', 'Madrid', 'Barcelona']
    })
    if (agriVerduras) await crearProductos(agriVerduras, PRODUCTOS_VERDURAS)
  }

  // ── Agricultor Frutas ──────────────────────────────────────────────────────
  console.log('\n🍊  Agricultor — Frutas')
  const idUserFrutas = await upsertUsuario('Antonio Ruiz', 'frutas@farmerhand.com', 'demo1234', 'agricultor')
  if (idUserFrutas) {
    const agriFrutas = await upsertAgricultor(idUserFrutas, {
      nombre_finca: 'Finca Los Frutales',
      localizacion: 'Valencia, España',
      descripcion: 'Finca citrícola y frutera con 15 hectáreas de cultivo ecológico certificado en la huerta valenciana.',
      certificacion: true,
      zonas_envio: ['Comunitat Valenciana', 'Cataluña', 'Madrid', 'Aragón']
    })
    if (agriFrutas) await crearProductos(agriFrutas, PRODUCTOS_FRUTAS)
  }

  // ── Agricultor Lácteos y Aceites ────────────────────────────────────────────
  console.log('\n🧀  Agricultor — Lácteos y Aceites')
  const idUserLacteos = await upsertUsuario('Carmen Morales', 'lacteos@farmerhand.com', 'demo1234', 'agricultor')
  if (idUserLacteos) {
    const agriLacteos = await upsertAgricultor(idUserLacteos, {
      nombre_finca: 'Quesería y Almazara Sierra Norte',
      localizacion: 'Ávila, España',
      descripcion: 'Producción artesanal de quesos de oveja y aceites de oliva virgen extra con certificación ecológica.',
      certificacion: true,
      zonas_envio: ['Castilla y León', 'Madrid', 'Extremadura']
    })
    if (agriLacteos) await crearProductos(agriLacteos, PRODUCTOS_LACTEOS)
  }

  // ── Resumen ────────────────────────────────────────────────────────────────
  console.log('\n')
  console.log('═══════════════════════════════════════════════════════════════')
  console.log('  SEED COMPLETADO — CREDENCIALES DE ACCESO')
  console.log('═══════════════════════════════════════════════════════════════')
  console.log('  admin@farmerhand.com       → admin1234   (admin)')
  console.log('  consumidor@farmerhand.com  → demo1234    (consumidor)')
  console.log('  agricultor@farmerhand.com  → demo1234    (agricultor demo, sin productos)')
  console.log('  verduras@farmerhand.com    → demo1234    (agricultor — 10 verduras)')
  console.log('  frutas@farmerhand.com      → demo1234    (agricultor — 10 frutas)')
  console.log('  lacteos@farmerhand.com     → demo1234    (agricultor — 10 lácteos/aceites)')
  console.log('═══════════════════════════════════════════════════════════════\n')

  process.exit(0)
}

seed().catch(e => { console.error('\n❌ Error fatal en seed:', e.message); process.exit(1) })
