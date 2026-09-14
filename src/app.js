import { DemoStore } from "./store.js";
import { Feedback, escapeHtml } from "./feedback.js";
import {
  ROUTES,
  renderRoute,
  executionRows,
  sqlRows,
  reportRows,
  migrationForm,
  detailDialog,
  status,
} from "./views.js";
import { Tutorial } from "./tutorial.js";

const store = new DemoStore();
const feedback = new Feedback();
const main = document.querySelector("#mainContent");
const notificationPanel = document.querySelector("#notificationPanel");
const themeOrder = ["light", "blue", "charcoal", "solarized"];
const themeNames = { light: "Blanco", blue: "Azul", charcoal: "Gris carbón", solarized: "Solarized Dark" };
const REQUEUE_PROCESSING_MS = 1800;
let currentRoute = routeFromHash();

function routeFromHash() {
  const candidate = location.hash.replace(/^#/, "") || "inicio";
  return ROUTES.has(candidate) ? candidate : "inicio";
}

function navigate(route, options = {}) {
  const next = ROUTES.has(route) ? route : "inicio";
  currentRoute = next;
  if (location.hash !== `#${next}`) history.pushState(null, "", `#${next}`);
  render();
  closeMobileMenu();
  if (options.focus !== false) main.focus({ preventScroll: true });
}

function render() {
  const state = store.getState();
  document.body.dataset.theme = state.theme;
  document.querySelector("#themeButton").setAttribute("aria-label", `Preferencias: tema ${themeNames[state.theme]}`);
  main.innerHTML = renderRoute(currentRoute, state);
  document.querySelectorAll("[data-route]").forEach(link => link.classList.toggle("active", link.dataset.route === currentRoute));
  renderNotifications();
  bindRouteControls();
}

function renderNotifications() {
  const state = store.getState();
  const severity = document.querySelector("#notificationSeverity").value || "ALL";
  const category = document.querySelector("#notificationCategory").value || "ALL";
  const items = state.notifications.filter(item =>
    (severity === "ALL" || item.severity === severity) &&
    (category === "ALL" || item.category === category)
  );
  document.querySelector("#notificationDot").hidden = !state.notifications.some(item => item.unread);
  document.querySelector("#notificationButton").setAttribute("aria-label", state.notifications.some(item => item.unread) ? "Notificaciones sin revisar" : "Notificaciones");
  document.querySelector("#notificationState").textContent = `${items.length} ${items.length === 1 ? "evento visible" : "eventos visibles"}`;
  document.querySelector("#notificationList").innerHTML = items.length ? items.map(item => `
    <button type="button" class="notification-item ${item.unread ? "unread" : ""}" data-notification="${item.id}" data-notification-title="${escapeHtml(item.title)}" data-entity="${escapeHtml(item.entity)}" data-severity="${item.severity}" data-unread="${item.unread}">
      <span class="notification-item-head"><strong>${escapeHtml(item.title)}</strong><time>${escapeHtml(item.time)}</time></span>
      <span class="notification-item-message">${escapeHtml(item.message)}</span>
      <span class="notification-item-meta">${escapeHtml(item.category)} · ${escapeHtml(item.entity)}</span>
    </button>`).join("") : '<div class="empty-state">No hay eventos para este filtro.</div>';
}

function positionNotifications() {
  const button = document.querySelector("#notificationButton");
  const rect = button.getBoundingClientRect();
  const edge = 12;
  const right = Math.max(edge, window.innerWidth - rect.right);
  const top = Math.min(window.innerHeight - 80, rect.bottom + 8);
  notificationPanel.style.right = `${Math.round(right)}px`;
  notificationPanel.style.top = `${Math.round(top)}px`;
}

function openNotifications() {
  notificationPanel.classList.add("open");
  notificationPanel.setAttribute("aria-hidden", "false");
  document.querySelector("#notificationButton").setAttribute("aria-expanded", "true");
  positionNotifications();
  store.markNotificationsRead();
  document.dispatchEvent(new CustomEvent("demo:notifications-opened"));
  requestAnimationFrame(() => notificationPanel.querySelector("button")?.focus());
}

function closeNotifications(options = {}) {
  const wasOpen = notificationPanel.classList.contains("open");
  notificationPanel.classList.remove("open");
  notificationPanel.setAttribute("aria-hidden", "true");
  document.querySelector("#notificationButton").setAttribute("aria-expanded", "false");
  if (wasOpen && options?.silent !== true) {
    document.dispatchEvent(new CustomEvent("demo:notifications-closed"));
  }
}

function closeOverlays() {
  closeNotifications();
  feedback.close(false);
}

function openMigration() {
  navigate("migraciones", { focus: false });
  const state = store.getState();
  feedback.open({
    title: "Nueva migración",
    content: migrationForm(state),
    onMount: body => {
      body.querySelector("#migrationForm").addEventListener("submit", event => {
        event.preventDefault();
        const form = new FormData(event.currentTarget);
        const values = Object.fromEntries(form.entries());
        if (values.dateFrom > values.dateTo) {
          feedback.toast("La fecha inicial debe ser anterior a la fecha final.", "error");
          return;
        }
        feedback.close(true);
        const migration = store.createMigration(values);
        feedback.toast(`${migration.id} fue creada en el escenario simulado.`);
      });
    },
  });
}

const tutorial = new Tutorial({
  navigate,
  openNotifications,
  openMigration,
  closeOverlays,
  notify: (message, tone) => feedback.toast(message, tone),
});

function bindRouteControls() {
  if (currentRoute === "ejecuciones") bindExecutionFilters();
  if (currentRoute === "migraciones") bindMigrationTabs();
  if (currentRoute === "monitoreo") bindSqlFilters();
  if (currentRoute === "report-server") {
    bindReportFilters();
    bindReportTabs();
  }
  if (currentRoute === "catalogo-objetos") bindObjectFilter();
}

function bindMigrationTabs() {
  document.querySelectorAll("[data-migration-view]").forEach(button => {
    button.addEventListener("click", () => {
      const history = button.dataset.migrationView === "history";
      document.querySelector("#migrationActiveView").hidden = history;
      document.querySelector("#migrationHistoryView").hidden = !history;
      document.querySelectorAll("[data-migration-view]").forEach(item => {
        const selected = item === button;
        item.classList.toggle("active", selected);
        item.setAttribute("aria-selected", String(selected));
      });
    });
  });
}

function bindExecutionFilters() {
  const refreshRows = () => {
    const state = store.getState();
    const search = document.querySelector("#executionSearch").value.trim().toLowerCase();
    const selectedStatus = document.querySelector("#executionStatus").value;
    const worker = document.querySelector("#executionWorker").value;
    const rows = state.executions.filter(row =>
      (!search || row.process.toLowerCase().includes(search) || row.id.toLowerCase().includes(search)) &&
      (selectedStatus === "ALL" || row.status === selectedStatus) &&
      (worker === "ALL" || row.worker === worker)
    );
    document.querySelector("#executionRows").innerHTML = executionRows(rows);
    document.querySelector("#executionCount").textContent = `${rows.length} filas`;
  };
  ["#executionSearch", "#executionStatus", "#executionWorker"].forEach(selector => {
    const control = document.querySelector(selector);
    control.addEventListener("input", refreshRows);
    control.addEventListener("change", refreshRows);
  });
  document.querySelector("#clearExecutionFilters").addEventListener("click", () => {
    document.querySelector("#executionSearch").value = "";
    document.querySelector("#executionStatus").value = "ALL";
    document.querySelector("#executionWorker").value = "ALL";
    refreshRows();
  });
}

function bindSqlFilters() {
  const refreshRows = () => {
    const state = store.getState();
    const worker = document.querySelector("#sqlWorker").value;
    const user = document.querySelector("#sqlUser").value.trim().toLowerCase();
    const hideAsgard = document.querySelector("#hideAsgardQueries").checked;
    const rows = state.sqlSessions.filter(row =>
      (worker === "ALL" || row.worker === worker) &&
      (!user || `${row.user} ${row.source || ""}`.toLowerCase().includes(user)) &&
      (!hideAsgard || !String(row.source || "").toLowerCase().includes("asgard"))
    );
    document.querySelector("#sqlRows").innerHTML = sqlRows(rows);
    document.querySelector("#sqlSessionCount").textContent = `${rows.length} ${rows.length === 1 ? "sesión" : "sesiones"}`;
  };
  ["#sqlWorker", "#sqlUser", "#hideAsgardQueries"].forEach(selector => {
    document.querySelector(selector).addEventListener("input", refreshRows);
    document.querySelector(selector).addEventListener("change", refreshRows);
  });
  document.querySelector("#clearSqlFilters").addEventListener("click", () => {
    document.querySelector("#sqlWorker").value = "ALL";
    document.querySelector("#sqlUser").value = "";
    document.querySelector("#hideAsgardQueries").checked = false;
    refreshRows();
  });
}

function bindReportFilters() {
  const refreshRows = () => {
    const state = store.getState();
    const search = document.querySelector("#reportSearch").value.trim().toLowerCase();
    const selectedStatus = document.querySelector("#reportStatus").value;
    const selectedSchedule = document.querySelector("#reportSchedule").value;
    const selectedFolder = document.querySelector("#reportFolder").value;
    const rows = state.reports.filter(row =>
      (!search || `${row.name} ${row.path}`.toLowerCase().includes(search)) &&
      (selectedStatus === "ALL" || row.status === selectedStatus) &&
      (selectedSchedule === "ALL" || (selectedSchedule === "MANUAL" ? row.schedule === "Manual" : row.schedule !== "Manual")) &&
      (selectedFolder === "ALL" || row.path.startsWith(`${selectedFolder}/`))
    );
    document.querySelector("#reportRows").innerHTML = reportRows(rows);
    document.querySelector("#reportCount").textContent = `${rows.length} reportes`;
  };
  ["#reportSearch", "#reportStatus", "#reportSchedule", "#reportFolder"].forEach(selector => {
    document.querySelector(selector).addEventListener("input", refreshRows);
    document.querySelector(selector).addEventListener("change", refreshRows);
  });
  document.querySelector("#clearReportFilters").addEventListener("click", () => {
    document.querySelector("#reportSearch").value = "";
    document.querySelector("#reportStatus").value = "ALL";
    document.querySelector("#reportSchedule").value = "ALL";
    document.querySelector("#reportFolder").value = "ALL";
    refreshRows();
  });
}

function bindReportTabs() {
  document.querySelectorAll("[data-report-view]").forEach(button => {
    button.addEventListener("click", () => {
      const access = button.dataset.reportView === "access";
      document.querySelector("#reportServerReportsPanel").hidden = access;
      document.querySelector("#reportServerAccessPanel").hidden = !access;
      document.querySelectorAll("[data-report-view]").forEach(item => {
        const selected = item === button;
        item.classList.toggle("active", selected);
        item.setAttribute("aria-selected", String(selected));
      });
    });
  });
}

function bindObjectFilter() {
  document.querySelector("#objectSearch").addEventListener("input", event => {
    const query = event.target.value.trim().toLowerCase();
    const rows = store.getState().objects.filter(item => `${item.schema}.${item.name} ${item.type}`.toLowerCase().includes(query));
    document.querySelector("#objectRows").innerHTML = rows.length ? rows.map(item => `<tr><td>${item.type}</td><td>${item.schema}</td><td class="cell-title">${item.name}</td><td>${item.modified}</td><td>${item.access}</td><td><button type="button" class="table-action" data-readonly-detail="Objeto ${item.schema}.${item.name}">Ver detalle</button></td></tr>`).join("") : '<tr><td colspan="6" class="empty-state">No hay objetos para esta búsqueda.</td></tr>';
  });
}

async function handleRequeue(id) {
  const execution = store.getState().executions.find(row => row.id === id);
  if (!execution) return;
  const confirmed = await feedback.confirm({
    title: "Reencolar ejecución",
    message: `${execution.process} volverá a la cola como un nuevo intento. Esta acción solo modifica el escenario local.`,
    confirmLabel: "Confirmar y reencolar",
  });
  if (!confirmed) return;
  const row = document.querySelector(`[data-execution-row="${CSS.escape(id)}"]`);
  const button = row?.querySelector(`[data-requeue="${CSS.escape(id)}"]`);
  const badge = row?.querySelector(".status");
  row?.classList.add("requeue-processing");
  row?.setAttribute("aria-busy", "true");
  if (button) {
    button.disabled = true;
    button.textContent = "Reencolando…";
  }
  if (badge) {
    badge.textContent = "Reencolando…";
    badge.className = "status warn requeue-status";
    badge.setAttribute("role", "status");
  }
  await new Promise(resolve => window.setTimeout(resolve, REQUEUE_PROCESSING_MS));
  if (store.requeueExecution(id)) {
    const updatedRow = document.querySelector(`[data-execution-row="${CSS.escape(id)}"]`);
    updatedRow?.classList.add("requeue-complete");
    window.setTimeout(() => updatedRow?.classList.remove("requeue-complete"), 2000);
    feedback.toast(`${execution.process} fue reencolada.`);
  }
}

function showExecutionDetail(id) {
  const row = store.getState().executions.find(item => item.id === id);
  if (!row) return;
  feedback.open({ title: `Ejecución ${row.id}`, content: detailDialog(`Ejecución ${row.id}`, [
    ["Proceso", row.process], ["Estado", statusText(row.status)], ["Capa", row.layer], ["Worker", row.worker],
    ["Fecha de proceso", row.processDate], ["Duración", row.duration], ["Detalle", row.detail],
  ]) });
}

function showSqlDetail(id) {
  const row = store.getState().sqlSessions.find(item => item.id === Number(id));
  if (!row) return;
  feedback.open({ title: `Consulta SQL · SPID ${row.id}`, content: `
    <div class="dialog-body"><dl class="detail-list"><div><dt>Usuario</dt><dd>${escapeHtml(row.user)}</dd></div><div><dt>Worker</dt><dd>${row.worker}</dd></div><div><dt>Duración</dt><dd>${row.duration}</dd></div><div><dt>Bloqueo</dt><dd>${row.blocking}</dd></div></dl>
    <label>Consulta simulada<textarea rows="7" readonly>${escapeHtml(row.query)}</textarea></label>
    <div class="dialog-actions"><button type="button" class="primary" data-dialog-close>Cerrar</button></div></div>` });
}

function showReportDetail(id) {
  const row = store.getState().reports.find(item => item.id === id);
  if (!row) return;
  feedback.open({ title: row.name, content: detailDialog(row.name, [
    ["Ruta", row.path], ["Estado", statusText(row.status)], ["Plan", row.schedule], ["Última actualización", row.lastRefresh],
    ["Última consulta", row.lastViewed], ["Descripción", row.description],
  ]) });
}

async function refreshReport(id, button) {
  const report = store.getState().reports.find(item => item.id === id);
  if (!report || button.disabled) return;
  button.disabled = true;
  button.textContent = "Actualizando…";
  await new Promise(resolve => window.setTimeout(resolve, 650));
  store.refreshReport(id);
  feedback.toast(`${report.name} se actualizó correctamente.`);
}

function selectNotification(id) {
  const item = store.getState().notifications.find(notification => notification.id === id);
  if (!item) return;
  closeNotifications({ silent: true });
  feedback.open({ title: item.title, content: detailDialog(item.title, [
    ["Categoría", item.category], ["Severidad", item.severity], ["Hora", item.time], ["Entidad", item.entity], ["Detalle", item.message],
  ]) });
  document.dispatchEvent(new CustomEvent("demo:notification-selected", { detail: { id, entity: item.entity } }));
}

function statusText(value) {
  return ({ OK: "OK", RUNNING: "En ejecución", READY: "Pendiente", REQUEUED: "Reencolada", ERROR: "Error", LATE: "Atrasada", OUTSIDE: "Fuera de cobertura", WARNING: "Advertencia" })[value] || value;
}

async function resetDemo() {
  const confirmed = await feedback.confirm({
    title: "Reiniciar demostración",
    message: "Se restaurarán ejecuciones, migraciones, reportes y notificaciones al escenario inicial. La preferencia del tutorial se conservará.",
    confirmLabel: "Reiniciar demo",
    tone: "danger",
  });
  if (!confirmed) return;
  closeNotifications();
  store.reset();
  navigate("inicio");
  feedback.toast("El escenario inicial fue restaurado.");
}

function cycleTheme() {
  const current = store.getState().theme;
  const next = themeOrder[(themeOrder.indexOf(current) + 1) % themeOrder.length];
  store.setTheme(next);
  feedback.toast(`Tema ${themeNames[next]} aplicado.`);
}

function closeMobileMenu() {
  document.body.classList.remove("menu-open");
  document.querySelector("#menuButton").setAttribute("aria-expanded", "false");
}

document.addEventListener("click", event => {
  const routeLink = event.target.closest("[data-route]");
  if (routeLink) {
    event.preventDefault();
    navigate(routeLink.dataset.route);
    return;
  }
  const requeue = event.target.closest("[data-requeue]");
  if (requeue) return void handleRequeue(requeue.dataset.requeue);
  const executionDetail = event.target.closest("[data-execution-detail]");
  if (executionDetail) return showExecutionDetail(executionDetail.dataset.executionDetail);
  const sqlDetail = event.target.closest("[data-sql-detail]");
  if (sqlDetail) return showSqlDetail(sqlDetail.dataset.sqlDetail);
  const reportDetail = event.target.closest("[data-report-detail]");
  if (reportDetail) return showReportDetail(reportDetail.dataset.reportDetail);
  const reportRefresh = event.target.closest("[data-report-refresh]");
  if (reportRefresh) return void refreshReport(reportRefresh.dataset.reportRefresh, reportRefresh);
  const readonly = event.target.closest("[data-readonly-detail]");
  if (readonly) return feedback.open({ title: readonly.dataset.readonlyDetail, content: '<div class="dialog-body"><p>Esta ficha usa datos ficticios y permanece en modo lectura dentro del portafolio.</p><div class="dialog-actions"><button type="button" class="primary" data-dialog-close>Cerrar</button></div></div>' });
  const notification = event.target.closest("[data-notification]");
  if (notification) return selectNotification(notification.dataset.notification);
  if (event.target.closest("#newMigrationButton")) openMigration();
});

document.querySelector("#notificationButton").addEventListener("click", () => notificationPanel.classList.contains("open") ? closeNotifications() : openNotifications());
document.querySelector("#closeNotifications").addEventListener("click", closeNotifications);
document.querySelector("#notificationSeverity").addEventListener("change", renderNotifications);
document.querySelector("#notificationCategory").addEventListener("change", renderNotifications);
document.querySelector("#toggleNotificationFilters").addEventListener("click", event => {
  const tools = document.querySelector("#notificationTools");
  const show = tools.hidden;
  tools.hidden = !show;
  event.currentTarget.setAttribute("aria-expanded", String(show));
  event.currentTarget.setAttribute("aria-label", show ? "Ocultar filtros" : "Mostrar filtros");
  event.currentTarget.title = show ? "Ocultar filtros" : "Mostrar filtros";
});
document.querySelector("#resetNotificationFilters").addEventListener("click", () => {
  document.querySelector("#notificationCategory").value = "ALL";
  document.querySelector("#notificationSeverity").value = "ALL";
  renderNotifications();
});
document.querySelector("#tutorialButton").addEventListener("click", () => tutorial.start());
document.querySelector("#themeButton").addEventListener("click", cycleTheme);
document.querySelector("#resetButton").addEventListener("click", resetDemo);
document.querySelector("#menuButton").addEventListener("click", () => {
  const open = document.body.classList.toggle("menu-open");
  document.querySelector("#menuButton").setAttribute("aria-expanded", String(open));
});

document.addEventListener("pointerdown", event => {
  if (!notificationPanel.classList.contains("open")) return;
  if (!notificationPanel.contains(event.target) && !event.target.closest("#notificationButton")) closeNotifications();
});

window.addEventListener("hashchange", () => {
  currentRoute = routeFromHash();
  render();
});

window.addEventListener("popstate", () => {
  currentRoute = routeFromHash();
  render();
});

window.addEventListener("resize", () => {
  if (notificationPanel.classList.contains("open")) positionNotifications();
});

store.addEventListener("change", render);

render();
window.setTimeout(() => {
  if (tutorial.shouldAutoStart()) tutorial.start();
}, 700);
