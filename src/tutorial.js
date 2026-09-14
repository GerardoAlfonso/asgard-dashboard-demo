const COMPLETE_KEY = "asgardDemoTutorialCompletedV1";
const ACTION_SETTLE_MS = 2000;
const PAGE_PAUSE_MS = 2000;

export class Tutorial {
  constructor(actions) {
    this.actions = actions;
    this.layer = document.querySelector("#tourLayer");
    this.card = document.querySelector("#tourCard");
    this.title = document.querySelector("#tourTitle");
    this.body = document.querySelector("#tourBody");
    this.progress = document.querySelector("#tourProgress");
    this.instruction = document.querySelector("#tourInstruction");
    this.previous = document.querySelector("#tourPrevious");
    this.next = document.querySelector("#tourNext");
    this.exit = document.querySelector("#tourExit");
    this.index = 0;
    this.active = false;
    this.target = null;
    this.returnFocus = null;
    this.eventCleanup = null;
    this.resizeFrame = null;
    this.advanceTimer = null;
    this.contextTarget = null;
    this.placement = "auto";
    this.phaseIndex = 0;
    this.welcoming = false;
    this.mode = "idle";

    this.steps = [
      {
        id: "overview",
        route: "inicio",
        target: "#operationalOverview",
        title: "Estado general",
        body: "Inicio concentra la cobertura del día, las cargas que necesitan atención, la capacidad de los workers y la salud de los servicios.",
      },
      {
        id: "executions",
        route: "ejecuciones",
        target: "#executionWorkspace",
        title: "Monitorear ejecuciones",
        body: "Aquí puedes buscar un proceso, filtrar por estado o worker y revisar cada intento sin perder el contexto de la operación diaria.",
      },
      {
        id: "requeue",
        route: "ejecuciones",
        target: '[data-requeue="EX-2407"]',
        fallbackTarget: '[data-execution-row="EX-2407"]',
        title: "Reencolar una carga",
        body: "Una ejecución con error puede enviarse de nuevo a la cola. La demostración actualizará la fila y registrará una notificación.",
        instruction: "Selecciona Reencolar y confirma la acción para continuar.",
        expectedEvent: "demo:execution-requeued",
        afterEventTarget: '[data-execution-row="EX-2407"] .status',
        completionInstruction: "La ejecución ya está en cola. Observa el cambio antes de continuar.",
        manualAdvanceAfterEvent: true,
      },
      {
        id: "notifications",
        route: "ejecuciones",
        title: "Revisar notificaciones",
        body: "La bandeja reúne eventos operativos y conserva enlaces hacia el módulo relacionado. Los avisos nuevos se destacan hasta abrirla.",
        phases: [
          {
            target: "#notificationButton",
            contextTarget: ".topbar",
            instruction: "Abre la bandeja desde el botón de notificaciones.",
            expectedEvent: "demo:notifications-opened",
          },
          {
            target: '#notificationList [data-notification-title="Ejecución reencolada"]',
            contextTarget: "#notificationPanel",
            instruction: "Abre la notificación «Ejecución reencolada» para continuar.",
            expectedEvent: "demo:notification-selected",
            expectedEntity: "EX-2407",
            completionInstruction: "Este es el registro generado por el reencolado. Revisa el detalle un momento.",
            allowManualAdvance: true,
            resetEvent: "demo:notifications-closed",
            resetPhase: 0,
            placement: "left",
          },
        ],
      },
      {
        id: "migrations",
        route: "migraciones",
        target: "#migrationForm",
        title: "Crear una migración",
        body: "Las migraciones permiten reprocesar una fecha o un rango usando la configuración vigente del ETL. Este formulario ya contiene un ejemplo seguro.",
        instruction: "Revisa el resumen y selecciona Crear migración.",
        expectedEvent: "demo:migration-created",
        completionInstruction: "La migración quedó registrada. Observa el nuevo elemento antes de continuar.",
        beforeEnter: () => this.actions.openMigration(),
      },
      {
        id: "sql",
        route: "monitoreo",
        target: "#sqlMonitorWorkspace",
        title: "Monitorear procesos SQL",
        body: "La vista reúne sesiones por worker, duración, consumo y bloqueos. Puedes abrir una consulta, pero el demo mantiene deshabilitadas las acciones destructivas.",
      },
      {
        id: "reports",
        route: "report-server",
        target: "#reportTutorialTarget",
        title: "Monitorear Report Server",
        body: "El inventario muestra planes, última actualización, última consulta y estado vigente de cada reporte.",
        instruction: "Selecciona Actualizar ahora en Inventario operativo.",
        expectedEvent: "demo:report-refreshed",
        afterEventTarget: "#reportTutorialTarget",
        completionInstruction: "La actualización terminó. Observa el estado antes de continuar.",
      },
      {
        id: "finish",
        route: "inicio",
        target: "#demoActions",
        title: "Explora el resto del dashboard",
        body: "También puedes revisar alertas, identidades, catálogos y configuración. Ver tutorial repite esta guía y Reiniciar demo restaura el escenario inicial.",
      },
    ];

    this.next.addEventListener("click", () => this.advance());
    this.previous.addEventListener("click", () => this.go(-1));
    this.exit.addEventListener("click", () => this.stop(false, this.welcoming));
    document.addEventListener("keydown", event => this.onKeydown(event));
    window.addEventListener("resize", () => this.schedulePosition());
    window.addEventListener("scroll", () => this.schedulePosition(), true);
  }

