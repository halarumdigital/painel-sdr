import React, { useState, useMemo } from "react";
import { useLocation } from "wouter";
import {
  Users,
  TrendingUp,
  Target,
  Search,
  MoreHorizontal,
  Phone,
  Mail,
  Calendar,
  ArrowUpRight,
  Loader2,
  RefreshCcw,
  Bell,
  Clock,
  CalendarDays,
  FileText,
  UserCheck,
  DollarSign,
  Percent,
  Timer,
  AlertTriangle,
  UserCheck2,
  UserX,
  LogOut,
  Shield
} from "lucide-react";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { format, subDays, isWithinInterval, parseISO, startOfDay, endOfDay, differenceInHours, differenceInDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Area,
  AreaChart
} from "recharts";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/auth-context";

// --- Configuration ---
const API_URL = "/api/leads";
const TEAM_API_URL = "/api/team";

interface CustomField {
  label: string;
  value: string;
}

interface Reminder {
  id: string;
  description: string;
  date: string;
  isnotified: string;
  rel_id: string;
  staff: string;
  rel_type: string;
  notify_by_email: string;
  creator: string;
  firstname: string;
  lastname: string;
  staff_email: string;
}

interface Lead {
  id: string;
  name: string;
  company: string;
  email: string;
  phonenumber?: string;
  status: string;
  status_name?: string;
  lead_value?: string;
  lastcontact?: string;
  dateadded?: string;
  assigned?: string;
  source_name?: string;
  last_status_change?: string;
  reminders?: Reminder[];
  customfields?: CustomField[];
}

interface TeamMember {
  id: string;
  staffid?: string;
  name: string;
  firstname?: string;
  lastname?: string;
  role: string;
  email: string;
  avatar_url?: string;
  profile_image?: string;
}

// Fallback avatars
const FALLBACK_AVATARS: Record<string, string> = {
  "Gilliard Damaceno": "https://i.pravatar.cc/150?u=gilliard",
  "Kauan Bastos": "https://i.pravatar.cc/150?u=kauan",
};

const getStatusColor = (status: string) => {
  const statusLower = (status || "").toLowerCase();
  if (statusLower.includes("capturado") || statusLower.includes("novo")) {
    return "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400";
  }
  if (statusLower.includes("contato") || statusLower.includes("contatado")) {
    return "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400";
  }
  if (statusLower.includes("reunião") || statusLower.includes("agendado")) {
    return "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400";
  }
  if (statusLower.includes("proposta")) {
    return "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400";
  }
  if (statusLower.includes("fechado") || statusLower.includes("ganho")) {
    return "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400";
  }
  if (statusLower.includes("perdido")) {
    return "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400";
  }
  return "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300";
};

