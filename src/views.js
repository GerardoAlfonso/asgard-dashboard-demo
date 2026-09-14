import { DEMO_DATE } from "./data.js";
import { escapeHtml } from "./feedback.js";

export const ROUTES = new Set([
  "inicio", "ejecuciones", "migraciones", "alertas", "monitoreo",
  "report-server", "usuarios", "catalogo", "catalogo-objetos", "configuracion",
]);

const statusMap = {
  OK: ["OK", "ok"],
  RUNNING: ["En ejecución", "info"],
  READY: ["Pendiente", "neutral"],
  REQUEUED: ["Reencolada", "warn"],
  ERROR: ["Error", "bad"],
  LATE: ["Atrasada", "warn"],
  OUTSIDE: ["Fuera de cobertura", "neutral"],
  WARNING: ["Advertencia", "warn"],
  ENVIADO: ["Enviado", "ok"],
  PENDIENTE: ["Pendiente", "neutral"],
  SUSPENDED: ["Suspendida", "warn"],
  Activo: ["Activo", "ok"],
  Pausado: ["Pausado", "neutral"],
  Operativo: ["Operativo", "ok"],
};

export function status(value) {
  const [label, tone] = statusMap[value] || [value, "neutral"];
  return `<span class="status ${tone}">${escapeHtml(label)}</span>`;
}

function heading(title, description, actions = "") {
  return `
    <header class="page-heading">
      <div><h1>${escapeHtml(title)}</h1><p>${escapeHtml(description)}</p></div>
      ${actions ? `<div class="page-actions">${actions}</div>` : ""}
    </header>`;
}

function tableEmpty(columns, message) {
  return `<tr><td colspan="${columns}" class="empty-state">${escapeHtml(message)}</td></tr>`;
}

function home(state) {
  const attention = state.executions.filter(row => ["ERROR", "LATE", "OUTSIDE", "REQUEUED"].includes(row.status));
  return `
    ${heading("Inicio", "ETL, servidores y workers en un solo lugar.")}
    <section class="panel" id="operationalOverview">
      <div class="panel-heading"><h2>Estado operativo</h2><span>Actualizado ${escapeHtml(state.lastUpdated)}</span></div>
      <div class="status-overview">
        <div class="coverage-block"><span>Cobertura del día</span><strong>${state.summary.coverage}%</strong><div class="bar" role="progressbar" aria-label="Cobertura del día" aria-valuenow="${state.summary.coverage}" aria-valuemin="0" aria-valuemax="100"><span style="width:${state.summary.coverage}%"></span></div></div>
        <div class="count-block"><span>OK</span><strong class="tone-ok">${state.summary.ok}</strong></div>
        <div class="count-block"><span>En curso</span><strong>${state.summary.running}</strong></div>
        <div class="count-block"><span>Pendientes</span><strong>${state.summary.pending}</strong></div>
        <div class="count-block"><span>Atrasadas</span><strong class="tone-warn">${state.summary.late}</strong></div>
        <div class="count-block"><span>Fallidas</span><strong class="tone-bad">${state.summary.failed}</strong></div>
        <div class="count-block"><span>Fuera cobertura</span><strong>${state.summary.outside}</strong></div>
      </div>
    </section>

    <div class="dashboard-grid">
      <section class="panel" id="attentionPanel">
        <div class="panel-heading"><h2>Cargas que requieren atención</h2><span>${attention.length} visibles</span></div>
        <div class="panel-body flush table-wrap">
          <table><thead><tr><th>Proceso</th><th>Capa</th><th>Estado</th><th>Hora</th><th>Worker</th><th>Acción</th></tr></thead>
          <tbody>${attention.map(row => `<tr><td><span class="cell-title">${escapeHtml(row.process)}</span><span class="cell-meta">${row.id}</span></td><td>${row.layer}</td><td>${status(row.status)}</td><td>${row.time}</td><td>${row.worker}</td><td><a class="button-link table-action" href="#ejecuciones">Revisar</a></td></tr>`).join("")}</tbody></table>
        </div>
      </section>
      <section class="panel">
        <div class="panel-heading"><h2>Capacidad y servicios</h2><span>Ahora</span></div>
        <div class="panel-body service-list">
          <div class="service-row"><div><strong>Workers activos</strong><br><span>${state.workers.length} de ${state.workers.length}</span></div><strong>${state.summary.slotsUsed}/${state.summary.slotsTotal} slots</strong></div>
          ${state.services.map(item => `<div class="service-row"><div><strong>${item.name}</strong><br><span>${item.detail}</span></div>${status(item.status)}</div>`).join("")}
        </div>
      </section>
    </div>

    <section class="panel">
      <div class="panel-heading"><h2>Progreso por capa</h2><span>Hoy</span></div>
      <div class="panel-body">
        ${state.layers.map(layer => `<div class="layer-row"><strong>${layer.name}</strong><div><span>${layer.progress}% de cobertura</span><div class="bar"><span style="width:${layer.progress}%"></span></div></div><span>${layer.done}/${layer.total} OK</span><span>${layer.running} en curso</span><span class="${layer.error ? "tone-bad" : ""}">${layer.error} error</span></div>`).join("")}
      </div>
    </section>

    <section class="panel">
      <div class="panel-heading"><h2>Recursos por worker</h2><span>Telemetría simulada</span></div>
      <div class="panel-body flush table-wrap"><table><thead><tr><th>Worker</th><th>Estado</th><th>Slots</th><th>CPU</th><th>Memoria</th><th>Heartbeat</th></tr></thead><tbody>
        ${state.workers.map(worker => `<tr><td class="cell-title">${worker.name}</td><td>${status(worker.status)}</td><td>${worker.slots}</td><td>${worker.cpu}%</td><td>${worker.memory}%</td><td>${worker.heartbeat}</td></tr>`).join("")}
      </tbody></table></div>
    </section>`;
}

