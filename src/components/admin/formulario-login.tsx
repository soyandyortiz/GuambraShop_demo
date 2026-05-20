'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { User, Lock, FlaskConical, MessageCircle, Phone, Camera } from 'lucide-react'
import { crearClienteSupabase, CLAVE_DEMO } from '@/lib/supabase/cliente'
import { Input } from '@/components/ui/input'
import { Botón } from '@/components/ui/boton'
import { ModalRecuperarContrasena } from './modal-recuperar-contrasena'

const esquema = z.object({
  email: z.string().min(1, 'Ingresa tu usuario'),
  contrasena: z.string().min(1, 'Ingresa tu contraseña'),
})

type DatosLogin = z.infer<typeof esquema>

const DEMO_USUARIO = 'demo@guambrashop.com'
const DEMO_CONTRASENA = 'admin123'
const SOPORTE_WHATSAPP = '593982650929'

const FOTOS_CHIMBORAZO = [
  {
    src: '/chimborazo/1.jpg',
    autor: 'Giovanni Poveda',
    descripcion: 'Nevado Chimborazo · Ecuador',
  },
  {
    src: '/chimborazo/2.jpg',
    autor: 'Alexander Van Steenberge',
    descripcion: 'Llamas en el Chimborazo · 4.800 msnm',
  },
  {
    src: '/chimborazo/3.jpg',
    autor: 'Alain Bonnardeaux',
    descripcion: 'Chimborazo nocturno · 6.268 msnm',
  },
  {
    src: '/chimborazo/4.jpg',
    autor: 'Mateo Coello',
    descripcion: 'Chimborazo sobre las nubes · Riobamba',
  },
]

