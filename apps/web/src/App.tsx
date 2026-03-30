import { FormEvent, useEffect, useState } from "react";
import { NavLink, useLocation } from "react-router-dom";

type SafeUser = {
  id: string;
  email: string;
  name: string;
  isAdmin: boolean;
  createdAt: string;
};

type DashboardResponse = {
  summary: {
    activeProjects: number;
    openTasks: number;
    pinnedNotes: number;
    llmSessionsToday: number;
  };
  highlights: string[];
};

const navigation = [
  { label: "Dashboard", path: "/" },
  { label: "Projects", path: "/projects" },
  { label: "Tasks", path: "/tasks" },
  { label: "Notes", path: "/notes" },
  { label: "LLM", path: "/llm" },
  { label: "Resources", path: "/resources" },
  { label: "Actions", path: "/actions" },
];

const pageContent: Record<string, { eyebrow: string; title: string; description: string }> = {
  "/": {
    eyebrow: "Dashboard",
    title: "Welcome back",
    description:
      "This is the protected application shell for the SDD foundation stage. The next step is plugging real modules into these cards.",
  },
  "/projects": {
    eyebrow: "Projects",
    title: "Projects module is next",
    description:
      "This route is now stable and protected. The next implementation pass will replace this placeholder with real projects CRUD.",
  },
  "/tasks": {
    eyebrow: "Tasks",
    title: "Tasks workspace",
    description:
      "Navigation now stays inside the SPA, so your session survives while we build the actual tasks module.",
  },
  "/notes": {
    eyebrow: "Notes",
    title: "Notes and docs",
    description:
      "The auth shell is ready for markdown notes, docs and runbooks from the next SDD stage.",
  },
  "/llm": {
    eyebrow: "LLM",
    title: "LLM usage area",
    description:
      "This section will hold session logging, burn summaries and forecast widgets after the core entities land.",
  },
  "/resources": {
    eyebrow: "Resources",
    title: "Resources and billing",
    description:
      "Protected routing is in place, so later billing and renewal data can sit behind the same authenticated shell.",
  },
  "/actions": {
    eyebrow: "Actions",
    title: "Runtime actions",
    description:
      "Safe operational actions will live here once the project modules and allowlisted scripts are wired in.",
  },
};

const summaryCards = [
  {
    key: "activeProjects",
    title: "Active projects",
  },
  {
    key: "openTasks",
    title: "Open tasks",
  },
  {
    key: "pinnedNotes",
    title: "Pinned notes",
  },
  {
    key: "llmSessionsToday",
    title: "LLM sessions today",
  },
] as const;

const initialForm = {
  email: "",
  password: "",
};

async function requestJson<T>(path: string, init?: RequestInit) {
  const response = await fetch(path, {
    ...init,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => ({ message: "Request failed." }));
    throw new Error(payload.message ?? "Request failed.");
  }

  if (response.status === 204) {
    return null as T;
  }

  return (await response.json()) as T;
}

