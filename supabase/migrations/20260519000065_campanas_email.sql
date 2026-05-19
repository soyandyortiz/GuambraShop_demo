-- ============================================================
-- EMAIL MARKETING: campañas masivas con límites de envío
-- ============================================================

-- Campañas
create table campanas_email (
  id              uuid        primary key default gen_random_uuid(),
  nombre          text        not null,
  asunto          text        not null,
  cuerpo          text        not null,
  estado          text        not null default 'borrador'
                              check (estado in ('borrador', 'activa', 'pausada', 'completada')),
  total_contactos integer     not null default 0,
  enviados        integer     not null default 0,
  errores         integer     not null default 0,
  creado_en       timestamptz default now(),
  iniciado_en     timestamptz,
  completado_en   timestamptz
);

-- Contactos importados por campaña
create table contactos_campana (
  id          uuid        primary key default gen_random_uuid(),
  campana_id  uuid        not null references campanas_email(id) on delete cascade,
  nombre      text,
  email       text        not null,
  whatsapp    text,
  estado      text        not null default 'pendiente'
              check (estado in ('pendiente', 'enviado', 'error')),
  enviado_en  timestamptz,
  error_msg   text,
  creado_en   timestamptz default now()
);
create index idx_contactos_campana_estado on contactos_campana(campana_id, estado);

-- Contador diario de envíos (límite 50/día · 300/mes)
create table email_envios_diarios (
  fecha    date    primary key default current_date,
  enviados integer not null    default 0
);

-- RLS
alter table campanas_email        enable row level security;
alter table contactos_campana     enable row level security;
alter table email_envios_diarios  enable row level security;

create policy "admin_campanas"   on campanas_email
  for all using (obtener_rol() in ('admin', 'superadmin'));

create policy "admin_contactos"  on contactos_campana
  for all using (obtener_rol() in ('admin', 'superadmin'));

create policy "admin_contador"   on email_envios_diarios
  for all using (obtener_rol() in ('admin', 'superadmin'));
