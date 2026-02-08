import Sidebar from "./Sidebar";

export default function AppShell() {
  return (
    <div className="tt-appshell">
      <Sidebar />

      <main className="tt-shell-main">
        <header className="tt-shell-topbar">
          <div className="tt-shell-title">
            <div className="tt-shell-kicker">TabbyTech</div>
            <div className="tt-shell-h1">Dashboard</div>
          </div>

          <div className="tt-shell-actions">
            <div className="tt-shell-search">
              <span className="tt-shell-searchicon">⌕</span>
              <input
                className="tt-shell-searchinput"
                placeholder="Search clients, batches, reports"
                aria-label="Search"
              />
            </div>

            <button className="tt-shell-iconbtn" type="button" aria-label="Notifications">
              🔔
            </button>

            <div className="tt-shell-user" role="button" tabIndex={0}>
              <div className="tt-shell-avatar">T</div>
              <div className="tt-shell-usermeta">
                <div className="tt-shell-username">TabbyTech</div>
                <div className="tt-shell-userrole">Ops</div>
              </div>
            </div>
          </div>
        </header>

        <section className="tt-shell-content">
          <div className="tt-shell-placeholder">
            Dashboard content next
          </div>
        </section>
      </main>
    </div>
  );
}