export default function SdrDashboard() {
  const [, setLocation] = useLocation();
  const { user, logout, isAdmin } = useAuth();
  const [selectedSdrId, setSelectedSdrId] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [dateRange, setDateRange] = useState<{ from: Date; to: Date }>({
    from: subDays(new Date(), 30),
    to: new Date()
  });
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  const { toast } = useToast();

  // --- API Queries ---
  const { data: leads = [], isLoading: isLoadingLeads, refetch: refetchLeads } = useQuery<Lead[]>({
    queryKey: ["leads"],
    queryFn: async () => {
      const response = await fetch(API_URL);
      if (!response.ok) throw new Error(`Leads API Error: ${response.status}`);
      const data = await response.json();
      return Array.isArray(data) ? data : [];
    },
  });

  const { data: team = [], isLoading: isLoadingTeam, refetch: refetchTeam } = useQuery<TeamMember[]>({
    queryKey: ["team"],
    queryFn: async () => {
      const response = await fetch(TEAM_API_URL);
      if (!response.ok) return [];
      const data = await response.json();
      if (!Array.isArray(data)) return [];
      return data.map((staff: any) => ({
        id: staff.staffid || staff.id || "",
        name: staff.firstname && staff.lastname
          ? `${staff.firstname} ${staff.lastname}`.trim()
          : staff.name || "Sem Nome",
        role: staff.role || "SDR",
        email: staff.email || "",
        avatar_url: staff.profile_image || staff.avatar_url,
      }));
    },
  });

  const isLoading = isLoadingLeads || isLoadingTeam;

  const refetchAll = () => {
    refetchLeads();
    refetchTeam();
    toast({ title: "Dados atualizados", description: "Os dados foram recarregados com sucesso." });
  };

  // --- Filtered Data ---
  const filteredLeads = useMemo(() => {
    return leads.filter(lead => {
      // If user is SDR, only show their own leads
      if (!isAdmin && user?.staffId) {
        if (lead.assigned !== user.staffId) {
          return false;
        }
      }

      // Filter by SDR (only for admins)
      if (isAdmin && selectedSdrId !== "all" && lead.assigned !== selectedSdrId) {
        return false;
      }

      // Filter by date range
      if (lead.dateadded) {
        try {
          const leadDate = parseISO(lead.dateadded);
          if (!isWithinInterval(leadDate, { start: startOfDay(dateRange.from), end: endOfDay(dateRange.to) })) {
            return false;
          }
        } catch {
          // If date parsing fails, include the lead
        }
      }

      // Filter by search query
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        return (
          lead.name?.toLowerCase().includes(q) ||
          lead.company?.toLowerCase().includes(q) ||
          lead.phonenumber?.includes(q)
        );
      }

      return true;
    });
  }, [leads, selectedSdrId, dateRange, searchQuery, isAdmin, user?.staffId]);

  // --- KPI Calculations ---
  const totalLeads = filteredLeads.length;

  const meetingsScheduled = useMemo(() => {
    return filteredLeads.filter(lead => {
      // Count leads with reminders (meetings scheduled)
      if (lead.reminders && lead.reminders.length > 0) return true;
      // Or leads with status indicating meeting
      const status = (lead.status_name || "").toLowerCase();
      return status.includes("reunião") || status.includes("agendado");
    }).length;
  }, [filteredLeads]);

  const proposalsSent = useMemo(() => {
    return filteredLeads.filter(lead => {
      const status = lead.status_name || "";
      return status === "R1 - Proposta";
    }).length;
  }, [filteredLeads]);

  // Taxa de conversão: porcentagem de leads que chegaram em R1 - Proposta
  const conversionRate = useMemo(() => {
    // Se não houver leads, retornar 0
    if (filteredLeads.length === 0) return 0;

    // Calcular porcentagem de conversão para R1 - Proposta em relação ao total
    return Math.round((proposalsSent / filteredLeads.length) * 100);
  }, [filteredLeads, proposalsSent]);

  // Valor total dos leads no período
  const totalLeadValue = useMemo(() => {
    return filteredLeads.reduce((sum, lead) => {
      const value = parseFloat(lead.lead_value || "0") || 0;
      return sum + value;
    }, 0);
  }, [filteredLeads]);

  // Tempo médio até R1 - Proposta (da criação até mudança de status)
  const avgTimeToR1 = useMemo(() => {
    // Filtrar leads que estão em R1 - Proposta e têm ambas as datas
    const r1Leads = filteredLeads.filter(lead => {
      const status = lead.status_name || "";
      return status === "R1 - Proposta" && lead.dateadded && lead.last_status_change;
    });

    if (r1Leads.length === 0) return { hours: 0, display: "0h" };

    // Calcular a soma total de horas
    const totalHours = r1Leads.reduce((sum, lead) => {
      try {
        const created = parseISO(lead.dateadded!);
        const statusChanged = parseISO(lead.last_status_change!);
        const hours = differenceInHours(statusChanged, created);
        return sum + Math.max(0, hours);
      } catch {
        return sum;
      }
    }, 0);

    const avgHours = Math.round(totalHours / r1Leads.length);

    // Formatar para exibição
    if (avgHours < 24) {
      return { hours: avgHours, display: `${avgHours}h` };
    } else {
      const days = Math.floor(avgHours / 24);
      const remainingHours = avgHours % 24;
      return { hours: avgHours, display: `${days}d ${remainingHours}h` };
    }
  }, [filteredLeads]);

  // Formatar valor em moeda
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  // Leads sem atualização por 5 dias ou mais
  const staleLeads = useMemo(() => {
    const now = new Date();
    return filteredLeads.filter(lead => {
      // Usar last_status_change ou lastcontact ou dateadded como referência
      const lastUpdate = lead.last_status_change || lead.lastcontact || lead.dateadded;
      if (!lastUpdate) return false;

      try {
        const lastDate = parseISO(lastUpdate);
        const daysSinceUpdate = differenceInDays(now, lastDate);
        return daysSinceUpdate >= 5;
      } catch {
        return false;
      }
    });
  }, [filteredLeads]);

  // Função para buscar valor de campo personalizado
  const getCustomFieldValue = (lead: Lead, fieldLabel: string): string => {
    if (!lead.customfields) return "";
    const field = lead.customfields.find(
      cf => cf.label.toLowerCase() === fieldLabel.toLowerCase()
    );
    return field?.value || "";
  };

  // Taxa de Show e No Show baseado no campo "Resultado da reunião"
  const meetingResults = useMemo(() => {
    const leadsWithMeetingResult = filteredLeads.filter(lead => {
      const result = getCustomFieldValue(lead, "Resultado da reunião");
      return result !== "";
    });

    const showCount = filteredLeads.filter(lead => {
      const result = getCustomFieldValue(lead, "Resultado da reunião").toLowerCase();
      return result === "show" || result === "compareceu";
    }).length;

    const noShowCount = filteredLeads.filter(lead => {
      const result = getCustomFieldValue(lead, "Resultado da reunião").toLowerCase();
      return result === "no show" || result === "no-show" || result === "não compareceu" || result === "nao compareceu";
    }).length;

    const total = leadsWithMeetingResult.length;

    return {
      showCount,
      noShowCount,
      total,
      showRate: total > 0 ? Math.round((showCount / total) * 100) : 0,
      noShowRate: total > 0 ? Math.round((noShowCount / total) * 100) : 0,
    };
  }, [filteredLeads]);

  // --- Chart Data (Last 30 days evolution) ---
  const chartData = useMemo(() => {
    const days = 30;
    const data = [];

    for (let i = days - 1; i >= 0; i--) {
      const date = subDays(new Date(), i);
      const dateStr = format(date, "yyyy-MM-dd");
      const displayDate = format(date, "dd/MM", { locale: ptBR });

      const leadsOnDay = leads.filter(lead => {
        if (!lead.dateadded) return false;
        try {
          const leadDate = format(parseISO(lead.dateadded), "yyyy-MM-dd");
          return leadDate === dateStr;
        } catch {
          return false;
        }
      }).length;

      data.push({
        date: displayDate,
        leads: leadsOnDay
      });
    }

    return data;
  }, [leads]);

  // --- Get SDR name by ID ---
  const getSdrName = (assignedId: string) => {
    const sdr = team.find(t => t.id === assignedId);
    return sdr?.name || "Não atribuído";
  };

  const getSdrAvatar = (assignedId: string) => {
    const sdr = team.find(t => t.id === assignedId);
    return sdr?.avatar_url || FALLBACK_AVATARS[sdr?.name || ""] || `https://ui-avatars.com/api/?name=${encodeURIComponent(sdr?.name || "NA")}&background=random`;
  };

  const handleLogout = async () => {
    await logout();
    setLocation("/login");
  };

  return (
    <div className="min-h-screen bg-gray-50/50 dark:bg-gray-950 font-sans pb-10">
      {/* Header */}
      <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b bg-background/80 px-6 backdrop-blur-xl">
        <div className="flex items-center gap-2 font-semibold text-lg text-primary">
          <Target className="h-6 w-6" />
          <span>SalesFlow</span>
        </div>
        <nav className="ml-auto flex items-center gap-4">
          <div className="flex items-center gap-2 rounded-full px-3 py-1 text-xs border bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-400">
            <span className={`w-2 h-2 rounded-full ${isLoading ? 'bg-yellow-400 animate-pulse' : 'bg-green-500'}`}></span>
            {isLoading ? 'Sincronizando...' : 'Online (CRM)'}
          </div>
          {isAdmin && (
            <>
              <Button
                variant="outline"
                size="sm"
                className="gap-2"
                onClick={() => setLocation("/users")}
              >
                <Users className="h-4 w-4" />
                <span className="hidden sm:inline">Usuários</span>
              </Button>
              <Badge variant="outline" className="gap-1 bg-purple-100 text-purple-700 border-purple-200 dark:bg-purple-900/30 dark:text-purple-400">
                <Shield className="h-3 w-3" />
                Admin
              </Badge>
            </>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="flex items-center gap-2 h-9 px-2">
                <Avatar className="h-7 w-7">
                  <AvatarImage src={`https://ui-avatars.com/api/?name=${encodeURIComponent(user?.name || "User")}&background=random`} />
                  <AvatarFallback>{user?.name?.charAt(0) || "U"}</AvatarFallback>
                </Avatar>
                <span className="text-sm font-medium hidden sm:block">{user?.name}</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <div className="px-2 py-1.5 text-sm text-muted-foreground">
                {user?.username}
              </div>
              <DropdownMenuItem onClick={handleLogout} className="text-red-600 cursor-pointer">
                <LogOut className="mr-2 h-4 w-4" />
                Sair
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </nav>
      </header>

      <main className="container mx-auto p-6 space-y-6">
        {/* Title & Filters */}
        <div className="flex flex-col gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">
              {isAdmin ? "Dashboard SDR" : `Meus Leads`}
            </h1>
            <p className="text-muted-foreground mt-1">
              {isAdmin
                ? "Acompanhamento de leads e performance da equipe"
                : `Olá ${user?.name}, acompanhe seus leads e performance`
              }
            </p>
          </div>

          {/* Filters Row */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Refresh Button */}
            <Button variant="outline" size="icon" onClick={refetchAll} title="Recarregar Dados">
              <RefreshCcw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            </Button>

            {/* SDR Filter - Only visible for admins */}
            {isAdmin && (
              <Select value={selectedSdrId} onValueChange={setSelectedSdrId}>
                <SelectTrigger className="w-[200px] bg-background">
                  <UserCheck className="h-4 w-4 mr-2 text-muted-foreground" />
                  <SelectValue placeholder="Filtrar por SDR" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os SDRs</SelectItem>
                  {team.map(member => (
                    <SelectItem key={member.id} value={member.id}>{member.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            {/* Date Range Filter */}
            <Popover open={isDatePickerOpen} onOpenChange={setIsDatePickerOpen}>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-[280px] justify-start text-left font-normal">
                  <CalendarDays className="mr-2 h-4 w-4" />
                  {format(dateRange.from, "dd/MM/yyyy", { locale: ptBR })} - {format(dateRange.to, "dd/MM/yyyy", { locale: ptBR })}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <div className="flex">
                  <CalendarComponent
                    mode="range"
                    selected={{ from: dateRange.from, to: dateRange.to }}
                    onSelect={(range) => {
                      if (range?.from && range?.to) {
                        setDateRange({ from: range.from, to: range.to });
                      } else if (range?.from) {
                        setDateRange({ from: range.from, to: range.from });
                      }
                    }}
                    numberOfMonths={2}
                    locale={ptBR}
                  />
                </div>
                <div className="flex gap-2 p-3 border-t">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setDateRange({ from: subDays(new Date(), 7), to: new Date() })}
                  >
                    7 dias
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setDateRange({ from: subDays(new Date(), 30), to: new Date() })}
                  >
                    30 dias
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setDateRange({ from: subDays(new Date(), 90), to: new Date() })}
                  >
                    90 dias
                  </Button>
                </div>
              </PopoverContent>
            </Popover>

            {/* Search */}
            <div className="relative flex-1 max-w-xs">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Buscar lead..."
                className="pl-9 bg-background"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            <Button className="ml-auto shadow-lg shadow-primary/20">
              <ArrowUpRight className="mr-2 h-4 w-4" /> Exportar
            </Button>
          </div>
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="h-[200px] flex flex-col items-center justify-center space-y-4">
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
            <p className="text-muted-foreground animate-pulse">Carregando dados...</p>
          </div>
        )}

        {/* Content */}
        {!isLoading && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="space-y-6"
          >
            {/* KPI Cards */}
            <div className="grid gap-4 grid-cols-2 md:grid-cols-3 lg:grid-cols-6">
              {/* Total Leads Card */}
              <Card className="border-none shadow-sm bg-white dark:bg-card">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Leads no Período
                  </CardTitle>
                  <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                    <Users className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">{totalLeads}</div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {format(dateRange.from, "dd/MM")} - {format(dateRange.to, "dd/MM")}
                  </p>
                </CardContent>
              </Card>

              {/* Meetings Scheduled Card */}
              <Card className="border-none shadow-sm bg-white dark:bg-card">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Reuniões Marcadas
                  </CardTitle>
                  <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                    <Calendar className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">{meetingsScheduled}</div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Leads com lembretes ou agendamentos
                  </p>
                </CardContent>
              </Card>

              {/* Proposals Sent Card */}
              <Card className="border-none shadow-sm bg-white dark:bg-card">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Propostas Enviadas
                  </CardTitle>
                  <div className="p-2 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg">
                    <FileText className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">{proposalsSent}</div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Leads com status R1 - Proposta
                  </p>
                </CardContent>
              </Card>

              {/* Conversion Rate Card */}
              <Card className="border-none shadow-sm bg-white dark:bg-card">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Taxa de Conversão
                  </CardTitle>
                  <div className="p-2 bg-orange-100 dark:bg-orange-900/30 rounded-lg">
                    <Percent className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">{conversionRate}%</div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Lead → Proposta
                  </p>
                </CardContent>
              </Card>

              {/* Total Lead Value Card */}
              <Card className="border-none shadow-sm bg-white dark:bg-card">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Valor dos Leads
                  </CardTitle>
                  <div className="p-2 bg-cyan-100 dark:bg-cyan-900/30 rounded-lg">
                    <DollarSign className="h-5 w-5 text-cyan-600 dark:text-cyan-400" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{formatCurrency(totalLeadValue)}</div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Valor total no período
                  </p>
                </CardContent>
              </Card>

              {/* Time to R1 Card */}
              <Card className="border-none shadow-sm bg-white dark:bg-card">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Tempo até Reunião
                  </CardTitle>
                  <div className="p-2 bg-pink-100 dark:bg-pink-900/30 rounded-lg">
                    <Timer className="h-5 w-5 text-pink-600 dark:text-pink-400" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">{avgTimeToR1.display}</div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Criação até R1 - Proposta
                  </p>
                </CardContent>
              </Card>

            </div>

            {/* Alerta: Leads sem atualização por 5 dias */}
            {staleLeads.length > 0 && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="rounded-lg border-2 border-red-300 dark:border-red-800 bg-red-50 dark:bg-red-950/30 p-4"
              >
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2 bg-red-100 dark:bg-red-900/50 rounded-full animate-pulse">
                    <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-red-800 dark:text-red-300">
                      Leads sem atualização há 5+ dias
                    </h3>
                    <p className="text-sm text-red-600 dark:text-red-400">
                      {staleLeads.length} lead{staleLeads.length > 1 ? 's precisam' : ' precisa'} de atenção
                    </p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  {staleLeads.slice(0, 10).map((lead) => {
                    const lastUpdate = lead.last_status_change || lead.lastcontact || lead.dateadded;
                    const daysSince = lastUpdate ? differenceInDays(new Date(), parseISO(lastUpdate)) : 0;
                    return (
                      <div
                        key={lead.id}
                        className="flex items-center gap-2 px-3 py-2 bg-white dark:bg-gray-900 rounded-lg border border-red-200 dark:border-red-800 shadow-sm"
                      >
                        <div className="flex flex-col">
                          <span className="font-medium text-sm text-foreground">{lead.name}</span>
                          <span className="text-xs text-muted-foreground">
                            {lead.status_name || "Sem status"} • {daysSince} dias sem atualização
                          </span>
                        </div>
                        <Badge variant="destructive" className="ml-2 text-xs">
                          {daysSince}d
                        </Badge>
                      </div>
                    );
                  })}
                  {staleLeads.length > 10 && (
                    <div className="flex items-center px-3 py-2 text-sm text-red-600 dark:text-red-400">
                      +{staleLeads.length - 10} mais...
                    </div>
                  )}
                </div>
              </motion.div>
            )}

            {/* Chart and Side Cards */}
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
              {/* Chart */}
              <Card className="border-none shadow-sm bg-white dark:bg-card lg:col-span-3">
                <CardHeader>
                  <CardTitle>Evolução de Leads</CardTitle>
                  <CardDescription>Novos leads nos últimos 30 dias</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-[250px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={chartData}>
                        <defs>
                          <linearGradient id="colorLeads" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                            <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                        <XAxis
                          dataKey="date"
                          tick={{ fontSize: 12 }}
                          tickLine={false}
                          axisLine={false}
                        />
                        <YAxis
                          tick={{ fontSize: 12 }}
                          tickLine={false}
                          axisLine={false}
                          allowDecimals={false}
                        />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: 'hsl(var(--background))',
                            border: '1px solid hsl(var(--border))',
                            borderRadius: '8px'
                          }}
                          labelStyle={{ fontWeight: 'bold' }}
                        />
                        <Area
                          type="monotone"
                          dataKey="leads"
                          stroke="#3b82f6"
                          strokeWidth={2}
                          fillOpacity={1}
                          fill="url(#colorLeads)"
                          name="Leads"
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              {/* Side Cards */}
              <div className="flex flex-col gap-4">
                {/* Taxa de Show Card */}
                <Card className="border-none shadow-sm bg-white dark:bg-card flex-1">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      Taxa de Show
                    </CardTitle>
                    <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                      <UserCheck2 className="h-5 w-5 text-green-600 dark:text-green-400" />
                    </div>
                  </CardHeader>
                  <CardContent>
                    {meetingResults.total >= 5 ? (
                      <>
                        <div className="text-3xl font-bold text-green-600">{meetingResults.showRate}%</div>
                        <p className="text-xs text-muted-foreground mt-1">
                          {meetingResults.showCount} de {meetingResults.total} compareceram
                        </p>
                      </>
                    ) : (
                      <>
                        <div className="text-xl font-medium text-muted-foreground">Dados insuficientes</div>
                        <p className="text-xs text-muted-foreground mt-1">
                          Mínimo de 5 reuniões necessário
                        </p>
                      </>
                    )}
                  </CardContent>
                </Card>

                {/* Taxa de No Show Card */}
                <Card className="border-none shadow-sm bg-white dark:bg-card flex-1">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      Taxa de No Show
                    </CardTitle>
                    <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-lg">
                      <UserX className="h-5 w-5 text-red-600 dark:text-red-400" />
                    </div>
                  </CardHeader>
                  <CardContent>
                    {meetingResults.total >= 5 ? (
                      <>
                        <div className="text-3xl font-bold text-red-600">{meetingResults.noShowRate}%</div>
                        <p className="text-xs text-muted-foreground mt-1">
                          {meetingResults.noShowCount} de {meetingResults.total} não compareceram
                        </p>
                      </>
                    ) : (
                      <>
                        <div className="text-xl font-medium text-muted-foreground">Dados insuficientes</div>
                        <p className="text-xs text-muted-foreground mt-1">
                          Mínimo de 5 reuniões necessário
                        </p>
                      </>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>

            {/* Leads Table */}
            <Card className="border-none shadow-sm bg-white dark:bg-card">
              <CardHeader>
                <CardTitle>Leads ({filteredLeads.length})</CardTitle>
                <CardDescription>
                  Lista de leads no período selecionado
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead>Lead / Empresa</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Lembretes</TableHead>
                      <TableHead>SDR</TableHead>
                      <TableHead>Fonte</TableHead>
                      <TableHead>Data</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredLeads.length > 0 ? (
                      filteredLeads.map((lead) => (
                        <TableRow key={lead.id} className="group hover:bg-muted/30">
                          <TableCell>
                            <div className="flex flex-col">
                              <span className="font-medium text-foreground">{lead.name}</span>
                              <span className="text-xs text-muted-foreground">{lead.company || "—"}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="secondary" className={`font-normal ${getStatusColor(lead.status_name || "")}`}>
                              {lead.status_name || "Novo"}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {lead.reminders && lead.reminders.length > 0 ? (
                              <div className="flex flex-col gap-1">
                                {lead.reminders.slice(0, 2).map((reminder) => (
                                  <div key={reminder.id} className="flex items-center gap-2 text-xs bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 px-2 py-1 rounded-md border border-amber-200 dark:border-amber-800">
                                    <Bell className="h-3 w-3 flex-shrink-0" />
                                    <div className="flex flex-col min-w-0">
                                      <span className="font-medium truncate">{reminder.description}</span>
                                      <span className="text-amber-600 dark:text-amber-500 flex items-center gap-1">
                                        <Clock className="h-2.5 w-2.5" />
                                        {format(parseISO(reminder.date), "dd/MM HH:mm", { locale: ptBR })}
                                      </span>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <span className="text-muted-foreground text-xs">—</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Avatar className="h-6 w-6">
                                <AvatarImage src={getSdrAvatar(lead.assigned || "")} />
                                <AvatarFallback>SD</AvatarFallback>
                              </Avatar>
                              <span className="text-sm text-muted-foreground truncate max-w-[100px]">
                                {getSdrName(lead.assigned || "")}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <span className="text-sm text-muted-foreground">
                              {lead.source_name || "—"}
                            </span>
                          </TableCell>
                          <TableCell className="text-muted-foreground text-sm">
                            {lead.dateadded ? format(parseISO(lead.dateadded), "dd/MM/yyyy", { locale: ptBR }) : "—"}
                          </TableCell>
                          <TableCell className="text-right">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem>
                                  <Phone className="mr-2 h-4 w-4" /> Ligar
                                </DropdownMenuItem>
                                <DropdownMenuItem>
                                  <Mail className="mr-2 h-4 w-4" /> Enviar Email
                                </DropdownMenuItem>
                                <DropdownMenuItem>
                                  <Calendar className="mr-2 h-4 w-4" /> Agendar
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                          Nenhum lead encontrado no período selecionado.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </main>
    </div>
  );
}