function executions(state) {
  const failed = state.executions.filter(row => row.status === "ERROR").length;
  return `
    ${heading("Ejecuciones", "Consulta diaria de cargas, cola y resultados por capa.")}
    <div class="summary-strip">
      <div class="summary-item"><strong>${state.executions.length}</strong><span>Total visible</span></div>
      <div class="summary-item"><strong>${state.executions.filter(row => row.status === "RUNNING").length}</strong><span>En ejecución</span></div>
      <div class="summary-item"><strong class="tone-bad">${failed}</strong><span>Con error</span></div>
      <div class="summary-item"><strong>${state.executions.filter(row => ["READY", "REQUEUED"].includes(row.status)).length}</strong><span>En cola</span></div>
    </div>
    <section class="panel" id="executionWorkspace">
      <div class="panel-heading"><div><h2>Monitor de ejecuciones</h2><p>Filtra el escenario y revisa el último intento de cada carga.</p></div><span id="executionCount">${state.executions.length} filas</span></div>
      <div class="panel-body">
        <div class="table-tools">
          <label>Proceso<input id="executionSearch" type="search" placeholder="Buscar proceso"></label>
          <label>Estado<select id="executionStatus"><option value="ALL">Todos</option>${["RUNNING", "ERROR", "READY", "REQUEUED", "OK", "LATE", "OUTSIDE"].map(item => `<option value="${item}">${statusMap[item][0]}</option>`).join("")}</select></label>
          <label>Worker<select id="executionWorker"><option value="ALL">Todos</option>${state.workers.map(worker => `<option>${worker.name}</option>`).join("")}</select></label>
          <button type="button" id="clearExecutionFilters">Limpiar</button>
        </div>
      </div>
      <div class="table-wrap"><table><thead><tr><th>Hora</th><th>Capa</th><th>Proceso</th><th>Estado</th><th>Duración</th><th>Worker</th><th>Prioridad</th><th>Acciones</th></tr></thead><tbody id="executionRows">${executionRows(state.executions)}</tbody></table></div>
    </section>`;
}

