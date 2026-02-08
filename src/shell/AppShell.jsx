import Sidebar from "./Sidebar";
import Dashboard from "./Dashboard";

export default function AppShell() {
  return (
    <div className="tt-appshell">
      <Sidebar />

      <main className="tt-shell-main">
        <header className="tt-shell-topbar">
          <div>
            <div className="tt-shell-kicker">TabbyTech</div>
            <div className="tt-shell-h1">Dashboard</div>
          </div>

          <div className="tt-shell-actions">
            <div className="tt-shell-search">
              <span className="tt-shell-searchicon">⌕</span>
              <input
                className="tt-shell-searchinput"
                placeholder="Search clients, batches, reports"
              />
            </div>

            <button className="tt-shell-iconbtn">🔔</button>

            <div className="tt-shell-user">
              <div className="tt-shell-avatar">T</div>
              <div>
                <div className="tt-shell-username">TabbyTech</div>
                <div className="tt-shell-userrole">Ops</div>
              </div>
            </div>
          </div>
        </header>

        <section className="tt-shell-content">
          <Dashboard />
        </section>
      </main>
    </div>
  );
}