export function App() {
  const location = useLocation();
  const [form, setForm] = useState(initialForm);
  const [user, setUser] = useState<SafeUser | null>(null);
  const [dashboard, setDashboard] = useState<DashboardResponse | null>(null);
  const [isBooting, setIsBooting] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const currentPage = pageContent[location.pathname] ?? pageContent["/"];

  useEffect(() => {
    const bootstrap = async () => {
      try {
        const me = await requestJson<{ user: SafeUser }>("/api/auth/me");
        setUser(me.user);
      } catch {
        setUser(null);
      } finally {
        setIsBooting(false);
      }
    };

    void bootstrap();
  }, []);

  useEffect(() => {
    if (!user) {
      setDashboard(null);
      return;
    }

    const loadDashboard = async () => {
      try {
        const response = await requestJson<DashboardResponse>("/api/dashboard");
        setDashboard(response);
      } catch (error) {
        setErrorMessage(error instanceof Error ? error.message : "Failed to load dashboard.");
      }
    };

    void loadDashboard();
  }, [user]);

  async function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage(null);
    setIsSubmitting(true);

    try {
      const response = await requestJson<{ user: SafeUser }>("/api/auth/login", {
        method: "POST",
        body: JSON.stringify(form),
      });

      setUser(response.user);
      setForm(initialForm);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Login failed.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleLogout() {
    setIsSubmitting(true);

    try {
      await requestJson("/api/auth/logout", {
        method: "POST",
      });
      setUser(null);
      setDashboard(null);
      setErrorMessage(null);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Logout failed.");
    } finally {
      setIsSubmitting(false);
    }
  }

  if (isBooting) {
    return (
      <main className="screen-center">
        <div className="panel panel-narrow">
          <p className="eyebrow">Booting</p>
          <h1>Loading cockpit session</h1>
          <p className="muted">Checking whether a local admin session already exists.</p>
        </div>
      </main>
    );
  }

  if (!user) {
    return (
      <main className="screen-center">
        <section className="panel auth-panel">
          <div>
            <p className="eyebrow">Stage 1</p>
            <h1>Sign in to work.rodion.pro</h1>
            <p className="muted">
              Local admin auth is now active. Use the email and password seeded from your
              environment settings.
            </p>
          </div>

          <form className="auth-form" onSubmit={handleLogin}>
            <label>
              Email
              <input
                type="email"
                value={form.email}
                onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
                placeholder="admin@work.rodion.pro"
                autoComplete="username"
                required
              />
            </label>
            <label>
              Password
              <input
                type="password"
                value={form.password}
                onChange={(event) =>
                  setForm((current) => ({ ...current, password: event.target.value }))
                }
                placeholder="Your admin password"
                autoComplete="current-password"
                required
              />
            </label>
            {errorMessage ? <p className="error-text">{errorMessage}</p> : null}
            <button type="submit" className="primary-button" disabled={isSubmitting}>
              {isSubmitting ? "Signing in..." : "Sign in"}
            </button>
          </form>
        </section>
      </main>
    );
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div>
          <p className="eyebrow">Operational cockpit</p>
          <h1>work.rodion.pro</h1>
          <p className="muted sidebar-copy">
            Protected shell is live. Next modules can now sit on top of real auth and database
            plumbing.
          </p>
        </div>
        <nav>
          {navigation.map((item) => (
            <NavLink
              to={item.path}
              key={item.path}
              className={({ isActive }) => `nav-link${isActive ? " nav-link-active" : ""}`}
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
      </aside>

      <main className="content">
        <header className="hero hero-row">
          <div>
            <p className="eyebrow">{currentPage.eyebrow}</p>
            <h2>
              {currentPage.title}
              {location.pathname === "/" ? `, ${user.name}` : ""}
            </h2>
            <p className="hero-copy">{currentPage.description}</p>
          </div>
          <div className="hero-actions">
            <div className="user-chip">
              <span>{user.email}</span>
              <span className="user-role">{user.isAdmin ? "Admin" : "User"}</span>
            </div>
            <button type="button" className="ghost-button" onClick={handleLogout} disabled={isSubmitting}>
              {isSubmitting ? "Working..." : "Logout"}
            </button>
          </div>
        </header>

        {errorMessage ? <p className="error-banner">{errorMessage}</p> : null}

        <section className="metrics-grid">
          {summaryCards.map((card) => (
            <article className="card metric-card" key={card.key}>
              <p className="metric-label">{card.title}</p>
              <strong>{dashboard?.summary[card.key] ?? 0}</strong>
            </article>
          ))}
        </section>

        <section className="card-grid">
          <article className="card">
            <p className="eyebrow">Acceptance</p>
            <h3>Foundation stage progress</h3>
            <p className="muted">
              Auth, protected routes, environment config and a migration entry point are now wired.
            </p>
          </article>
          <article className="card">
            <p className="eyebrow">Backend</p>
            <h3>Database-ready API</h3>
            <p className="muted">
              Drizzle schema includes users and sessions, which is enough to support the first
              secured application pass.
            </p>
          </article>
          <article className="card">
            <p className="eyebrow">Next</p>
            <h3>Projects, tasks, notes</h3>
            <p className="muted">
              The next major slice can focus on product entities instead of infrastructure cleanup.
            </p>
          </article>
        </section>

        <section className="panel highlight-panel">
          <p className="eyebrow">Highlights</p>
          <h3>Protected shell status</h3>
          <ul className="highlight-list">
            {(dashboard?.highlights ?? []).map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </section>
      </main>
    </div>
  );
}