export function FormularioLogin() {
  const router = useRouter()
  const [error, setError] = useState('')
  const [modalAbierto, setModalAbierto] = useState(false)
  const [logoUrl, setLogoUrl] = useState<string | null>(null)
  const [fotoPerfil, setFotoPerfil] = useState<string | null>(null)
  const [nombreTienda, setNombreTienda] = useState<string>('')
  const [imagenActiva, setImagenActiva] = useState(0)

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? ''

  useEffect(() => {
    crearClienteSupabase()
      .from('configuracion_tienda')
      .select('foto_perfil_url, logo_url, nombre_tienda')
      .single()
      .then(({ data }) => {
        if (data?.logo_url) setLogoUrl(data.logo_url)
        if (data?.foto_perfil_url) setFotoPerfil(data.foto_perfil_url)
        if (data?.nombre_tienda) setNombreTienda(data.nombre_tienda)
      })
  }, [])

  // Ciclo automático de imágenes cada 5 segundos
  useEffect(() => {
    const intervalo = setInterval(() => {
      setImagenActiva(prev => (prev + 1) % FOTOS_CHIMBORAZO.length)
    }, 5000)
    return () => clearInterval(intervalo)
  }, [])

  const logoMostrar = logoUrl ?? fotoPerfil

  const mensajeWhatsApp = encodeURIComponent(
    `Hola, necesito soporte técnico para mi tienda en línea.\n\n` +
    `📌 Negocio: ${nombreTienda || 'Mi tienda'}\n` +
    `🌐 URL: ${siteUrl || 'No configurada'}\n\n` +
    `Por favor, ¿me pueden ayudar?`
  )
  const enlaceWhatsApp = `https://wa.me/${SOPORTE_WHATSAPP}?text=${mensajeWhatsApp}`

  const { register, handleSubmit, setValue, formState: { errors, isSubmitting } } = useForm<DatosLogin>({
    resolver: zodResolver(esquema),
  })

  function normalizarEmail(email: string): string {
    const v = email.trim()
    const soloNumeros = /^\d+$/.test(v)
    const esDemo = v.toLowerCase() === 'demo'
    if (soloNumeros || esDemo) return `${v.toLowerCase()}@tiendademo.local`
    return v
  }

  function rellenarDemo() {
    setValue('email', DEMO_USUARIO)
    setValue('contrasena', DEMO_CONTRASENA)
  }

  async function onSubmit(datos: DatosLogin) {
    setError('')
    const supabase = crearClienteSupabase()

    const { error: errAuth } = await supabase.auth.signInWithPassword({
      email: normalizarEmail(datos.email),
      password: datos.contrasena,
    })

    if (errAuth) {
      setError('Usuario o contraseña incorrectos')
      return
    }

    const emailIngresado = normalizarEmail(datos.email)
    if (emailIngresado === 'demo@tiendademo.local' || emailIngresado === 'demo@guambrashop.com') {
      localStorage.setItem(CLAVE_DEMO, 'true')
    } else {
      localStorage.removeItem(CLAVE_DEMO)
    }

    router.push('/admin/dashboard')
    router.refresh()
  }

  return (
    <>
      <div className="min-h-screen flex">

        {/* ── PANEL IZQUIERDO — Carrusel Chimborazo ── */}
        <div className="hidden lg:flex lg:flex-col lg:w-[60%] relative overflow-hidden bg-slate-900">

          {/* Imágenes apiladas — solo la activa es visible */}
          {FOTOS_CHIMBORAZO.map((foto, idx) => (
            <div
              key={idx}
              className="absolute inset-0 transition-opacity duration-1000"
              style={{ opacity: imagenActiva === idx ? 1 : 0 }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={foto.src}
                alt={foto.autor}
                className="absolute inset-0 w-full h-full object-cover"
                style={{
                  transform: imagenActiva === idx ? 'scale(1.05)' : 'scale(1)',
                  transition: 'transform 6s ease-out',
                }}
              />
              {/* Gradiente en la parte inferior para legibilidad */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-black/30" />
            </div>
          ))}

          {/* Overlay de marca */}
          <div className="absolute inset-0 bg-gradient-to-br from-black/20 via-transparent to-primary/10 pointer-events-none" />

          {/* Contenido superpuesto */}
          <div className="relative z-10 flex flex-col h-full p-8">

            {/* Logo GuambraWeb */}
            <div className="flex items-center gap-2 self-start">
              <div className="w-8 h-8 rounded-lg bg-white/10 backdrop-blur-sm border border-white/20 flex items-center justify-center">
                <span className="text-white font-black text-sm">G</span>
              </div>
              <span className="text-white/80 text-sm font-semibold tracking-wide">GuambraWeb</span>
            </div>

            {/* Crédito del autor — animado con la imagen activa */}
            <div className="mt-auto mb-6">
              {FOTOS_CHIMBORAZO.map((foto, idx) => (
                <div
                  key={idx}
                  className="absolute transition-all duration-700"
                  style={{
                    opacity: imagenActiva === idx ? 1 : 0,
                    transform: imagenActiva === idx ? 'translateY(0)' : 'translateY(8px)',
                    bottom: '160px',
                    left: '32px',
                  }}
                >
                  <div className="flex items-center gap-2">
                    <Camera className="w-3.5 h-3.5 text-white/60" />
                    <div>
                      <p className="text-white font-semibold text-sm">{foto.autor}</p>
                      <p className="text-white/60 text-xs">{foto.descripcion}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Indicadores (dots) */}
            <div className="absolute bottom-36 left-1/2 -translate-x-1/2 flex gap-2 z-20">
              {FOTOS_CHIMBORAZO.map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => setImagenActiva(idx)}
                  className="rounded-full transition-all duration-300"
                  style={{
                    width: imagenActiva === idx ? '24px' : '8px',
                    height: '8px',
                    backgroundColor: imagenActiva === idx ? 'white' : 'rgba(255,255,255,0.35)',
                  }}
                  aria-label={`Foto ${idx + 1}`}
                />
              ))}
            </div>

            {/* Barra de soporte técnico */}
            <div className="mt-auto">
              <div className="rounded-2xl bg-black/50 backdrop-blur-md border border-white/10 p-5">
                <p className="text-white/50 text-[10px] uppercase tracking-widest font-semibold mb-3">
                  Soporte técnico
                </p>
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2 mb-0.5">
                      <Phone className="w-3.5 h-3.5 text-green-400" />
                      <span className="text-white font-bold text-base tracking-wide">0982 650 929</span>
                    </div>
                    <p className="text-white/50 text-xs pl-5">Lunes a Viernes · 8h00 – 18h00</p>
                  </div>
                  <a
                    href={enlaceWhatsApp}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 rounded-xl bg-green-500 hover:bg-green-400 active:bg-green-600 px-4 py-2.5 text-white text-sm font-semibold transition-all duration-200 shadow-lg shadow-green-900/40 flex-shrink-0"
                  >
                    <MessageCircle className="w-4 h-4" />
                    WhatsApp
                  </a>
                </div>
              </div>

              <p className="text-white/30 text-[11px] text-center mt-4">
                Chimborazo · Ecuador · {new Date().getFullYear()}
              </p>
            </div>
          </div>
        </div>

        {/* ── PANEL DERECHO — Formulario ── */}
        <div className="flex-1 lg:w-[40%] flex flex-col items-center justify-center p-6 bg-background relative overflow-hidden">

          {/* Fondo sutil decorativo */}
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute -top-32 -right-32 w-64 h-64 rounded-full bg-primary/5 blur-3xl" />
            <div className="absolute -bottom-32 -left-32 w-64 h-64 rounded-full bg-primary/5 blur-3xl" />
          </div>

          <div className="relative w-full max-w-sm">

            {/* Logo de la tienda */}
            <div className="flex flex-col items-center mb-8">
              {logoMostrar ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={logoMostrar}
                  alt={nombreTienda || 'Logo'}
                  className="h-20 w-auto object-contain mb-5"
                />
              ) : (
                <span className="text-primary font-black text-5xl select-none mb-5">
                  {nombreTienda ? nombreTienda.charAt(0).toUpperCase() : '?'}
                </span>
              )}
              <h1 className="text-2xl font-bold text-foreground">Bienvenido</h1>
            </div>

            {/* Formulario */}
            <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
              <Input
                etiqueta="Usuario"
                placeholder="correo@ejemplo.com"
                icono={<User className="w-4 h-4" />}
                autoComplete="email"
                autoCapitalize="none"
                error={errors.email?.message}
                {...register('email')}
              />

              <Input
                etiqueta="Contraseña"
                type="password"
                placeholder="••••••••"
                icono={<Lock className="w-4 h-4" />}
                autoComplete="current-password"
                error={errors.contrasena?.message}
                {...register('contrasena')}
              />

              {error && (
                <div className="rounded-xl bg-danger/10 border border-danger/20 px-4 py-3 text-sm text-danger">
                  {error}
                </div>
              )}

              <Botón
                type="submit"
                anchoCompleto
                tamaño="lg"
                cargando={isSubmitting}
                className="mt-1"
              >
                Ingresar
              </Botón>

              <button
                type="button"
                onClick={() => setModalAbierto(true)}
                className="text-sm text-foreground-muted hover:text-primary transition-colors text-center"
              >
                ¿Olvidaste tu contraseña?
              </button>
            </form>

            {/* Demo box */}
            <button
              type="button"
              onClick={rellenarDemo}
              className="w-full mt-6 rounded-2xl border-2 border-amber-400 bg-amber-400 px-4 py-3 text-left hover:bg-amber-500 hover:border-amber-500 transition-colors group"
            >
              <div className="flex items-center gap-2 mb-1.5">
                <FlaskConical className="w-3.5 h-3.5 text-amber-900 flex-shrink-0" />
                <p className="text-xs font-bold text-amber-900 uppercase tracking-wide">Modo Demo</p>
                <span className="ml-auto text-[10px] font-semibold text-amber-800 group-hover:underline">Clic para rellenar</span>
              </div>
              <div className="flex flex-col gap-1 text-xs text-amber-950 font-medium">
                <span>Usuario: <span className="font-bold">{DEMO_USUARIO}</span></span>
                <span>Contraseña: <span className="font-bold">{DEMO_CONTRASENA}</span></span>
              </div>
            </button>

            {/* Soporte en móvil (solo visible en pantallas pequeñas) */}
            <div className="lg:hidden mt-6 rounded-2xl bg-muted/60 border border-border px-4 py-3 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Phone className="w-3.5 h-3.5 text-green-500 flex-shrink-0" />
                <span className="text-sm font-semibold text-foreground">0982 650 929</span>
              </div>
              <a
                href={enlaceWhatsApp}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 rounded-lg bg-green-500 hover:bg-green-400 px-3 py-1.5 text-white text-xs font-semibold transition-colors"
              >
                <MessageCircle className="w-3.5 h-3.5" />
                Soporte
              </a>
            </div>

            {/* Footer */}
            <p className="text-xs text-foreground-muted text-center mt-8">
              Powered by{' '}
              <a
                href="https://guambraweb.com/"
                target="_blank"
                rel="noopener noreferrer"
                className="font-semibold text-primary hover:underline"
              >
                GuambraWeb
              </a>
            </p>
          </div>
        </div>
      </div>

      <ModalRecuperarContrasena
        abierto={modalAbierto}
        alCerrar={() => setModalAbierto(false)}
      />
    </>
  )
}