export function executionRows(rows) {
  return rows.length ? rows.map(row => `
    <tr data-execution-row="${row.id}"><td>${row.time}</td><td>${row.layer}</td><td><span class="cell-title">${escapeHtml(row.process)}</span><span class="cell-meta">${row.id} · ${row.processDate}</span></td><td>${status(row.status)}</td><td>${row.duration}</td><td>${row.worker}</td><td>${row.priority}</td><td>
      <button type="button" class="table-action" data-execution-detail="${row.id}">Detalle</button>
      ${row.status === "ERROR" ? `<button type="button" class="table-action danger" data-requeue="${row.id}">Reencolar</button>` : ""}
    </td></tr>`).join("") : tableEmpty(8, "No hay ejecuciones para los filtros seleccionados.");
}

function migrations(state) {
  const activeRows = state.migrations.filter(row => ["RUNNING", "READY"].includes(row.status));
  const historyRows = state.migrations.filter(row => !["RUNNING", "READY"].includes(row.status));
  const active = activeRows.length;
  const activeTotal = activeRows.reduce((sum, row) => sum + row.total, 0);
  const activeCompleted = activeRows.reduce((sum, row) => sum + row.completed, 0);
  const progress = activeTotal ? Math.round((activeCompleted / activeTotal) * 100) : 0;
  return `
    ${heading("Migraciones", "Ejecuta y consulta reprocesos usando la configuración vigente de cada ETL.")}
    <div class="migration-summary" aria-label="Resumen de migraciones activas">
      <span><strong>${active}</strong> activas</span>
      <span><strong>${progress}%</strong> de avance</span>
      <span>${activeCompleted} de ${activeTotal} cargas</span>
      <span><strong>${activeCompleted}</strong> completadas</span>
      <span><strong>${Math.max(0, activeTotal - activeCompleted)}</strong> pendientes</span>
    </div>
    <div class="migration-toolbar">
      <div class="tabs migration-tabs" role="tablist" aria-label="Vistas de migraciones">
        <button class="tab active" type="button" data-migration-view="active" aria-selected="true">Activas</button>
        <button class="tab" type="button" data-migration-view="history" aria-selected="false">Historial</button>
      </div>
      <button type="button" class="primary" id="newMigrationButton">Nueva migración</button>
    </div>
    <div id="migrationActiveView">
      <section class="panel" id="migrationWorkspace">
        <div class="panel-heading"><h2>Migraciones en curso</h2><span>${activeRows.length} registros</span></div>
        <div class="table-wrap"><table><thead><tr><th>ID</th><th>Estado</th><th>Periodo / tipo</th><th>Progreso</th><th>Actual</th><th>Pendientes</th><th>Worker</th><th>Detalle</th><th>Acciones</th></tr></thead><tbody>
          ${activeRows.length ? activeRows.map(row => `<tr><td class="cell-title">${row.id}</td><td>${status(row.status)}</td><td><span class="cell-title">${row.period}</span><span class="cell-meta">${row.mode}</span></td><td><strong>${row.progress}%</strong><span class="cell-meta">${row.completed} de ${row.total} cargas</span></td><td>${row.current}</td><td>${Math.max(0, row.total - row.completed)}</td><td>${row.worker}</td><td><button type="button" class="table-action" data-readonly-detail="Migración ${row.id}">Ver detalle</button></td><td><button type="button" class="table-action" disabled>Detener</button></td></tr>`).join("") : tableEmpty(9, "No hay migraciones activas.")}
        </tbody></table></div>
      </section>
      <section class="panel">
        <div class="panel-heading"><h2>Cola de ejecución</h2><span>${activeRows.length} procesos</span></div>
        <div class="table-wrap"><table><thead><tr><th>ID</th><th>ETL</th><th>Capa</th><th>Avance</th><th>Actual</th><th>Estado</th><th>Worker</th></tr></thead><tbody>
          ${activeRows.length ? activeRows.map((row, index) => `<tr><td>M-${String(index + 1).padStart(3, "0")}</td><td class="cell-title">${row.current}</td><td>${index % 2 ? "Silver" : "Gold"}</td><td>${row.progress}%</td><td>${row.completed + 1} de ${row.total}</td><td>${status(row.status)}</td><td>${row.worker}</td></tr>`).join("") : tableEmpty(7, "La cola de migraciones está vacía.")}
        </tbody></table></div>
      </section>
    </div>
    <div id="migrationHistoryView" hidden>
      <section class="panel">
        <div class="panel-heading"><h2>Historial</h2><span>${historyRows.length} registros</span></div>
        <div class="panel-body"><div class="migration-history-filters"><select aria-label="Estado de migración"><option>Todos los estados</option><option>OK</option><option>Error</option></select><select aria-label="Modalidad de migración"><option>Todas las modalidades</option><option>Por fechas</option><option>Cola personalizada</option></select><input type="date" aria-label="Desde"><input type="date" aria-label="Hasta"><input type="search" placeholder="ETL o ID" aria-label="ETL o ID"><input type="search" placeholder="Worker" aria-label="Worker"><button type="button">Aplicar</button></div></div>
        <div class="table-wrap"><table><thead><tr><th>ID</th><th>Inicio</th><th>Estado</th><th>Tipo / periodo</th><th>Progreso</th><th>Worker</th><th>Detalle</th><th>Acciones</th></tr></thead><tbody>
          ${historyRows.length ? historyRows.map(row => `<tr><td class="cell-title">${row.id}</td><td>${row.created}</td><td>${status(row.status)}</td><td><span class="cell-title">${row.mode}</span><span class="cell-meta">${row.period}</span></td><td>${row.completed} de ${row.total}</td><td>${row.worker}</td><td>${row.current}</td><td><button type="button" class="table-action" data-readonly-detail="Migración ${row.id}">Ver detalle</button></td></tr>`).join("") : tableEmpty(8, "No hay migraciones finalizadas.")}
        </tbody></table></div>
      </section>
    </div>`;
}

