import Link from "next/link";

function NavGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return <section className="nav-group"><p>{title}</p>{children}</section>;
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return <div className="shell"><nav className="side"><h2>Mise</h2><p className="location-label">The Good Fork · Bengaluru</p>
    <NavGroup title="Today"><Link href="/app?demo=1">The Pass</Link></NavGroup>
    <NavGroup title="People"><Link href="/app/rail">The Rail</Link><Link href="/app/clock">Plate Clock</Link><Link href="/app/team">Team</Link><Link href="/app/requests">Requests <span className="nav-count">2</span></Link><Link href="/app/timesheets">Timesheets</Link><Link href="/app/family-meal">Family Meal</Link><Link href="/app/handover">Handover notes</Link><Link href="/app/cookbook">The Cookbook</Link></NavGroup>
    <NavGroup title="Service"><Link href="/app/pos">POS</Link><Link href="/app/floor">Floor plan</Link><Link href="/app/line">The Line</Link><Link href="/app/day-close">Day close</Link><Link href="/app/reservations">Reservations</Link><Link href="/app/customers">Customers</Link></NavGroup>
    <NavGroup title="Operations"><Link href="/app/pantry">The Pantry</Link><Link href="/app/market-run">Market Run</Link><Link href="/app/recipe-cards">Recipe Cards</Link><Link href="/app/bin">The Bin</Link><Link href="/app/86-board">86 Board</Link><Link href="/app/mise-en-place">Mise en Place</Link></NavGroup>
    <NavGroup title="Insights"><Link href="/app/tasting-notes">Tasting Notes</Link><Link href="/app/targets">Targets</Link><Link href="/app/forecast">Forecast</Link></NavGroup>
  </nav><main className="main">{children}</main></div>;
}
