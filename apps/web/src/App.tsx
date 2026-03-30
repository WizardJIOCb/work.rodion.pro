import { FormEvent, useEffect, useMemo, useState } from "react";
import { matchPath, NavLink, useLocation, useNavigate } from "react-router-dom";

type SafeUser = { id: string; email: string; name: string; isAdmin: boolean; createdAt: string };
type DashboardResponse = {
  summary: { activeProjects: number; openTasks: number; pinnedNotes: number; llmSessionsToday: number };
  highlights: string[];
};
type Project = {
  id: string;
  slug: string;
  name: string;
  description: string;
  color: string;
  status: "active" | "paused" | "archived";
  repoUrl: string;
  siteUrl: string;
  updatedAt: string;
};
type Task = {
  id: string;
  projectId: string;
  projectName?: string;
  title: string;
  descriptionMd: string;
  status: "todo" | "doing" | "blocked" | "done" | "cancelled";
  priority: "low" | "medium" | "high" | "critical";
  kind: "feature" | "bug" | "ops" | "research" | "idea" | "content" | "other";
  dueDate: string | null;
};
type Note = {
  id: string;
  projectId: string;
  projectName?: string;
  title: string;
  slug: string;
  kind: "note" | "doc" | "runbook" | "meeting" | "idea" | "postmortem" | "reference";
  contentMd: string;
  isPinned: boolean;
  updatedAt: string;
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

const initialLogin = { email: "", password: "" };
const initialProject = { name: "", slug: "", description: "", color: "#4d8eff", status: "active" as Project["status"], repoUrl: "", siteUrl: "" };
const initialTask = { projectId: "", title: "", descriptionMd: "", status: "todo" as Task["status"], priority: "medium" as Task["priority"], kind: "feature" as Task["kind"], dueDate: "" };
const initialNote = { projectId: "", title: "", slug: "", kind: "note" as Note["kind"], contentMd: "", isPinned: false };

async function requestJson<T>(path: string, init?: RequestInit) {
  const response = await fetch(path, {
    ...init,
    credentials: "include",
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
  });
  if (!response.ok) {
    const payload = await response.json().catch(() => ({ message: "Request failed." }));
    throw new Error(payload.message ?? "Request failed.");
  }
  if (response.status === 204) return null as T;
  return (await response.json()) as T;
}

export function App() {
  const location = useLocation();
  const navigate = useNavigate();
  const projectMatch = matchPath("/projects/:slug", location.pathname);
  const [loginForm, setLoginForm] = useState(initialLogin);
  const [projectForm, setProjectForm] = useState(initialProject);
  const [taskForm, setTaskForm] = useState(initialTask);
  const [noteForm, setNoteForm] = useState(initialNote);
  const [user, setUser] = useState<SafeUser | null>(null);
  const [dashboard, setDashboard] = useState<DashboardResponse | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [editingProjectId, setEditingProjectId] = useState<string | null>(null);
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [showNoteForm, setShowNoteForm] = useState(false);
  const [noteSearch, setNoteSearch] = useState("");
  const [noteKindFilter, setNoteKindFilter] = useState<Note["kind"] | "all">("all");
  const [previewNoteId, setPreviewNoteId] = useState<string | null>(null);
  const [isBooting, setIsBooting] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const selectedProject = useMemo(() => projects.find((item) => item.slug === projectMatch?.params.slug) ?? null, [projectMatch?.params.slug, projects]);
  const projectTasks = selectedProject ? tasks.filter((item) => item.projectId === selectedProject.id) : [];
  const projectNotes = selectedProject ? notes.filter((item) => item.projectId === selectedProject.id) : [];
  const taskCountByProject = useMemo(() => Object.fromEntries(projects.map((project) => [project.id, tasks.filter((task) => task.projectId === project.id).length])), [projects, tasks]);
  const noteCountByProject = useMemo(() => Object.fromEntries(projects.map((project) => [project.id, notes.filter((note) => note.projectId === project.id).length])), [projects, notes]);
  const filteredNotes = useMemo(() => {
    const search = noteSearch.trim().toLowerCase();
    return [...notes]
      .filter((note) => (noteKindFilter === "all" ? true : note.kind === noteKindFilter))
      .filter((note) => {
        if (!search) return true;
        return (
          note.title.toLowerCase().includes(search) ||
          note.slug.toLowerCase().includes(search) ||
          note.contentMd.toLowerCase().includes(search) ||
          (note.projectName ?? "").toLowerCase().includes(search)
        );
      })
      .sort((left, right) => {
        if (left.isPinned !== right.isPinned) return left.isPinned ? -1 : 1;
        return new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime();
      });
  }, [noteKindFilter, noteSearch, notes]);
  const previewNote = useMemo(() => {
    if (previewNoteId) {
      return filteredNotes.find((note) => note.id === previewNoteId) ?? filteredNotes[0] ?? null;
    }
    return filteredNotes[0] ?? null;
  }, [filteredNotes, previewNoteId]);

  async function loadData() {
    const [dashboardResponse, projectsResponse, tasksResponse, notesResponse] = await Promise.all([
      requestJson<DashboardResponse>("/api/dashboard"),
      requestJson<{ projects: Project[] }>("/api/projects"),
      requestJson<{ tasks: Task[] }>("/api/tasks"),
      requestJson<{ notes: Note[] }>("/api/notes"),
    ]);
    setDashboard(dashboardResponse);
    setProjects(projectsResponse.projects);
    setTasks(tasksResponse.tasks);
    setNotes(notesResponse.notes);
  }

  useEffect(() => {
    const bootstrap = async () => {
      try {
        const me = await requestJson<{ user: SafeUser }>("/api/auth/me");
        setUser(me.user);
        await loadData();
      } catch {
        setUser(null);
      } finally {
        setIsBooting(false);
      }
    };
    void bootstrap();
  }, []);

  async function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage(null);
    setIsSubmitting(true);
    try {
      const response = await requestJson<{ user: SafeUser }>("/api/auth/login", { method: "POST", body: JSON.stringify(loginForm) });
      setUser(response.user);
      setLoginForm(initialLogin);
      await loadData();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Login failed.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleLogout() {
    setIsSubmitting(true);
    try {
      await requestJson("/api/auth/logout", { method: "POST" });
      setUser(null);
      navigate("/");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleProjectDelete(projectId: string) {
    setErrorMessage(null);
    setIsSubmitting(true);
    try {
      await requestJson(`/api/projects/${projectId}`, { method: "DELETE" });
      if (selectedProject?.id === projectId) {
        navigate("/projects");
      }
      await loadData();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Delete failed.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleTaskDelete(taskId: string) {
    setErrorMessage(null);
    setIsSubmitting(true);
    try {
      await requestJson(`/api/tasks/${taskId}`, { method: "DELETE" });
      if (editingTaskId === taskId) {
        setEditingTaskId(null);
        setShowTaskForm(false);
        setTaskForm({ ...initialTask, projectId: selectedProject?.id ?? "" });
      }
      await loadData();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Delete failed.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function saveEntity(path: string, method: "POST" | "PUT", body: unknown, reset: () => void) {
    setErrorMessage(null);
    setIsSubmitting(true);
    try {
      await requestJson(path, { method, body: JSON.stringify(body) });
      reset();
      await loadData();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Save failed.");
    } finally {
      setIsSubmitting(false);
    }
  }

  const cards = [
    { key: "activeProjects", title: "Active projects" },
    { key: "openTasks", title: "Open tasks" },
    { key: "pinnedNotes", title: "Pinned notes" },
    { key: "llmSessionsToday", title: "LLM sessions today" },
  ] as const;

  if (isBooting) return <main className="screen-center"><div className="panel panel-narrow"><p className="eyebrow">Booting</p><h1>Loading cockpit session</h1><p className="muted">Checking whether a local admin session already exists.</p></div></main>;

  if (!user) {
    return (
      <main className="screen-center">
        <section className="panel auth-panel">
          <div><p className="eyebrow">Stage 2</p><h1>Sign in to work.rodion.pro</h1><p className="muted">Projects, tasks and notes are now ready behind the protected shell.</p></div>
          <form className="auth-form" onSubmit={handleLogin}>
            <label>Email<input type="email" value={loginForm.email} onChange={(event) => setLoginForm((current) => ({ ...current, email: event.target.value }))} required /></label>
            <label>Password<input type="password" value={loginForm.password} onChange={(event) => setLoginForm((current) => ({ ...current, password: event.target.value }))} required /></label>
            {errorMessage ? <p className="error-text">{errorMessage}</p> : null}
            <button type="submit" className="primary-button" disabled={isSubmitting}>{isSubmitting ? "Signing in..." : "Sign in"}</button>
          </form>
        </section>
      </main>
    );
  }

  const currentTitle = projectMatch ? selectedProject?.name ?? "Project" : navigation.find((item) => item.path === location.pathname)?.label ?? "Dashboard";

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div>
          <p className="eyebrow">Operational cockpit</p>
          <h1>work.rodion.pro</h1>
          <p className="muted sidebar-copy">Projects, tasks and notes now share one protected shell and database flow.</p>
        </div>
        <nav>
          {navigation.map((item) => (
            <NavLink key={item.path} to={item.path} className={({ isActive }) => `nav-link${isActive || (item.path === "/projects" && Boolean(projectMatch)) ? " nav-link-active" : ""}`}>{item.label}</NavLink>
          ))}
        </nav>
      </aside>

      <main className="content">
        <header className="hero hero-row">
          <div>
            <p className="eyebrow">{projectMatch ? "Project Detail" : currentTitle}</p>
            <h2>{currentTitle}{location.pathname === "/" ? `, ${user.name}` : ""}</h2>
            <p className="hero-copy">
              {projectMatch ? "Project-level overview with linked tasks and notes." : "Capture projects, track tasks and keep notes in one place."}
            </p>
          </div>
          <div className="hero-actions">
            <div className="user-chip"><span>{user.email}</span><span className="user-role">{user.isAdmin ? "Admin" : "User"}</span></div>
            <button type="button" className="ghost-button" onClick={handleLogout} disabled={isSubmitting}>{isSubmitting ? "Working..." : "Logout"}</button>
          </div>
        </header>

        {errorMessage ? <p className="error-banner">{errorMessage}</p> : null}

        {!projectMatch && (
          <section className="metrics-grid">
            {cards.map((card) => <article className="card metric-card" key={card.key}><p className="metric-label">{card.title}</p><strong>{dashboard?.summary[card.key] ?? 0}</strong></article>)}
          </section>
        )}

        {location.pathname === "/" && (
          <section className="card-grid">
            <article className="card"><p className="eyebrow">Highlights</p><h3>Latest signals</h3><ul className="highlight-list compact-list">{(dashboard?.highlights ?? []).map((item) => <li key={item}>{item}</li>)}</ul></article>
            <article className="card"><p className="eyebrow">Projects</p><h3>{projects.length} tracked</h3><p className="muted">Use the projects page to capture repos, URLs and current delivery context.</p></article>
            <article className="card"><p className="eyebrow">Tasks and Notes</p><h3>{tasks.length} tasks · {notes.length} notes</h3><p className="muted">The second stage is now backed by PostgreSQL and editable in the UI.</p></article>
          </section>
        )}

        {location.pathname === "/projects" && (
          <section className="stack-layout">
            <section className="panel">
              <div className="section-heading">
                <div><p className="eyebrow">Projects</p><h3>All projects</h3></div>
                <span className="muted">Click a project name to open its tasks table.</span>
              </div>
              <div className="table-shell">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Project</th>
                      <th>Status</th>
                      <th>Tasks</th>
                      <th>Notes</th>
                      <th>Repo</th>
                      <th>Site</th>
                      <th>Updated</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {projects.map((project) => (
                      <tr key={project.id} className="accent-row" style={{ ["--accent-color" as string]: project.color }}>
                        <td>
                          <button type="button" className="table-link" onClick={() => navigate(`/projects/${project.slug}`)}>
                            {project.name}
                          </button>
                        </td>
                        <td><span className={`status-pill status-${project.status}`}>{project.status}</span></td>
                        <td>{taskCountByProject[project.id] ?? 0}</td>
                        <td>{noteCountByProject[project.id] ?? 0}</td>
                        <td>{project.repoUrl ? <a className="table-link" href={project.repoUrl} target="_blank" rel="noreferrer">repo</a> : <span className="muted">-</span>}</td>
                        <td>{project.siteUrl ? <a className="table-link" href={project.siteUrl} target="_blank" rel="noreferrer">site</a> : <span className="muted">-</span>}</td>
                        <td>{new Date(project.updatedAt).toLocaleDateString()}</td>
                        <td>
                          <div className="icon-actions">
                            <button type="button" className="icon-button" title="Open" onClick={() => navigate(`/projects/${project.slug}`)}>↗</button>
                            <button type="button" className="icon-button" title="Edit" onClick={() => { setEditingProjectId(project.id); setProjectForm({ name: project.name, slug: project.slug, description: project.description, color: project.color, status: project.status, repoUrl: project.repoUrl, siteUrl: project.siteUrl }); }}>✎</button>
                            <button type="button" className="icon-button danger-button" title="Delete" onClick={() => { if (confirm(`Delete project ${project.name}?`)) { void handleProjectDelete(project.id); } }}>✕</button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {projects.length === 0 ? <p className="muted empty-table">No projects yet.</p> : null}
              </div>
            </section>

            <section className="panel project-panel-accent" style={{ ["--accent-color" as string]: selectedProject?.color ?? "#4d8eff" }}>
              <p className="eyebrow">Editor</p><h3>{editingProjectId ? "Edit project" : "New project"}</h3>
              <form className="stack-form" onSubmit={(event) => { event.preventDefault(); void saveEntity(editingProjectId ? `/api/projects/${editingProjectId}` : "/api/projects", editingProjectId ? "PUT" : "POST", projectForm, () => { setProjectForm(initialProject); setEditingProjectId(null); }); }}>
                <label>Name<input value={projectForm.name} onChange={(event) => setProjectForm((current) => ({ ...current, name: event.target.value }))} required /></label>
                <label>Slug<input value={projectForm.slug} onChange={(event) => setProjectForm((current) => ({ ...current, slug: event.target.value }))} /></label>
                <label>Description<textarea rows={4} value={projectForm.description} onChange={(event) => setProjectForm((current) => ({ ...current, description: event.target.value }))} /></label>
                <div className="form-row">
                  <label>Status<select value={projectForm.status} onChange={(event) => setProjectForm((current) => ({ ...current, status: event.target.value as Project["status"] }))}><option value="active">active</option><option value="paused">paused</option><option value="archived">archived</option></select></label>
                  <label>Color<input type="color" value={projectForm.color} onChange={(event) => setProjectForm((current) => ({ ...current, color: event.target.value }))} /></label>
                </div>
                <label>Repo URL<input value={projectForm.repoUrl} onChange={(event) => setProjectForm((current) => ({ ...current, repoUrl: event.target.value }))} /></label>
                <label>Site URL<input value={projectForm.siteUrl} onChange={(event) => setProjectForm((current) => ({ ...current, siteUrl: event.target.value }))} /></label>
                <div className="button-row">
                  <button type="submit" className="primary-button" disabled={isSubmitting}>{editingProjectId ? "Save project" : "Create project"}</button>
                  {editingProjectId ? <button type="button" className="ghost-button" onClick={() => { setEditingProjectId(null); setProjectForm(initialProject); }}>Cancel</button> : null}
                </div>
              </form>
            </section>
          </section>
        )}

        {location.pathname === "/tasks" && (
          <section className="stack-layout">
            {showTaskForm && (
              <section className="panel">
                <div className="section-heading">
                  <div><p className="eyebrow">Tasks</p><h3>{editingTaskId ? "Edit task" : "New task"}</h3></div>
                  <button type="button" className="ghost-button" onClick={() => { setShowTaskForm(false); setEditingTaskId(null); setTaskForm({ ...initialTask, projectId: selectedProject?.id ?? "" }); }}>
                    Back to list
                  </button>
                </div>
                <form className="stack-form" onSubmit={(event) => { event.preventDefault(); void saveEntity(editingTaskId ? `/api/tasks/${editingTaskId}` : "/api/tasks", editingTaskId ? "PUT" : "POST", { ...taskForm, dueDate: taskForm.dueDate ? new Date(taskForm.dueDate).toISOString() : null }, () => { setTaskForm({ ...initialTask, projectId: selectedProject?.id ?? "" }); setEditingTaskId(null); setShowTaskForm(false); }); }}>
                  <label>Project<select value={taskForm.projectId} onChange={(event) => setTaskForm((current) => ({ ...current, projectId: event.target.value }))} required><option value="">Select project</option>{projects.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}</select></label>
                  <label>Title<input value={taskForm.title} onChange={(event) => setTaskForm((current) => ({ ...current, title: event.target.value }))} required /></label>
                  <label>Description<textarea rows={5} value={taskForm.descriptionMd} onChange={(event) => setTaskForm((current) => ({ ...current, descriptionMd: event.target.value }))} /></label>
                  <div className="form-row three-col">
                    <label>Status<select value={taskForm.status} onChange={(event) => setTaskForm((current) => ({ ...current, status: event.target.value as Task["status"] }))}><option value="todo">todo</option><option value="doing">doing</option><option value="blocked">blocked</option><option value="done">done</option><option value="cancelled">cancelled</option></select></label>
                    <label>Priority<select value={taskForm.priority} onChange={(event) => setTaskForm((current) => ({ ...current, priority: event.target.value as Task["priority"] }))}><option value="low">low</option><option value="medium">medium</option><option value="high">high</option><option value="critical">critical</option></select></label>
                    <label>Kind<select value={taskForm.kind} onChange={(event) => setTaskForm((current) => ({ ...current, kind: event.target.value as Task["kind"] }))}><option value="feature">feature</option><option value="bug">bug</option><option value="ops">ops</option><option value="research">research</option><option value="idea">idea</option><option value="content">content</option><option value="other">other</option></select></label>
                  </div>
                  <label>Due date<input type="date" value={taskForm.dueDate} onChange={(event) => setTaskForm((current) => ({ ...current, dueDate: event.target.value }))} /></label>
                  <button type="submit" className="primary-button" disabled={isSubmitting}>{editingTaskId ? "Save task" : "Create task"}</button>
                </form>
              </section>
            )}
            <section className="panel">
              <div className="section-heading">
                <div><p className="eyebrow">Queue</p><h3>All tasks</h3></div>
                <button type="button" className="primary-button plus-button" onClick={() => { setShowTaskForm(true); setEditingTaskId(null); setTaskForm({ ...initialTask, projectId: selectedProject?.id ?? "" }); }}>+</button>
              </div>
              <div className="table-shell"><table className="data-table"><thead><tr><th>Task</th><th>Project</th><th>Status</th><th>Priority</th><th>Kind</th><th>Due</th><th>Actions</th></tr></thead><tbody>{tasks.map((task) => <tr key={task.id}><td><button type="button" className="table-link" onClick={() => { setEditingTaskId(task.id); setShowTaskForm(true); setTaskForm({ projectId: task.projectId, title: task.title, descriptionMd: task.descriptionMd, status: task.status, priority: task.priority, kind: task.kind, dueDate: task.dueDate ? task.dueDate.slice(0, 10) : "" }); }}>{task.title}</button></td><td>{task.projectName ?? "-"}</td><td><span className={`status-pill status-${task.status}`}>{task.status}</span></td><td>{task.priority}</td><td>{task.kind}</td><td>{task.dueDate ? new Date(task.dueDate).toLocaleDateString() : "-"}</td><td><div className="icon-actions"><button type="button" className="icon-button" title="Edit task" onClick={() => { setEditingTaskId(task.id); setShowTaskForm(true); setTaskForm({ projectId: task.projectId, title: task.title, descriptionMd: task.descriptionMd, status: task.status, priority: task.priority, kind: task.kind, dueDate: task.dueDate ? task.dueDate.slice(0, 10) : "" }); }}>✎</button><button type="button" className="icon-button danger-button" title="Delete task" onClick={() => { if (confirm(`Delete task ${task.title}?`)) { void handleTaskDelete(task.id); } }}>✕</button></div></td></tr>)}</tbody></table>{tasks.length === 0 ? <p className="muted empty-table">No tasks yet.</p> : null}</div>
            </section>
          </section>
        )}

        {location.pathname === "/notes" && (
          <section className="stack-layout">
            {showNoteForm && (
              <section className="panel">
                <div className="section-heading">
                  <div><p className="eyebrow">Notes</p><h3>{editingNoteId ? "Edit note" : "New note"}</h3></div>
                  <button type="button" className="ghost-button" onClick={() => { setShowNoteForm(false); setEditingNoteId(null); setNoteForm({ ...initialNote, projectId: selectedProject?.id ?? "" }); }}>
                    Back to list
                  </button>
                </div>
                <form className="stack-form" onSubmit={(event) => { event.preventDefault(); void saveEntity(editingNoteId ? `/api/notes/${editingNoteId}` : "/api/notes", editingNoteId ? "PUT" : "POST", noteForm, () => { setNoteForm({ ...initialNote, projectId: selectedProject?.id ?? "" }); setEditingNoteId(null); setShowNoteForm(false); }); }}>
                  <label>Project<select value={noteForm.projectId} onChange={(event) => setNoteForm((current) => ({ ...current, projectId: event.target.value }))} required><option value="">Select project</option>{projects.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}</select></label>
                  <label>Title<input value={noteForm.title} onChange={(event) => setNoteForm((current) => ({ ...current, title: event.target.value }))} required /></label>
                  <div className="form-row"><label>Slug<input value={noteForm.slug} onChange={(event) => setNoteForm((current) => ({ ...current, slug: event.target.value }))} /></label><label>Kind<select value={noteForm.kind} onChange={(event) => setNoteForm((current) => ({ ...current, kind: event.target.value as Note["kind"] }))}><option value="note">note</option><option value="doc">doc</option><option value="runbook">runbook</option><option value="meeting">meeting</option><option value="idea">idea</option><option value="postmortem">postmortem</option><option value="reference">reference</option></select></label></div>
                  <label className="checkbox-row"><input type="checkbox" checked={noteForm.isPinned} onChange={(event) => setNoteForm((current) => ({ ...current, isPinned: event.target.checked }))} />Pin this note</label>
                  <label>Content<textarea rows={10} value={noteForm.contentMd} onChange={(event) => setNoteForm((current) => ({ ...current, contentMd: event.target.value }))} /></label>
                  <button type="submit" className="primary-button" disabled={isSubmitting}>{editingNoteId ? "Save note" : "Create note"}</button>
                </form>
              </section>
            )}
            <section className="panel">
              <div className="section-heading">
                <div><p className="eyebrow">Library</p><h3>All notes</h3></div>
                <button type="button" className="primary-button plus-button" onClick={() => { setShowNoteForm(true); setEditingNoteId(null); setNoteForm({ ...initialNote, projectId: selectedProject?.id ?? "" }); }}>+</button>
              </div>
              <div className="toolbar-row">
                <input
                  value={noteSearch}
                  onChange={(event) => setNoteSearch(event.target.value)}
                  placeholder="Search title, project, slug or content"
                />
                <select
                  value={noteKindFilter}
                  onChange={(event) => setNoteKindFilter(event.target.value as Note["kind"] | "all")}
                >
                  <option value="all">all kinds</option>
                  <option value="note">note</option>
                  <option value="doc">doc</option>
                  <option value="runbook">runbook</option>
                  <option value="meeting">meeting</option>
                  <option value="idea">idea</option>
                  <option value="postmortem">postmortem</option>
                  <option value="reference">reference</option>
                </select>
              </div>
              <div className="notes-workspace">
                <div className="table-shell">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Title</th>
                        <th>Project</th>
                        <th>Kind</th>
                        <th>Pinned</th>
                        <th>Updated</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredNotes.map((note) => (
                        <tr key={note.id} className={previewNote?.id === note.id ? "selected-row" : ""}>
                          <td><button type="button" className="table-link" onClick={() => setPreviewNoteId(note.id)}>{note.title}</button></td>
                          <td>{note.projectName ?? "-"}</td>
                          <td>{note.kind}</td>
                          <td>{note.isPinned ? "Yes" : "No"}</td>
                          <td>{new Date(note.updatedAt).toLocaleDateString()}</td>
                          <td><div className="icon-actions"><button type="button" className="icon-button" title="Preview note" onClick={() => setPreviewNoteId(note.id)}>↗</button><button type="button" className="icon-button" title="Edit note" onClick={() => { setShowNoteForm(true); setEditingNoteId(note.id); setPreviewNoteId(note.id); setNoteForm({ projectId: note.projectId, title: note.title, slug: note.slug, kind: note.kind, contentMd: note.contentMd, isPinned: note.isPinned }); }}>✎</button></div></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {filteredNotes.length === 0 ? <p className="muted empty-table">No notes match your filters.</p> : null}
                </div>
                <aside className="panel note-preview-panel">
                  <p className="eyebrow">Preview</p>
                  <h3>{previewNote?.title ?? "No note selected"}</h3>
                  {previewNote ? (
                    <>
                      <p className="muted">Project: {previewNote.projectName ?? "-"} · {previewNote.kind} · {previewNote.isPinned ? "Pinned" : "Regular"}</p>
                      <pre className="note-preview-content">{previewNote.contentMd || "No content yet."}</pre>
                    </>
                  ) : (
                    <p className="muted">Choose a note from the table to preview it here.</p>
                  )}
                </aside>
              </div>
            </section>
          </section>
        )}

        {projectMatch && (
          <section className="stack-layout">
            <section className="panel">
              <div className="section-heading">
                <div className="entity-title-group">
                  <span className="color-dot large-dot" style={{ backgroundColor: selectedProject?.color ?? "#4d8eff" }} />
                  <div><p className="eyebrow">Project detail</p><h3>{selectedProject?.name ?? "Project not found"}</h3></div>
                </div>
                {selectedProject ? <span className={`status-pill status-${selectedProject.status}`}>{selectedProject.status}</span> : null}
              </div>
              <p className="muted">{selectedProject?.description || "Choose an existing project from the list."}</p>
              <div className="button-row">
                <button type="button" className="ghost-button" onClick={() => navigate("/projects")}>Back to projects</button>
                {selectedProject ? <button type="button" className="ghost-button" onClick={() => { setShowTaskForm(true); setTaskForm({ ...initialTask, projectId: selectedProject.id }); navigate("/tasks"); }}>New task</button> : null}
                {selectedProject ? <button type="button" className="ghost-button" onClick={() => { setShowNoteForm(true); setNoteForm({ ...initialNote, projectId: selectedProject.id }); navigate("/notes"); }}>New note</button> : null}
              </div>
            </section>

            <section className="panel">
              <p className="eyebrow">Tasks</p><h3>Project queue</h3>
              <div className="table-shell">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Task</th>
                      <th>Status</th>
                      <th>Priority</th>
                      <th>Kind</th>
                      <th>Due</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {projectTasks.map((task) => (
                      <tr key={task.id}>
                        <td><button type="button" className="table-link" onClick={() => { setEditingTaskId(task.id); setShowTaskForm(true); setTaskForm({ projectId: task.projectId, title: task.title, descriptionMd: task.descriptionMd, status: task.status, priority: task.priority, kind: task.kind, dueDate: task.dueDate ? task.dueDate.slice(0, 10) : "" }); navigate("/tasks"); }}>{task.title}</button></td>
                        <td><span className={`status-pill status-${task.status}`}>{task.status}</span></td>
                        <td>{task.priority}</td>
                        <td>{task.kind}</td>
                        <td>{task.dueDate ? new Date(task.dueDate).toLocaleDateString() : "-"}</td>
                        <td><button type="button" className="icon-button" title="Edit task" onClick={() => { setEditingTaskId(task.id); setShowTaskForm(true); setTaskForm({ projectId: task.projectId, title: task.title, descriptionMd: task.descriptionMd, status: task.status, priority: task.priority, kind: task.kind, dueDate: task.dueDate ? task.dueDate.slice(0, 10) : "" }); navigate("/tasks"); }}>↗</button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {selectedProject && projectTasks.length === 0 ? <p className="muted empty-table">No tasks for this project yet.</p> : null}
              </div>
            </section>

            <section className="panel">
              <p className="eyebrow">Notes</p><h3>Project docs</h3>
              <div className="table-shell">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Note</th>
                      <th>Kind</th>
                      <th>Pinned</th>
                      <th>Updated</th>
                    </tr>
                  </thead>
                  <tbody>
                    {projectNotes.map((note) => (
                      <tr key={note.id}>
                        <td>{note.title}</td>
                        <td>{note.kind}</td>
                        <td>{note.isPinned ? "Yes" : "No"}</td>
                        <td>{new Date(note.updatedAt).toLocaleDateString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {selectedProject && projectNotes.length === 0 ? <p className="muted empty-table">No notes for this project yet.</p> : null}
              </div>
            </section>
          </section>
        )}

        {["/llm", "/resources", "/actions"].includes(location.pathname) && <section className="panel"><p className="eyebrow">{currentTitle}</p><h3>{currentTitle} module is still ahead</h3><p className="muted">This protected area stays in place while we finish the core project workflow first.</p></section>}
      </main>
    </div>
  );
}