function alerts(state) {
  return `
    ${heading("Alertas", "Historial simulado de entregas operativas.")}
    <div class="readonly-note">Esta vista es de solo lectura en el portafolio. No se muestran destinos ni webhooks reales.</div>
    <section class="panel"><div class="panel-heading"><h2>Historial de alertas</h2><span>${state.alerts.length} entregas</span></div><div class="table-wrap"><table><thead><tr><th>Hora</th><th>Alerta</th><th>Proceso</th><th>Destino ficticio</th><th>Estado</th><th>Intentos</th></tr></thead><tbody>
      ${state.alerts.map(item => `<tr><td>${item.time}</td><td class="cell-title">${item.name}</td><td>${item.process}</td><td>${item.channel}</td><td>${status(item.status)}</td><td>${item.attempts}</td></tr>`).join("")}
    </tbody></table></div></section>`;
}

function sqlMonitor(state) {
  const blocking = state.sqlSessions.filter(row => row.blocking !== "--").length;
  const users = new Set(state.sqlSessions.map(row => row.user)).size;
  return `
    ${heading("Monitoreo SQL", "Consultas activas, usuarios, bloqueos y consumo de las instancias atendidas por los workers.")}
    <div class="kpi-grid">
      <div class="kpi neutral"><span>Sesiones activas</span><strong>${state.sqlSessions.length}</strong><div class="kpi-hint">usuarios ejecutando consultas</div></div>
      <div class="kpi ${blocking ? "bad" : "neutral"}"><span>Bloqueos</span><strong>${blocking}</strong><div class="kpi-hint">sesiones bloqueadas</div></div>
      <div class="kpi info"><span>Usuarios únicos</span><strong>${users}</strong><div class="kpi-hint">lanzando consultas</div></div>
      <div class="kpi neutral"><span>Objetos consultados</span><strong>${state.sqlSessions.length + 2}</strong><div class="kpi-hint">en consultas visibles</div></div>
    </div>
    <section class="panel" id="sqlMonitorWorkspace">
      <div class="panel-heading"><h2>Consultas en ejecución</h2><span id="sqlSessionCount">${state.sqlSessions.length} sesiones</span></div>
      <div class="panel-body"><div class="sql-monitor-tools"><select id="sqlWorker" aria-label="Filtrar por worker"><option value="ALL">Todos los workers</option>${state.workers.map(worker => `<option>${worker.name}</option>`).join("")}</select><input id="sqlUser" type="search" placeholder="Usuario o aplicación" aria-label="Buscar usuario o aplicación"><label class="check-filter"><input id="hideAsgardQueries" type="checkbox"> Ocultar consultas de la app</label><button type="button" id="clearSqlFilters">Limpiar</button></div></div>
      <div class="table-wrap"><table id="sqlTable" class="sql-activity-table"><thead><tr><th>SPID</th><th>Usuario</th><th>Equipo / IP</th><th>Aplicación</th><th>Base</th><th>Estado</th><th>Comando</th><th>Inicio</th><th>Duración</th><th>Lecturas</th><th>Escrituras</th><th>Espera / bloqueo</th><th>SPID bloqueados</th><th>Objetos</th><th>SP / Vista / Función</th><th>Consulta actual</th></tr></thead><tbody id="sqlRows">${sqlRows(state.sqlSessions)}</tbody></table></div>
    </section>
    <section class="panel">
      <div class="panel-heading"><h2>Workers y actividad SQL</h2><span>${state.workers.length} workers</span></div>
      <div class="table-wrap"><table class="sql-worker-table"><thead><tr><th>Worker</th><th>Servidor</th><th>Base</th><th>Estado</th><th>Consultas</th><th>Usuarios</th><th>Slots</th><th>Heartbeat</th><th>Usuarios activos</th></tr></thead><tbody>${state.workers.map((worker, index) => `<tr><td class="cell-title">${worker.name}</td><td>SQL-DEMO-${String(index + 1).padStart(2, "0")}</td><td>${index === 1 ? "DWH_DEMO" : "STAGE_DEMO"}</td><td>${status(worker.status)}</td><td>${state.sqlSessions.filter(row => row.worker === worker.name).length}</td><td>${new Set(state.sqlSessions.filter(row => row.worker === worker.name).map(row => row.user)).size}</td><td>${worker.slots}</td><td>${worker.heartbeat}</td><td>${state.sqlSessions.filter(row => row.worker === worker.name).length}</td></tr>`).join("")}</tbody></table></div>
    </section>
    <div class="inline-note warning">Finalizar sesiones está deshabilitado: el demo permite inspeccionar actividad, pero nunca ejecuta acciones destructivas.</div>`;
}

