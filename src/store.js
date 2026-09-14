import { createInitialState } from "./data.js";

const SESSION_KEY = "asgardDemoStateV1";

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function readSession() {
  try {
    const stored = JSON.parse(sessionStorage.getItem(SESSION_KEY) || "null");
    if (stored?.version === 1) return stored;
  } catch {
    sessionStorage.removeItem(SESSION_KEY);
  }
  return createInitialState();
}

export class DemoStore extends EventTarget {
  constructor() {
    super();
    this.state = readSession();
  }

  getState() {
    return clone(this.state);
  }

  commit(type, detail = {}) {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(this.state));
    this.dispatchEvent(new CustomEvent("change", { detail: { type, ...detail } }));
    document.dispatchEvent(new CustomEvent(`demo:${type}`, { detail }));
  }

  requeueExecution(id) {
    const execution = this.state.executions.find(row => row.id === id && row.status === "ERROR");
    if (!execution) return false;
    execution.status = "REQUEUED";
    execution.duration = "En cola";
    execution.detail = "Reencolada manualmente desde la demostración.";
    this.state.summary.failed = Math.max(0, this.state.summary.failed - 1);
    this.state.summary.pending += 1;
    this.state.notifications.unshift({
      id: `NOT-${905 + this.state.notifications.length}`,
      severity: "INFO",
      category: "ETL",
      title: "Ejecución reencolada",
      message: `${execution.process} quedó lista para un nuevo intento.`,
      time: "09:43",
      unread: true,
      route: "ejecuciones",
      entity: execution.id,
    });
    this.state.notificationRead = false;
    this.state.lastUpdated = "09:43";
    this.commit("execution-requeued", { id });
    return true;
  }

  createMigration(values) {
    const nextNumber = Math.max(...this.state.migrations.map(item => Number(item.id.replace("MIG-", "")))) + 1;
    const migration = {
      id: `MIG-${nextNumber}`,
      mode: "Por fechas",
      period: `${values.dateFrom} al ${values.dateTo}`,
      status: "READY",
      progress: 0,
      completed: 0,
      total: 3,
      current: values.process,
      worker: "Asignación automática",
      created: "09:44",
    };
    this.state.migrations.unshift(migration);
    this.state.notifications.unshift({
      id: `NOT-${905 + this.state.notifications.length}`,
      severity: "INFO",
      category: "MIGRATION",
      title: "Migración creada",
      message: `${migration.id} quedó preparada con 3 cargas.`,
      time: "09:44",
      unread: true,
      route: "migraciones",
      entity: migration.id,
    });
    this.state.notificationRead = false;
    this.state.lastUpdated = "09:44";
    this.commit("migration-created", { id: migration.id });
    return migration;
  }

  markNotificationsRead() {
    this.state.notifications.forEach(item => { item.unread = false; });
    this.state.notificationRead = true;
    this.commit("notifications-read");
  }

  refreshReport(id) {
    const report = this.state.reports.find(item => item.id === id);
    if (!report) return false;
    report.status = "OK";
    report.lastRefresh = "Ahora";
    this.state.notifications.unshift({
      id: `NOT-${905 + this.state.notifications.length}`,
      severity: "INFO",
      category: "REPORT",
      title: "Reporte actualizado",
      message: `${report.name} completó una actualización simulada.`,
      time: "09:45",
      unread: true,
      route: "report-server",
      entity: report.id,
    });
    this.state.notificationRead = false;
    this.state.lastUpdated = "09:45";
    this.commit("report-refreshed", { id });
    return true;
  }

  setTheme(theme) {
    this.state.theme = theme;
    this.commit("theme-changed", { theme });
  }

  reset() {
    this.state = createInitialState();
    sessionStorage.removeItem(SESSION_KEY);
    this.commit("reset");
  }
}
