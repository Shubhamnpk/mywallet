"use client";

import { useEffect, useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { Search, Star, MapPin, RefreshCw, Crown, Medal, Award, ExternalLink, Building, Phone, Map as MapIcon, TrendingUp, Store, ShieldCheck, Clock, DollarSign, ArrowUpCircle, ArrowDownCircle } from "lucide-react";

interface Broker {
  id: number;
  memberCode: number;
  memberName: string;
  membershipType: string;
  phone: string;
  provinces: string | null;
  districts: string[];
  tmsLink: string;
  branchCount: number;
  activeStatus: string;
  isDealer: string;
  imageUrl: string;
  rating: { averageRating: number; totalRatings: number; averageShareTransferDays: number; averageCashDepositDays: number };
  thirtyDaysTurnover: number;
  latestTurnover: number;
  todayStats: {
    totalAmount: number;
    buyAmount: number;
    sellAmount: number;
    topStock: { symbol: string; name: string; totalAmount: number; buyAmount: number; sellAmount: number };
  } | null;
}

export function BrokerTraining() {
  const [brokers, setBrokers] = useState<Broker[]>([]);
  const [sectorMap, setSectorMap] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [sectorFilter, setSectorFilter] = useState("all");
  const [sortBy, setSortBy] = useState<"turnover" | "rating" | "branches">("turnover");
  const [podiumMetric, setPodiumMetric] = useState<"today" | "month" | "review">("month");
  const [selectedBroker, setSelectedBroker] = useState<(Broker & { topSector: string }) | null>(null);

  useEffect(() => {
    Promise.all([
      fetch("/api/nepse/brokers").then((r) => r.json()),
      fetch("/api/nepse/sectors").then((r) => r.json()),
    ])
      .then(([brokerData, sectorData]) => {
        setBrokers(Array.isArray(brokerData) ? brokerData : []);
        const sm: Record<string, string> = {};
        if (sectorData && typeof sectorData === "object") {
          Object.entries(sectorData).forEach(([sector, scrips]) => {
            if (Array.isArray(scrips)) {
              scrips.forEach((s: any) => {
                if (s.symbol) sm[s.symbol.toUpperCase()] = sector;
              });
            }
          });
        }
        setSectorMap(sm);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const brokersWithSector = useMemo(() => {
    return brokers.map((b) => {
      const sym = b.todayStats?.topStock?.symbol;
      const sector = sym ? sectorMap[sym.toUpperCase()] || "Others" : "N/A";
      return { ...b, topSector: sector };
    });
  }, [brokers, sectorMap]);

  const allSectors = useMemo(() => {
    const s = new Set(brokersWithSector.map((b) => b.topSector));
    return Array.from(s).sort();
  }, [brokersWithSector]);

  const top3 = useMemo(() => {
    const active = brokersWithSector.filter((b) => b.activeStatus === "A");
    if (podiumMetric === "today") {
      return [...active].sort((a, b) => (b.todayStats?.totalAmount ?? 0) - (a.todayStats?.totalAmount ?? 0)).slice(0, 3);
    }
    if (podiumMetric === "review") {
      return [...active].sort((a, b) => b.rating.averageRating - a.rating.averageRating).slice(0, 3);
    }
    return [...active].sort((a, b) => b.thirtyDaysTurnover - a.thirtyDaysTurnover).slice(0, 3);
  }, [brokersWithSector, podiumMetric]);

  const filtered = useMemo(() => {
    let result = brokersWithSector;
    if (search) {
      const q = search.toLowerCase();
      result = result.filter((b) => b.memberName.toLowerCase().includes(q));
    }
    if (sectorFilter !== "all") {
      result = result.filter((b) => b.topSector === sectorFilter);
    }
    result = [...result].sort((a, b) => {
      if (sortBy === "turnover") return b.thirtyDaysTurnover - a.thirtyDaysTurnover;
      if (sortBy === "rating") return b.rating.averageRating - a.rating.averageRating;
      return b.branchCount - a.branchCount;
    });
    return result;
  }, [brokersWithSector, search, sectorFilter, sortBy]);

  const activeBrokers = filtered.filter((b) => b.activeStatus === "A");
  const suspendedBrokers = filtered.filter((b) => b.activeStatus !== "A");
  const [first, second, third] = top3;
  const fmtCr = (n: number) => `रु ${(n / 1e7).toFixed(1)}Cr`;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-muted-foreground">
        <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
        Loading brokers...
      </div>
    );
  }

  const brokerCard = (b: Broker & { topSector: string }) => (
    <Card key={b.id} className={cn("gap-2 py-3 px-3 shadow-sm cursor-pointer transition-all duration-200 hover:shadow-md hover:-translate-y-0.5", b.activeStatus !== "A" && "opacity-60")} onClick={() => setSelectedBroker(b)}>
      <div className="flex items-center gap-3">
        {b.imageUrl ? (
          <img src={b.imageUrl} alt="" className="h-10 w-10 shrink-0 rounded-xl object-cover" />
        ) : (
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary text-xs font-bold">
            {b.memberCode}
          </div>
        )}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 flex-wrap">
            <CardTitle className="text-sm font-semibold leading-tight">{b.memberName}</CardTitle>
            {b.membershipType && (
              <span className="rounded-md bg-blue-100 px-1.5 py-0.5 text-[10px] font-medium text-blue-700 dark:bg-blue-900/40 dark:text-blue-300">
                {b.membershipType}
              </span>
            )}
            {b.isDealer === "Y" && (
              <span className="rounded-md bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium text-amber-700 dark:bg-amber-900/40 dark:text-amber-300">
                Dealer
              </span>
            )}
          </div>
          <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-0.5 text-[11px] text-muted-foreground">
            {b.districts.length > 0 && (
              <span className="flex items-center gap-1">
                <MapPin className="h-3 w-3" />{b.districts.slice(0, 2).join(", ")}{b.districts.length > 2 ? ` +${b.districts.length - 2}` : ""}
              </span>
            )}
            {b.provinces && (
              <span className="text-[10px]">{b.provinces}</span>
            )}
            {b.rating.totalRatings > 0 && (
              <span className="flex items-center gap-1">
                <Star className="h-3 w-3 text-amber-500" />{b.rating.averageRating.toFixed(1)} ({b.rating.totalRatings})
              </span>
            )}
            {b.phone && (
              <span className="text-[10px]">📞 {b.phone}</span>
            )}
          </div>
        </div>
      </div>
    </Card>
  );

  return (
    <div className="space-y-4">
      {/* Podium */}
      {top3.length === 3 && (
        <>
          <div className="flex items-center justify-center">
            <div className="inline-flex items-center gap-1 rounded-xl bg-muted/40 border p-0.5 shadow-sm">
              {(["today", "month", "review"] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  className={cn(
                    "rounded-lg px-3.5 py-1.5 text-xs font-medium transition-all",
                    podiumMetric === m
                      ? "bg-background text-foreground shadow-sm border border-border"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                  onClick={() => setPodiumMetric(m)}
                >
                  {m === "today" ? "Today" : m === "month" ? "Month" : "Review"}
                </button>
              ))}
            </div>
          </div>
          <div className="flex items-end justify-center gap-4 px-2 pb-6">
            {/* 2nd */}
            <div className="flex flex-col items-center w-28 transition-all duration-300 hover:scale-105 cursor-pointer" onClick={() => setSelectedBroker(second)}>
              <div className="relative mb-2">
                {second.imageUrl ? (
                  <img src={second.imageUrl} alt="" className="h-10 w-10 rounded-full object-cover ring-2 ring-zinc-300/50 shadow-md" />
                ) : (
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-zinc-300 to-zinc-400 text-white text-xs font-bold shadow-md ring-2 ring-zinc-200/50 text-[11px]">
                    {second.memberCode}
                  </div>
                )}
                <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-zinc-400 text-[9px] font-bold text-white shadow-sm">2</span>
              </div>
              <div className="text-center">
                <div className="text-xs font-semibold leading-tight line-clamp-2">{second.memberName}</div>
                <div className="text-[10px] text-muted-foreground mt-0.5">
                  {podiumMetric === "review"
                    ? `★ ${second.rating.averageRating.toFixed(1)}`
                    : `रु ${((podiumMetric === "today" ? second.todayStats?.totalAmount ?? 0 : second.thirtyDaysTurnover) / 1e7).toFixed(1)}Cr`}
                </div>
              </div>
              <div className="mt-3 w-full h-20 rounded-t-xl bg-gradient-to-t from-zinc-200/80 to-zinc-100/40 border border-zinc-200/60 shadow-inner" />
            </div>
            {/* 1st */}
            <div className="flex flex-col items-center w-32 transition-all duration-300 hover:scale-105 cursor-pointer" onClick={() => setSelectedBroker(first)}>
              <div className="relative mb-2">
                {first.imageUrl ? (
                  <img src={first.imageUrl} alt="" className="h-12 w-12 rounded-full object-cover ring-2 ring-amber-300/50 shadow-lg" />
                ) : (
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-amber-300 via-amber-400 to-yellow-500 text-white shadow-lg ring-2 ring-amber-300/50 text-sm font-bold">
                    {first.memberCode}
                  </div>
                )}
                <span className="absolute -top-1.5 -right-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-amber-500 text-[10px] font-bold text-white shadow-md ring-2 ring-background">1</span>
              </div>
              <div className="text-center">
                <div className="text-sm font-bold leading-tight line-clamp-2">{first.memberName}</div>
                <div className="text-[11px] text-amber-600 dark:text-amber-400 font-medium mt-0.5">
                  {podiumMetric === "review"
                    ? `★ ${first.rating.averageRating.toFixed(1)}`
                    : `रु ${((podiumMetric === "today" ? first.todayStats?.totalAmount ?? 0 : first.thirtyDaysTurnover) / 1e7).toFixed(1)}Cr`}
                </div>
              </div>
              <div className="mt-3 w-full h-32 rounded-t-xl bg-gradient-to-t from-amber-200/80 via-amber-100/50 to-amber-50/30 border border-amber-200/60 shadow-inner" />
            </div>
            {/* 3rd */}
            <div className="flex flex-col items-center w-28 transition-all duration-300 hover:scale-105 cursor-pointer" onClick={() => setSelectedBroker(third)}>
              <div className="relative mb-2">
                {third.imageUrl ? (
                  <img src={third.imageUrl} alt="" className="h-10 w-10 rounded-full object-cover ring-2 ring-orange-200/50 shadow-md" />
                ) : (
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-orange-300 to-orange-400 text-white text-xs font-bold shadow-md ring-2 ring-orange-200/50 text-[11px]">
                    {third.memberCode}
                  </div>
                )}
                <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-orange-400 text-[9px] font-bold text-white shadow-sm">3</span>
              </div>
              <div className="text-center">
                <div className="text-xs font-semibold leading-tight line-clamp-2">{third.memberName}</div>
                <div className="text-[10px] text-muted-foreground mt-0.5">
                  {podiumMetric === "review"
                    ? `★ ${third.rating.averageRating.toFixed(1)}`
                    : `रु ${((podiumMetric === "today" ? third.todayStats?.totalAmount ?? 0 : third.thirtyDaysTurnover) / 1e7).toFixed(1)}Cr`}
                </div>
              </div>
              <div className="mt-3 w-full h-14 rounded-t-xl bg-gradient-to-t from-orange-200/80 to-orange-100/40 border border-orange-200/60 shadow-inner" />
            </div>
          </div>
        </>
      )}

      {/* Search + filters */}
      <div className="flex flex-wrap gap-2">
        <div className="relative flex-1 min-w-[180px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search broker..."
            className="h-10 rounded-xl border-muted/60 pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select
          className="h-10 rounded-xl border border-muted/60 bg-background px-3 text-sm"
          value={sectorFilter}
          onChange={(e) => setSectorFilter(e.target.value)}
        >
          <option value="all">All sectors</option>
          {allSectors.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <div className="flex gap-0.5 rounded-xl border bg-muted/30 p-0.5">
          {(["turnover", "rating", "branches"] as const).map((s) => (
            <button
              key={s}
              type="button"
              className={cn(
                "rounded-lg px-3 py-1.5 text-xs font-medium transition-colors",
                sortBy === s ? "bg-background text-foreground shadow-sm border border-border" : "text-muted-foreground hover:text-foreground",
              )}
              onClick={() => setSortBy(s)}
            >
              {s === "turnover" ? "Turnover" : s === "rating" ? "Rating" : "Branches"}
            </button>
          ))}
        </div>
      </div>

      {/* Results */}
      <div className="text-xs text-muted-foreground">
        {filtered.length} broker{filtered.length !== 1 ? "s" : ""}
        {sectorFilter !== "all" && <> &middot; {sectorFilter}</>}
      </div>

      {activeBrokers.length > 0 && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {activeBrokers.map(brokerCard)}
        </div>
      )}

      {suspendedBrokers.length > 0 && (
        <div>
          <div className="text-xs text-muted-foreground font-medium mb-2">Suspended / Inactive</div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {suspendedBrokers.map(brokerCard)}
          </div>
        </div>
      )}

      {filtered.length === 0 && (
        <div className="text-center py-16 text-muted-foreground">No brokers match your filters.</div>
      )}

      <Dialog open={!!selectedBroker} onOpenChange={(o) => !o && setSelectedBroker(null)}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto" aria-describedby={undefined}>
          {selectedBroker && (
            <>
              <DialogHeader>
                <div className="flex items-center gap-4">
                  {selectedBroker.imageUrl ? (
                    <img src={selectedBroker.imageUrl} alt="" className="h-14 w-14 shrink-0 rounded-2xl object-cover ring-2 ring-border" />
                  ) : (
                    <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary text-lg font-bold">
                      {selectedBroker.memberCode}
                    </div>
                  )}
                  <div className="min-w-0">
                    <DialogTitle className="text-lg leading-tight">{selectedBroker.memberName}</DialogTitle>
                    <div className="flex flex-wrap items-center gap-1.5 mt-1">
                      {selectedBroker.membershipType && (
                        <span className="rounded-md bg-blue-100 px-1.5 py-0.5 text-[10px] font-medium text-blue-700 dark:bg-blue-900/40 dark:text-blue-300">{selectedBroker.membershipType}</span>
                      )}
                      {selectedBroker.isDealer === "Y" && (
                        <span className="rounded-md bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium text-amber-700 dark:bg-amber-900/40 dark:text-amber-300">Dealer</span>
                      )}
                      <span className={cn("rounded-md px-1.5 py-0.5 text-[10px] font-medium", selectedBroker.activeStatus === "A" ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300" : "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300")}>
                        {selectedBroker.activeStatus === "A" ? "Active" : selectedBroker.activeStatus}
                      </span>
                    </div>
                  </div>
                </div>
              </DialogHeader>

              <div className="space-y-4 px-1">
                {/* Contact & Location */}
                <div className="grid grid-cols-2 gap-3">
                  {selectedBroker.phone && (
                    <div className="flex items-center gap-2 rounded-xl bg-muted/40 px-3 py-2.5">
                      <Phone className="h-4 w-4 text-muted-foreground shrink-0" />
                      <div className="min-w-0">
                        <div className="text-[10px] text-muted-foreground">Phone</div>
                        <div className="text-sm font-medium">{selectedBroker.phone}</div>
                      </div>
                    </div>
                  )}
                  {selectedBroker.branchCount > 0 && (
                    <div className="flex items-center gap-2 rounded-xl bg-muted/40 px-3 py-2.5">
                      <Building className="h-4 w-4 text-muted-foreground shrink-0" />
                      <div className="min-w-0">
                        <div className="text-[10px] text-muted-foreground">Branches</div>
                        <div className="text-sm font-medium">{selectedBroker.branchCount}</div>
                      </div>
                    </div>
                  )}
                  <div className="flex items-center gap-2 rounded-xl bg-muted/40 px-3 py-2.5 col-span-2">
                    <MapIcon className="h-4 w-4 text-muted-foreground shrink-0" />
                    <div className="min-w-0">
                      <div className="text-[10px] text-muted-foreground">Location</div>
                      <div className="text-sm font-medium">
                        {selectedBroker.districts.join(", ")}
                        {selectedBroker.provinces && <span className="text-muted-foreground"> &middot; {selectedBroker.provinces}</span>}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Turnover Stats */}
                <div>
                  <h4 className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground mb-2">
                    <TrendingUp className="h-3.5 w-3.5" /> Turnover
                  </h4>
                  <div className="grid grid-cols-3 gap-2">
                    <div className="rounded-xl bg-muted/30 px-3 py-2.5 text-center">
                      <div className="text-[10px] text-muted-foreground">30 Days</div>
                      <div className="text-sm font-bold font-mono">रु {(selectedBroker.thirtyDaysTurnover / 1e7).toFixed(1)}Cr</div>
                    </div>
                    <div className="rounded-xl bg-muted/30 px-3 py-2.5 text-center">
                      <div className="text-[10px] text-muted-foreground">Latest</div>
                      <div className="text-sm font-bold font-mono">रु {(selectedBroker.latestTurnover / 1e7).toFixed(1)}Cr</div>
                    </div>
                    <div className="rounded-xl bg-muted/30 px-3 py-2.5 text-center">
                      <div className="text-[10px] text-muted-foreground">Branch Avg</div>
                      <div className="text-sm font-bold font-mono">रु {selectedBroker.branchCount > 0 ? ((selectedBroker.thirtyDaysTurnover / selectedBroker.branchCount) / 1e7).toFixed(1) : "—"}Cr</div>
                    </div>
                  </div>
                </div>

                {/* Today Stats */}
                {selectedBroker.todayStats && (
                  <div>
                    <h4 className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground mb-2">
                      <Store className="h-3.5 w-3.5" /> Today's Activity
                    </h4>
                    <div className="grid grid-cols-3 gap-2">
                      <div className="rounded-xl bg-muted/30 px-3 py-2.5 text-center">
                        <div className="text-[10px] text-muted-foreground">Total</div>
                        <div className="text-sm font-bold font-mono">रु {(selectedBroker.todayStats.totalAmount / 1e7).toFixed(1)}Cr</div>
                      </div>
                      <div className="rounded-xl bg-emerald-50/50 dark:bg-emerald-950/20 px-3 py-2.5 text-center">
                        <div className="flex items-center justify-center gap-1 text-[10px] text-emerald-600 dark:text-emerald-400">
                          <ArrowUpCircle className="h-3 w-3" /> Buy
                        </div>
                        <div className="text-sm font-bold font-mono text-emerald-600 dark:text-emerald-400">रु {(selectedBroker.todayStats.buyAmount / 1e7).toFixed(1)}Cr</div>
                      </div>
                      <div className="rounded-xl bg-red-50/50 dark:bg-red-950/20 px-3 py-2.5 text-center">
                        <div className="flex items-center justify-center gap-1 text-[10px] text-red-600 dark:text-red-400">
                          <ArrowDownCircle className="h-3 w-3" /> Sell
                        </div>
                        <div className="text-sm font-bold font-mono text-red-600 dark:text-red-400">रु {(selectedBroker.todayStats.sellAmount / 1e7).toFixed(1)}Cr</div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Top Stock */}
                {selectedBroker.todayStats?.topStock && (
                  <div>
                    <h4 className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground mb-2">
                      <ShieldCheck className="h-3.5 w-3.5" /> Top Stock
                    </h4>
                    <div className="rounded-xl border bg-card px-4 py-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-semibold">{selectedBroker.todayStats.topStock.symbol}</div>
                          {selectedBroker.todayStats.topStock.name && (
                            <div className="text-xs text-muted-foreground">{selectedBroker.todayStats.topStock.name}</div>
                          )}
                        </div>
                        <div className="text-right">
                          <div className="text-xs text-muted-foreground">रु {(selectedBroker.todayStats.topStock.totalAmount / 1e7).toFixed(1)}Cr</div>
                          <div className="flex gap-2 text-[10px] mt-0.5">
                            <span className="text-emerald-600 dark:text-emerald-400">B: रु {(selectedBroker.todayStats.topStock.buyAmount / 1e7).toFixed(1)}Cr</span>
                            <span className="text-red-600 dark:text-red-400">S: रु {(selectedBroker.todayStats.topStock.sellAmount / 1e7).toFixed(1)}Cr</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Ratings & Service Quality */}
                {selectedBroker.rating.totalRatings > 0 && (
                  <div>
                    <h4 className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground mb-2">
                      <Star className="h-3.5 w-3.5 text-amber-500" /> Ratings & Service
                    </h4>
                    <div className="grid grid-cols-3 gap-2">
                      <div className="rounded-xl bg-amber-50/50 dark:bg-amber-950/20 px-3 py-2.5 text-center">
                        <div className="flex items-center justify-center gap-1 text-[10px] text-amber-600 dark:text-amber-400">
                          <Star className="h-3 w-3" /> Rating
                        </div>
                        <div className="text-sm font-bold">{selectedBroker.rating.averageRating.toFixed(1)}</div>
                        <div className="text-[10px] text-muted-foreground">({selectedBroker.rating.totalRatings})</div>
                      </div>
                      <div className="rounded-xl bg-muted/30 px-3 py-2.5 text-center">
                        <div className="flex items-center justify-center gap-1 text-[10px] text-muted-foreground">
                          <Clock className="h-3 w-3" /> Transfer
                        </div>
                        <div className="text-sm font-bold font-mono">{selectedBroker.rating.averageShareTransferDays}d</div>
                      </div>
                      <div className="rounded-xl bg-muted/30 px-3 py-2.5 text-center">
                        <div className="flex items-center justify-center gap-1 text-[10px] text-muted-foreground">
                          <DollarSign className="h-3 w-3" /> Cash Deposit
                        </div>
                        <div className="text-sm font-bold font-mono">{selectedBroker.rating.averageCashDepositDays}d</div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Sector */}
                {selectedBroker.topSector && (
                  <div className="flex items-center gap-2 rounded-xl bg-muted/40 px-3 py-2.5">
                    <Store className="h-4 w-4 text-muted-foreground shrink-0" />
                    <div className="min-w-0">
                      <div className="text-[10px] text-muted-foreground">Top Sector</div>
                      <div className="text-sm font-medium">{selectedBroker.topSector}</div>
                    </div>
                  </div>
                )}

                {/* TMS Link */}
                {selectedBroker.tmsLink && (
                  <a
                    href={selectedBroker.tmsLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2 rounded-xl bg-primary/10 px-4 py-3 text-sm font-medium text-primary hover:bg-primary/20 transition-colors"
                  >
                    <ExternalLink className="h-4 w-4" />
                    Open TMS Portal
                  </a>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