  shouldAutoStart() {
    return localStorage.getItem(COMPLETE_KEY) !== "true";
  }

  start() {
    if (this.active) return;
    this.active = true;
    this.returnFocus = document.activeElement;
    this.index = 0;
    this.phaseIndex = 0;
    this.welcoming = true;
    this.mode = "welcome";
    this.layer.hidden = false;
    this.card.hidden = false;
    this.showWelcome();
  }

  showWelcome() {
    this.cleanupStep();
    this.actions.closeOverlays();
    this.mode = "welcome";
    this.layer.classList.remove("tour-preview");
    this.card.classList.remove("tour-card-preview");
    this.progress.textContent = "Bienvenido";
    this.title.textContent = "Conoce Asgard";
    this.body.textContent = "Asgard centraliza la programación, ejecución y monitoreo de procesos ETL para que la operación pueda detectar fallas, administrar reprocesos y seguir cada carga desde un mismo lugar.";
    this.instruction.hidden = false;
    this.instruction.textContent = "¿Deseas realizar una visita guiada?";
    this.instruction.classList.add("tour-question");
    this.previous.hidden = true;
    this.exit.textContent = "Ahora no";
    this.next.textContent = "Iniciar visita";
    this.next.disabled = false;
    this.card.style.top = "50%";
    this.card.style.left = "50%";
    this.card.style.transform = "translate(-50%, -50%)";
    this.next.focus({ preventScroll: true });
  }

  begin() {
    if (!this.active || !this.welcoming) return;
    this.welcoming = false;
    this.phaseIndex = 0;
    this.showPreview("home");
  }

  advance() {
    if (!this.active) return;
    if (this.welcoming) {
      this.begin();
      return;
    }
    this.go(1);
  }

  async showPreview(kind) {
    this.cleanupStep();
    this.actions.closeOverlays();
    this.layer.classList.remove("tour-navigation");
    const home = kind === "home";
    this.mode = home ? "home-preview" : "migration-preview";
    this.actions.navigate(home ? "inicio" : "migraciones", { focus: false });
    await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    if (!this.active || this.mode !== `${home ? "home" : "migration"}-preview`) return;

    this.layer.classList.add("tour-preview");
    this.card.classList.add("tour-card-preview");
    this.progress.textContent = "Vista previa";
    this.title.textContent = home ? "Este es Asgard" : "Esta es la página Migraciones";
    this.body.textContent = home
      ? "Esta es la vista de Inicio de Asgard. Aquí puedes apreciar el estado general de la operación antes de revisar cada componente."
      : "Esta vista reúne las migraciones activas y su historial. Puedes revisar la página completa antes de recorrer sus componentes.";
    this.instruction.hidden = true;
    this.instruction.textContent = "";
    this.instruction.classList.remove("tour-question");
    this.previous.hidden = false;
    this.previous.disabled = false;
    this.exit.textContent = "Salir";
    this.next.textContent = "Siguiente";
    this.next.disabled = false;
    this.next.focus({ preventScroll: true });
  }