export function sqlRows(rows) {
  return rows.length ? rows.map(row => `<tr><td>${row.id}</td><td>${row.user}</td><td>${row.host || row.worker}</td><td>${row.source || "Aplicación demo"}</td><td>${row.database}</td><td>${status(row.status)}</td><td>${row.command || "SELECT"}</td><td>${row.start || "09:00:00"}</td><td>${row.duration}</td><td>${row.reads}</td><td>${row.writes ?? 0}</td><td class="${row.blocking !== "--" ? "tone-warn" : ""}">${row.wait || row.blocking}</td><td>${row.blocked || "--"}</td><td class="wrap">${row.objects || "demo.FactVentas"}</td><td class="wrap">${row.executingObject || "Consulta ad hoc"}</td><td><button class="table-action" type="button" data-sql-detail="${row.id}">Ver consulta</button></td></tr>`).join("") : tableEmpty(16, "No hay sesiones para los filtros seleccionados.");
}

function reportServer(state) {
  const errors = state.reports.filter(item => item.status === "ERROR").length;
  const ok = state.reports.filter(item => item.status === "OK").length;
  const scheduled = state.reports.filter(item => item.schedule !== "Manual").length;
  return `
    ${heading("Power BI Report Server", "Reportes publicados y estado de sus planes de actualización.")}
    <div class="report-server-tabs tabs" role="tablist" aria-label="Secciones de Report Server">
      <button class="tab active" type="button" data-report-view="reports" aria-selected="true">Reportes</button>
      <button class="tab" type="button" data-report-view="access" aria-selected="false">Accesos</button>
    </div>
    <div id="reportServerReportsPanel">
      <div class="kpi-grid report-server-kpis">
        <div class="kpi neutral"><span>Reportes publicados</span><strong>${state.reports.length}</strong><div class="kpi-hint">${scheduled} con plan configurado</div></div>
        <div class="kpi ok"><span>Actualizaciones OK hoy</span><strong>${ok}</strong><div class="kpi-hint">ejecuciones de planes</div></div>
        <div class="kpi bad"><span>Con error hoy</span><strong>${errors}</strong><div class="kpi-hint">programados y vencidos hoy</div></div>
        <div class="kpi info"><span>En curso hoy</span><strong>0</strong><div class="kpi-hint">13 sep 2026</div></div>
      </div>
      <section class="panel report-server-panel" id="reportWorkspace">
        <div class="panel-heading"><h2>Reportes</h2><span id="reportCount">${state.reports.length} reportes</span></div>
        <div class="panel-body"><div class="report-server-tools"><div class="report-server-filters"><input type="search" id="reportSearch" placeholder="Buscar reporte o ruta" aria-label="Buscar reporte o ruta"><select id="reportStatus" aria-label="Estado"><option value="ALL">Todos los estados</option><option value="OK">OK</option><option value="ERROR">Error</option><option value="WARNING">Advertencia</option></select><select id="reportSchedule" aria-label="Plan de actualización"><option value="ALL">Todos los planes</option><option value="SCHEDULED">Con plan de actualización</option><option value="MANUAL">Sin plan de actualización</option></select><select id="reportFolder" aria-label="Carpeta"><option value="ALL">Todas las carpetas</option>${[...new Set(state.reports.map(row => row.path.split("/").slice(0, -1).join("/") || "/"))].map(folder => `<option>${folder}</option>`).join("")}</select></div><button type="button" id="downloadReportServer" disabled>Descargar Excel</button><button type="button" id="clearReportFilters">Limpiar</button></div></div>
        <div class="table-wrap"><table class="report-server-table"><thead><tr><th>Reporte</th><th>Ruta</th><th>Plan</th><th>Última actualización</th><th>Última consulta</th><th>Estado</th><th>Detalle</th><th>Acciones</th></tr></thead><tbody id="reportRows">${reportRows(state.reports)}</tbody></table></div>
      </section>
    </div>
    <section id="reportServerAccessPanel" hidden>
      <div class="report-access-workspace">
        <aside class="report-access-catalog"><div class="report-access-catalog-head"><strong>Carpetas y reportes</strong><span>${state.reports.length}</span></div><input type="search" placeholder="Buscar nombre o ruta" aria-label="Buscar carpeta o reporte"><div class="report-access-tree">${state.reports.map((row, index) => `<button type="button" class="report-access-item ${index === 0 ? "active" : ""}" data-readonly-detail="Accesos de ${row.name}"><span>${row.name}</span><span class="cell-meta">${row.path}</span></button>`).join("")}</div></aside>
        <section class="report-access-detail"><div><span class="cell-meta">REPORTE</span><h2>${state.reports[0]?.name || "Reporte"}</h2><p>${state.reports[0]?.path || "/"}</p></div><div class="readonly-note">Los accesos se muestran solo como referencia; esta demostración no consulta ni modifica identidades reales.</div><table><thead><tr><th>Usuario o grupo</th><th>Roles asignados</th><th>Origen</th><th>Protección</th></tr></thead><tbody><tr><td class="cell-title">DEMO\\equipo-bi</td><td>Browser</td><td>Herencia</td><td>Solo lectura</td></tr><tr><td class="cell-title">DEMO\\operaciones-dwh</td><td>Content Manager</td><td>Directo</td><td>Simulado</td></tr></tbody></table></section>
      </div>
    </section>`;
}

