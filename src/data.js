export const DEMO_DATE = "2026-09-13";

export function createInitialState() {
  return {
    version: 1,
    theme: "light",
    notificationRead: false,
    lastUpdated: "09:42",
    summary: {
      health: "Operativo",
      coverage: 94,
      ok: 128,
      running: 3,
      pending: 12,
      late: 2,
      failed: 1,
      outside: 1,
      slotsUsed: 7,
      slotsTotal: 12,
    },
    layers: [
      { name: "Bronze", progress: 91, done: 42, total: 46, running: 2, pending: 1, error: 1 },
      { name: "Silver", progress: 96, done: 48, total: 50, running: 1, pending: 1, error: 0 },
      { name: "Gold", progress: 93, done: 38, total: 41, running: 0, pending: 2, error: 1 },
    ],
    services: [
      { name: "Monitor", host: "service-demo-01", status: "Operativo", detail: "Última revisión hace 18 s" },
      { name: "Scheduler", host: "service-demo-01", status: "Operativo", detail: "Siguiente ciclo en 12 s" },
      { name: "SQL Server", host: "DWH_DEMO", status: "Operativo", detail: "Respuesta en 24 ms" },
    ],
    workers: [
      { id: "WRK-01", name: "worker-demo-01", status: "Activo", slots: "3/4", cpu: 34, memory: 61, heartbeat: "hace 7 s" },
      { id: "WRK-02", name: "worker-demo-02", status: "Activo", slots: "2/4", cpu: 47, memory: 54, heartbeat: "hace 9 s" },
      { id: "WRK-03", name: "worker-demo-03", status: "Activo", slots: "2/4", cpu: 22, memory: 48, heartbeat: "hace 11 s" },
    ],
    executions: [
      { id: "EX-2408", process: "fact_ventas_diarias", layer: "Gold", status: "RUNNING", time: "09:31", duration: "11 min", worker: "worker-demo-02", priority: 2, processDate: DEMO_DATE, detail: "Consolidando ventas y devoluciones del día." },
      { id: "EX-2407", process: "dim_clientes", layer: "Silver", status: "ERROR", time: "09:18", duration: "8 min", worker: "worker-demo-01", priority: 1, processDate: DEMO_DATE, detail: "Timeout controlado durante la lectura de origen." },
      { id: "EX-2406", process: "stg_pedidos", layer: "Bronze", status: "READY", time: "09:45", duration: "--", worker: "worker-demo-03", priority: 3, processDate: DEMO_DATE, detail: "En espera de un slot disponible." },
      { id: "EX-2405", process: "fact_inventario", layer: "Gold", status: "LATE", time: "08:30", duration: "--", worker: "Sin asignar", priority: 2, processDate: DEMO_DATE, detail: "La hora programada ya venció." },
      { id: "EX-2404", process: "dim_producto", layer: "Silver", status: "OK", time: "08:12", duration: "4 min", worker: "worker-demo-01", priority: 3, processDate: DEMO_DATE, detail: "Finalizó correctamente." },
      { id: "EX-2403", process: "stg_clientes", layer: "Bronze", status: "OK", time: "07:56", duration: "6 min", worker: "worker-demo-03", priority: 2, processDate: DEMO_DATE, detail: "Finalizó correctamente." },
      { id: "EX-2402", process: "agg_resumen_mensual", layer: "Gold", status: "OUTSIDE", time: "--", duration: "--", worker: "Sin asignar", priority: 4, processDate: DEMO_DATE, detail: "No tiene una ejecución prevista para hoy." },
    ],
    migrations: [
      { id: "MIG-318", mode: "Por fechas", period: "2026-09-08 al 2026-09-12", status: "RUNNING", progress: 64, completed: 16, total: 25, current: "fact_ventas_diarias", worker: "worker-demo-02", created: "08:04" },
      { id: "MIG-317", mode: "Cola personalizada", period: "5 procesos", status: "OK", progress: 100, completed: 5, total: 5, current: "Completada", worker: "worker-demo-01", created: "Ayer 17:20" },
    ],
    notifications: [
      { id: "NOT-904", severity: "ERROR", category: "ETL", title: "Ejecución con error", message: "dim_clientes terminó por timeout controlado.", time: "09:26", unread: true, route: "ejecuciones", entity: "EX-2407" },
      { id: "NOT-903", severity: "WARNING", category: "ETL", title: "Carga atrasada", message: "fact_inventario todavía no ha iniciado.", time: "09:02", unread: false, route: "ejecuciones", entity: "EX-2405" },
      { id: "NOT-902", severity: "INFO", category: "MIGRATION", title: "Migración iniciada", message: "MIG-318 comenzó con 25 cargas planificadas.", time: "08:04", unread: false, route: "migraciones", entity: "MIG-318" },
      { id: "NOT-901", severity: "INFO", category: "SYSTEM", title: "Servicios disponibles", message: "Monitor y Scheduler reportan normalmente.", time: "07:45", unread: false, route: "inicio", entity: "service-demo-01" },
    ],
    sqlSessions: [
      { id: 74, user: "DEMO\\analista.bi", worker: "worker-demo-02", host: "BI-DEMO-07", source: "Power BI Desktop", database: "DWH_DEMO", status: "RUNNING", command: "SELECT", start: "09:39:02", duration: "00:03:18", cpu: 1280, reads: 18420, writes: 0, blocking: "--", wait: "--", blocked: "81", objects: "demo.FactVentas", executingObject: "Consulta ad hoc", query: "SELECT Fecha, Canal, SUM(VentaNeta)\nFROM demo.FactVentas\nWHERE Fecha = @fecha\nGROUP BY Fecha, Canal;" },
      { id: 81, user: "DEMO\\servicio.etl", worker: "worker-demo-01", host: "ETL-DEMO-01", source: "Asgard Worker", database: "STAGE_DEMO", status: "SUSPENDED", command: "EXECUTE", start: "09:40:38", duration: "00:01:42", cpu: 422, reads: 9530, writes: 214, blocking: "SPID 74", wait: "LCK_M_S · SPID 74", blocked: "--", objects: "demo.DimCliente", executingObject: "demo.CargarDimensionClientes", query: "EXEC demo.CargarDimensionClientes @fecha_proceso = @fecha;" },
      { id: 93, user: "DEMO\\reportes", worker: "worker-demo-03", host: "PBIRS-DEMO-01", source: "Report Server", database: "DWH_DEMO", status: "RUNNING", command: "SELECT", start: "09:41:44", duration: "00:00:36", cpu: 98, reads: 1204, writes: 0, blocking: "--", wait: "--", blocked: "--", objects: "demo.ResumenInventario", executingObject: "demo.ResumenInventario", query: "SELECT TOP (100) * FROM demo.ResumenInventario ORDER BY Fecha DESC;" },
    ],
    reports: [
      { id: "REP-01", name: "Ventas ejecutivas", path: "/Portafolio/Ventas", schedule: "Cada hora", lastRefresh: "09:05", lastViewed: "09:34", status: "OK", description: "Resumen comercial por canal y región." },
      { id: "REP-02", name: "Inventario operativo", path: "/Portafolio/Operaciones", schedule: "07:00 y 13:00", lastRefresh: "07:03", lastViewed: "09:21", status: "ERROR", description: "Existencias, rotación y faltantes simulados." },
      { id: "REP-03", name: "Servicio al cliente", path: "/Portafolio/Servicio", schedule: "Cada 30 minutos", lastRefresh: "09:30", lastViewed: "09:38", status: "OK", description: "Indicadores ficticios de atención y satisfacción." },
      { id: "REP-04", name: "Calidad de datos", path: "/Portafolio/Gobierno", schedule: "Diario 06:30", lastRefresh: "06:32", lastViewed: "Ayer 16:48", status: "WARNING", description: "Validaciones del escenario de demostración." },
    ],
    alerts: [
      { time: "09:26", name: "Error de ejecución", process: "dim_clientes", channel: "Canal de operaciones", status: "ENVIADO", attempts: 1 },
      { time: "09:02", name: "Proceso atrasado", process: "fact_inventario", channel: "Correo de guardia", status: "ENVIADO", attempts: 1 },
      { time: "08:41", name: "Umbral de memoria", process: "worker-demo-02", channel: "Canal de plataforma", status: "PENDIENTE", attempts: 0 },
    ],
    identities: [
      { name: "DEMO\\equipo-bi", type: "Grupo Windows", role: "data_reader", scope: "DWH_DEMO", modified: "2026-09-10" },
      { name: "DEMO\\operaciones-dwh", type: "Grupo Windows", role: "etl_operator", scope: "STAGE_DEMO", modified: "2026-09-09" },
      { name: "DEMO\\auditoria", type: "Grupo Windows", role: "audit_reader", scope: "DWH_DEMO", modified: "2026-09-02" },
      { name: "DEMO\\servicio.etl", type: "Usuario Windows", role: "etl_executor", scope: "STAGE_DEMO", modified: "2026-08-28" },
    ],
    catalog: [
      { id: "ETL-101", name: "stg_clientes", layer: "Bronze", type: "SQL", status: "Activo", worker: "worker-demo-03", schedule: "Diario 07:45", owner: "Datos maestros" },
      { id: "ETL-114", name: "dim_clientes", layer: "Silver", type: "SQL", status: "Activo", worker: "worker-demo-01", schedule: "Cada 2 horas", owner: "Datos maestros" },
      { id: "ETL-128", name: "fact_ventas_diarias", layer: "Gold", type: "Python", status: "Activo", worker: "worker-demo-02", schedule: "Diario 09:30", owner: "Analítica comercial" },
      { id: "ETL-133", name: "fact_inventario", layer: "Gold", type: "SSIS", status: "Activo", worker: "Automático", schedule: "Diario 08:30", owner: "Operaciones" },
      { id: "ETL-147", name: "agg_resumen_mensual", layer: "Gold", type: "SQL", status: "Pausado", worker: "worker-demo-02", schedule: "Manual", owner: "Finanzas" },
    ],
    objects: [
      { type: "Tabla", schema: "demo", name: "FactVentas", modified: "2026-09-11", access: "3 roles" },
      { type: "Tabla", schema: "demo", name: "DimCliente", modified: "2026-09-10", access: "4 roles" },
      { type: "Vista", schema: "demo", name: "ResumenInventario", modified: "2026-09-08", access: "2 roles" },
      { type: "Stored procedure", schema: "demo", name: "CargarDimensionClientes", modified: "2026-09-06", access: "1 rol" },
      { type: "Función", schema: "demo", name: "PeriodoFiscal", modified: "2026-08-29", access: "3 roles" },
    ],
    config: {
      runtime: "Operativo",
      globalPause: "Desactivada",
      operatingWindow: "05:00–23:30",
      refresh: "30 segundos",
      logLevel: "INFO",
      environment: "DEMO",
    },
  };
}
