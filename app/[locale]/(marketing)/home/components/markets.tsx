import { Globe, Network, BarChart3 } from 'lucide-react';

interface MarketsProps {
  title: string;
  subtitle: string;
  regions: { name: string; note: string; exchanges: string[] }[];
}

export function Markets({ title, subtitle, regions }: MarketsProps) {
  const icons = [Globe, Network, BarChart3];

  return (
    <section className="bg-[#020614] px-6 py-24 text-slate-100 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-blue-900/20 via-[#020614] to-[#020614] pointer-events-none" />
        
      <div className="mx-auto max-w-7xl relative z-10">
        <div className="mb-16 text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.4em] text-slate-400">{title}</p>
          <h2 className="mt-4 text-3xl font-bold text-white lg:text-4xl">{subtitle}</h2>
        </div>
        <div className="grid gap-6 md:grid-cols-3">
          {regions.map((region, index) => {
            const Icon = icons[index % icons.length];
            return (
              <div key={region.name} className="group rounded-3xl border border-white/10 bg-white/5 p-8 transition-all hover:bg-white/10 hover:border-white/20">
                <div className="mb-6 flex items-center gap-4">
                  <div className="rounded-2xl bg-white/10 p-3 group-hover:scale-110 transition-transform duration-300">
                    <Icon className="h-6 w-6 text-sky-400" />
                  </div>
                  <div>
                    <p className="text-xl font-bold text-white">{region.name}</p>
                    <p className="text-sm text-slate-400">{region.note}</p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  {region.exchanges.map((exchange) => (
                    <span key={exchange} className="rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs font-medium text-slate-300 transition-colors group-hover:bg-white/10 group-hover:text-white">
                      {exchange}
                    </span>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