export function reportRows(rows) {
  return rows.length ? rows.map(row => `<tr><td><span class="cell-title">${row.name}</span><span class="cell-meta">${row.description}</span></td><td class="wrap">${row.path}</td><td>${row.schedule}</td><td>${row.lastRefresh}</td><td>${row.lastViewed}</td><td>${status(row.status)}</td><td><button type="button" class="table-action" data-report-detail="${row.id}">Ver detalle</button></td><td><button type="button" class="table-action ${row.status === "ERROR" ? "danger" : ""}" data-report-refresh="${row.id}" ${row.id === "REP-02" ? 'id="reportTutorialTarget"' : ""}>Actualizar ahora</button></td></tr>`).join("") : tableEmpty(8, "No hay reportes para los filtros seleccionados.");
}

function identities(state) {
  return `
    ${heading("Identidades AD y roles", "Mapa ficticio de identidades y accesos publicados.")}
    <div class="readonly-note">Modo lectura. El demo no crea usuarios, modifica roles ni se conecta a Active Directory.</div>
    <section class="panel"><div class="panel-heading"><h2>Identidades y accesos</h2><span>${state.identities.length} identidades</span></div><div class="table-wrap"><table><thead><tr><th>Identidad</th><th>Tipo</th><th>Rol asociado</th><th>Ámbito</th><th>Modificado</th><th>Acción</th></tr></thead><tbody>
      ${state.identities.map(item => `<tr><td class="cell-title">${item.name}</td><td>${item.type}</td><td>${item.role}</td><td>${item.scope}</td><td>${item.modified}</td><td><button type="button" class="table-action" data-readonly-detail="Acceso de ${escapeHtml(item.name)}">Ver objetos</button></td></tr>`).join("")}
    </tbody></table></div></section>`;
}