  async showMigrationLink({ pause = false } = {}) {
    this.cleanupStep();
    this.actions.closeOverlays();
    this.layer.classList.remove("tour-preview");
    this.layer.classList.add("tour-navigation");
    this.card.classList.remove("tour-card-preview");
    if (pause) {
      this.mode = "migration-link-pause";
      this.layer.hidden = true;
      this.card.hidden = true;
      await new Promise(resolve => {
        this.advanceTimer = window.setTimeout(resolve, PAGE_PAUSE_MS);
      });
      this.advanceTimer = null;
      if (!this.active || this.mode !== "migration-link-pause") return;
    }
    this.mode = "migration-link";
    this.layer.hidden = false;
    this.card.hidden = false;
    await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    if (!this.active || this.mode !== "migration-link") return;

    this.target = document.querySelector('[data-route="migraciones"]');
    if (!this.target) {
      this.showPreview("migration");
      return;
    }
    this.target.classList.add("tour-target");
    this.target.scrollIntoView({ block: "center", behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
    this.progress.textContent = "Siguiente sección";
    this.title.textContent = "Página Migraciones";
    this.body.textContent = "Migraciones permite reprocesar una fecha o un rango de fechas con la configuración vigente de cada ETL, además de consultar el avance y el historial de los reprocesos.";
    this.instruction.hidden = false;
    this.instruction.textContent = "Selecciona Siguiente para abrir esta página.";
    this.instruction.classList.remove("tour-question");
    this.previous.hidden = false;
    this.previous.disabled = false;
    this.exit.textContent = "Salir";
    this.next.textContent = "Siguiente";
    this.next.disabled = false;
    this.card.style.transform = "";
    this.next.focus({ preventScroll: true });
    this.schedulePosition();
  }

  stop(completed, remember = completed) {
    if (!this.active) return;
    this.cleanupStep();
    this.active = false;
    this.welcoming = false;
    this.mode = "idle";
    this.layer.hidden = true;
    this.card.hidden = true;
    this.layer.classList.remove("tour-preview", "tour-navigation");
    this.card.classList.remove("tour-card-preview");
    this.actions.closeOverlays();
    if (remember) localStorage.setItem(COMPLETE_KEY, "true");
    this.returnFocus?.focus?.();
    if (completed) this.actions.notify("Tutorial completado. Puedes repetirlo cuando quieras.");
  }

  async showStep() {
    this.cleanupStep();
    this.mode = "step";
    this.layer.classList.remove("tour-preview", "tour-navigation");
    this.card.classList.remove("tour-card-preview");
    const step = this.steps[this.index];
    this.phaseIndex = 0;
    this.actions.closeOverlays();
    this.actions.navigate(step.route, { focus: false });
    await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    step.beforeEnter?.();
    await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));

    this.activateStep(step);
  }

  currentStage(step) {
    return step.phases?.[this.phaseIndex] ? { ...step, ...step.phases[this.phaseIndex] } : step;
  }

  activateStep(step) {
    const stage = this.currentStage(step);

    this.target = document.querySelector(stage.target) || (stage.fallbackTarget && document.querySelector(stage.fallbackTarget));
    if (!this.target) {
      this.actions.notify("El elemento del tutorial no está disponible; se avanzó al siguiente paso.", "error");
      this.go(1);
      return;
    }
    this.contextTarget = stage.contextTarget ? document.querySelector(stage.contextTarget) : null;
    this.placement = stage.placement || "auto";
    this.contextTarget?.classList.add("tour-context");
    this.target.classList.add("tour-target");
    this.target.scrollIntoView({ block: "center", behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });

    this.progress.textContent = `Paso ${this.index + 1} de ${this.steps.length}`;
    this.title.textContent = stage.title;
    this.body.textContent = stage.body;
    this.instruction.classList.remove("tour-question");
    this.instruction.hidden = !stage.instruction;
    this.instruction.textContent = stage.instruction || "";
    this.previous.hidden = false;
    this.previous.disabled = this.index === 0;
    this.exit.textContent = "Salir";
    this.next.textContent = this.index === this.steps.length - 1 ? "Finalizar" : "Siguiente";
    this.next.disabled = Boolean(stage.expectedEvent && this.target.matches(stage.target) && !stage.allowManualAdvance);
    this.card.style.transform = "";

    if (stage.expectedEvent && this.target.matches(stage.target)) {
      const listeners = [];
      const cleanupEvents = () => listeners.forEach(([name, listener]) => document.removeEventListener(name, listener));
      const handler = event => {
        if (stage.expectedEntity && event.detail?.entity !== stage.expectedEntity) return;
        cleanupEvents();
        if (this.eventCleanup === cleanupEvents) this.eventCleanup = null;
        if (step.phases && this.phaseIndex < step.phases.length - 1) {
          this.phaseIndex += 1;
          this.next.disabled = !this.currentStage(step).allowManualAdvance;
          this.showPhase(step);
          return;
        }
        this.waitForAction(stage);
      };
      document.addEventListener(stage.expectedEvent, handler);
      listeners.push([stage.expectedEvent, handler]);
      if (stage.resetEvent) {
        const resetHandler = () => {
          cleanupEvents();
          if (this.eventCleanup === cleanupEvents) this.eventCleanup = null;
          this.next.disabled = true;
          this.phaseIndex = stage.resetPhase ?? 0;
          this.showPhase(step);
        };
        document.addEventListener(stage.resetEvent, resetHandler);
        listeners.push([stage.resetEvent, resetHandler]);
      }
      this.eventCleanup = cleanupEvents;
      this.target.focus?.({ preventScroll: true });
    } else {
      this.next.focus({ preventScroll: true });
    }
    this.schedulePosition();
  }

