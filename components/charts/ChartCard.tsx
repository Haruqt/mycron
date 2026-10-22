export default function ChartCard({ title, subtitle, children, bare }: { title: string; subtitle?: string; children: React.ReactNode; bare?: boolean }) {
  return (
    <section className={bare ? "chart-bare" : "hpanel"}>
      <div className="chart-head">
        <h3>{title}</h3>
        {subtitle && <p>{subtitle}</p>}
      </div>
      {children}
    </section>
  );
}