function catalog(state) {
  return `
    ${heading("Catálogo ETL", "Registro y configuración ficticia de procesos ETL.")}
    <div class="readonly-note">Modo lectura. Los horarios disponibles son manual, hora fija y recurrencias.</div>
    <section class="panel"><div class="panel-heading"><h2>Procesos registrados</h2><span>${state.catalog.length} ETL</span></div><div class="table-wrap"><table><thead><tr><th>ID</th><th>Nombre</th><th>Capa</th><th>Tipo</th><th>Estado</th><th>Worker</th><th>Horario</th><th>Owner</th><th>Acción</th></tr></thead><tbody>
      ${state.catalog.map(item => `<tr><td>${item.id}</td><td class="cell-title">${item.name}</td><td>${item.layer}</td><td>${item.type}</td><td>${status(item.status)}</td><td>${item.worker}</td><td>${item.schedule}</td><td>${item.owner}</td><td><button type="button" class="table-action" data-readonly-detail="Proceso ${item.name}">Ver ficha</button></td></tr>`).join("")}
    </tbody></table></div></section>`;
}

function objects(state) {
  return `
    ${heading("Catálogo de objetos", "Inventario ficticio publicado por los workers de demostración.")}
    <div class="readonly-note">Modo lectura. No se otorgan ni revocan permisos desde este portafolio.</div>
    <section class="panel"><div class="panel-heading"><h2>Objetos de base de datos</h2><span>${state.objects.length} objetos</span></div><div class="panel-body"><div class="table-tools"><label>Worker<select><option>worker-demo-01</option><option>worker-demo-02</option></select></label><label>Nombre<input type="search" id="objectSearch" placeholder="Buscar objeto"></label></div></div><div class="table-wrap"><table><thead><tr><th>Tipo</th><th>Esquema</th><th>Nombre</th><th>Última modificación</th><th>Acceso</th><th>Acción</th></tr></thead><tbody id="objectRows">
      ${state.objects.map(item => `<tr><td>${item.type}</td><td>${item.schema}</td><td class="cell-title">${item.name}</td><td>${item.modified}</td><td>${item.access}</td><td><button type="button" class="table-action" data-readonly-detail="Objeto ${item.schema}.${item.name}">Ver detalle</button></td></tr>`).join("")}
    </tbody></table></div></section>`;
}