  async showPhase(step) {
    const stepIndex = this.index;
    const phaseIndex = this.phaseIndex;
    this.clearHighlight();
    await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    if (!this.active || this.index !== stepIndex || this.phaseIndex !== phaseIndex) return;
    this.activateStep(step);
  }

  waitForAction(stage) {
    this.next.disabled = true;
    this.previous.disabled = true;
    if (stage.completionInstruction) {
      this.instruction.hidden = false;
      this.instruction.textContent = stage.completionInstruction;
    }
    if (stage.afterEventTarget) {
      this.clearHighlight();
      this.target = document.querySelector(stage.afterEventTarget);
      this.target?.classList.add("tour-target");
      this.schedulePosition();
    }
    if (stage.manualAdvanceAfterEvent) {
      this.next.disabled = false;
      this.next.focus({ preventScroll: true });
      return;
    }
    this.advanceTimer = window.setTimeout(() => this.go(1), ACTION_SETTLE_MS);
  }

  go(delta) {
    if (!this.active) return;
    if (this.mode === "home-preview") {
      if (delta < 0) {
        this.welcoming = true;
        this.showWelcome();
      } else {
        this.index = 0;
        this.showStep();
      }
      return;
    }
    if (this.mode === "migration-link") {
      if (delta < 0) {
        this.index = 3;
        this.showStep();
      } else {
        this.showPreview("migration");
      }
      return;
    }
    if (this.mode === "migration-preview") {
      if (delta < 0) this.showMigrationLink();
      else {
        this.index = 4;
        this.showStep();
      }
      return;
    }
    if (delta < 0 && this.index === 0) {
      this.showPreview("home");
      return;
    }
    if (delta > 0 && this.index === 3) {
      this.showMigrationLink({ pause: true });
      return;
    }
    if (delta > 0 && this.index === this.steps.length - 1) {
      this.stop(true);
      return;
    }
    this.index = Math.max(0, Math.min(this.steps.length - 1, this.index + delta));
    this.showStep();
  }

  cleanupStep() {
    this.eventCleanup?.();
    this.eventCleanup = null;
    window.clearTimeout(this.advanceTimer);
    this.advanceTimer = null;
    this.clearHighlight();
  }

  clearHighlight() {
    this.target?.classList.remove("tour-target");
    this.contextTarget?.classList.remove("tour-context");
    this.target = null;
    this.contextTarget = null;
    this.placement = "auto";
  }

  schedulePosition() {
    if (!this.active) return;
    cancelAnimationFrame(this.resizeFrame);
    this.resizeFrame = requestAnimationFrame(() => this.position());
  }

  position() {
    if (!this.target) return;
    const target = this.target.getBoundingClientRect();
    const card = this.card.getBoundingClientRect();
    const margin = 14;
    if (this.placement === "left") {
      const left = target.left - card.width - margin;
      if (left >= margin) {
        const top = Math.max(margin, Math.min(window.innerHeight - card.height - margin, target.top));
        this.card.style.top = `${Math.round(top)}px`;
        this.card.style.left = `${Math.round(left)}px`;
        return;
      }
    }
    let top = target.bottom + margin;
    let left = Math.min(window.innerWidth - card.width - margin, Math.max(margin, target.left));
    if (top + card.height > window.innerHeight - margin) top = target.top - card.height - margin;
    if (top < margin) {
      top = Math.max(margin, (window.innerHeight - card.height) / 2);
      left = Math.max(margin, Math.min(window.innerWidth - card.width - margin, target.right + margin));
      if (left + card.width > window.innerWidth - margin) left = Math.max(margin, target.left - card.width - margin);
    }
    this.card.style.top = `${Math.round(top)}px`;
    this.card.style.left = `${Math.round(left)}px`;
  }

  onKeydown(event) {
    if (!this.active || this.card.hidden || !document.querySelector("#dialogBackdrop").hidden) return;
    if (event.key === "Escape") this.stop(false, this.welcoming);
    if (event.key === "ArrowLeft" && !this.welcoming && !this.previous.disabled) this.go(-1);
    if (event.key === "ArrowRight" && !this.next.disabled) this.advance();
    if (event.key !== "Tab") return;
    const controls = [...this.card.querySelectorAll("button:not(:disabled)")];
    if (!controls.length) return;
    const first = controls[0];
    const last = controls.at(-1);
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }
}