function config(state) {
  const items = Object.entries(state.config);
  return `
    ${heading("Configuración", "Parámetros visibles del escenario de demostración.")}
    <div class="readonly-note">Modo lectura. Las preferencias de tema sí se aplican localmente desde la barra superior.</div>
    <section class="panel"><div class="panel-heading"><h2>Resumen del sistema</h2><span>DEMO</span></div><div class="panel-body"><dl class="detail-list">
      ${items.map(([key, value]) => `<div><dt>${configLabel(key)}</dt><dd>${value}</dd></div>`).join("")}
    </dl></div></section>
    <section class="panel"><div class="panel-heading"><h2>Workers</h2><span>Solo lectura</span></div><div class="table-wrap"><table><thead><tr><th>Nombre</th><th>Estado</th><th>Slots</th><th>CPU</th><th>Memoria</th></tr></thead><tbody>${state.workers.map(worker => `<tr><td class="cell-title">${worker.name}</td><td>${status(worker.status)}</td><td>${worker.slots}</td><td>${worker.cpu}%</td><td>${worker.memory}%</td></tr>`).join("")}</tbody></table></div></section>`;
}

function configLabel(key) {
  return ({ runtime: "Estado del runtime", globalPause: "Pausa global", operatingWindow: "Ventana operativa", refresh: "Actualización visual", logLevel: "Nivel de registro", environment: "Entorno" })[key] || key;
}

export function renderRoute(route, state) {
  return ({
    inicio: home,
    ejecuciones: executions,
    migraciones: migrations,
    alertas: alerts,
    monitoreo: sqlMonitor,
    "report-server": reportServer,
    usuarios: identities,
    catalogo: catalog,
    "catalogo-objetos": objects,
    configuracion: config,
  })[route]?.(state) || home(state);
}

export function migrationForm(state) {
  return `
    <form class="dialog-body" id="migrationForm">
      <p>El formulario viene preparado con un reproceso breve para que puedas probar el flujo sin afectar ningún sistema.</p>
      <div class="form-grid">
        <label>Proceso<select name="process">${state.catalog.filter(item => item.status === "Activo").map(item => `<option value="${item.name}" ${item.name === "dim_clientes" ? "selected" : ""}>${item.name}</option>`).join("")}</select></label>
        <label>Modalidad<select name="mode" disabled><option>Por fechas</option></select></label>
        <label>Desde<input name="dateFrom" type="date" value="2026-09-10" min="2026-01-01" max="${DEMO_DATE}" required></label>
        <label>Hasta<input name="dateTo" type="date" value="2026-09-12" min="2026-01-01" max="${DEMO_DATE}" required></label>
        <label class="full">Motivo<textarea name="reason" rows="3" required>Demostración de reproceso para portafolio</textarea></label>
      </div>
      <div class="inline-note">Se crearán 3 cargas en asignación automática. La fecha de control real no se modifica.</div>
      <div class="dialog-actions"><button type="button" data-dialog-close>Cancelar</button><button type="submit" class="primary" id="createMigrationConfirm">Crear migración</button></div>
    </form>`;
}

export function detailDialog(title, fields) {
  return `<div class="dialog-body"><dl class="detail-list">${fields.map(([label, value]) => `<div><dt>${escapeHtml(label)}</dt><dd>${escapeHtml(value)}</dd></div>`).join("")}</dl><div class="dialog-actions"><button type="button" class="primary" data-dialog-close>Cerrar</button></div></div>`;
}
