import React, { useState, useMemo, useEffect } from "react";
import {
  Users,
  TrendingUp,
  Target,
  Search,
  MoreHorizontal,
  Phone,
  Mail,
  Calendar,
  Filter,
  ArrowUpRight,
  ChevronDown,
  Loader2,
  RefreshCcw,
  Briefcase,
  AlertCircle
} from "lucide-react";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";

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
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";

// --- Configuration ---
const API_URL = "https://crm.halarum.dev/api/leads";
const TEAM_API_URL = "https://crm.halarum.dev/api/team"; 
const API_TOKEN = "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJ1c2VyIjoiY3JtIiwibmFtZSI6ImNybSIsIkFQSV9USU1FIjoxNzY2MjM5NzU0fQ.3o4sLYLwdi7cnceRp3HjtmPkCYk3HDFOTzaTXhJNfYw";

type LeadStatus = "Novo" | "Contatado" | "Em Negociação" | "Qualificado" | "Fechado" | "Perdido";

interface Lead {
  id: string;
  name: string;
  company: string;
  email: string;
  phone: string;
  status: LeadStatus;
  value: number;
  lastContact: string;
  sdr_name?: string; 
  sdr_id?: string;
}

interface TeamMember {
  id: string;
  name: string;
  role: string;
  email: string;
  avatar_url?: string;
  performance?: number;
}

interface SDR extends TeamMember {
  leads: Lead[];
  performance: number;
}

const getStatusColor = (status: string) => {
  switch (status) {
    case "Novo": return "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400";
    case "Contatado": return "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400";
    case "Em Negociação": return "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400";
    case "Qualificado": return "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400";
    case "Fechado": return "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400";
    case "Perdido": return "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400";
    default: return "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300";
  }
};

// Fallback avatars if API doesn't provide them
const FALLBACK_AVATARS: Record<string, string> = {
  "Ana Silva": "https://i.pravatar.cc/150?u=ana",
  "Carlos Mendes": "https://i.pravatar.cc/150?u=carlos",
  "Mariana Costa": "https://i.pravatar.cc/150?u=mariana",
  "Roberto Lima": "https://i.pravatar.cc/150?u=roberto",
};

// --- Mock Data Generators ---

const generateMockLeads = (count: number): Lead[] => {
  const statuses: LeadStatus[] = ["Novo", "Contatado", "Em Negociação", "Qualificado", "Fechado", "Perdido"];
  const companies = ["TechCorp", "InnovateLtda", "GlobalSolutions", "AlphaIndustries", "OmegaSoft", "BetaSystems", "GammaGroup"];
  const sdrNames = Object.keys(FALLBACK_AVATARS);
  
  return Array.from({ length: count }).map((_, i) => ({
    id: `mock-lead-${Math.random().toString(36).substr(2, 9)}`,
    name: `Lead Cliente ${i + 1}`,
    company: companies[Math.floor(Math.random() * companies.length)],
    email: `contato${i}@exemplo.com`,
    phone: `(11) 9${Math.floor(Math.random() * 90000000 + 10000000)}`,
    status: statuses[Math.floor(Math.random() * statuses.length)],
    value: Math.floor(Math.random() * 50000) + 1000,
    lastContact: new Date(Date.now() - Math.floor(Math.random() * 1000000000)).toLocaleDateString('pt-BR'),
    sdr_name: sdrNames[Math.floor(Math.random() * sdrNames.length)]
  }));
};

const MOCK_TEAM: TeamMember[] = [
  { id: "sdr-1", name: "Ana Silva", role: "Senior SDR", email: "ana@company.com", avatar_url: FALLBACK_AVATARS["Ana Silva"], performance: 92 },
  { id: "sdr-2", name: "Carlos Mendes", role: "SDR Pleno", email: "carlos@company.com", avatar_url: FALLBACK_AVATARS["Carlos Mendes"], performance: 78 },
  { id: "sdr-3", name: "Mariana Costa", role: "SDR Júnior", email: "mariana@company.com", avatar_url: FALLBACK_AVATARS["Mariana Costa"], performance: 85 },
  { id: "sdr-4", name: "Roberto Lima", role: "Senior SDR", email: "roberto@company.com", avatar_url: FALLBACK_AVATARS["Roberto Lima"], performance: 64 },
];

export default function SdrDashboard() {
  const [selectedSdrId, setSelectedSdrId] = useState<string | "all">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [usingMockData, setUsingMockData] = useState(false);
  const { toast } = useToast();

  // --- API Queries ---
  
  const { data: leads = [], isLoading: isLoadingLeads, isError: isLeadsError, refetch: refetchLeads } = useQuery<Lead[]>({
    queryKey: ["leads"],
    queryFn: async () => {
      try {
        const response = await fetch(API_URL, {
          headers: { "Authorization": `Bearer ${API_TOKEN}`, "Content-Type": "application/json" }
        });
        if (!response.ok) throw new Error(`Leads API Error: ${response.status}`);
        const data = await response.json();
        setUsingMockData(false);
        return Array.isArray(data) ? data : [];
      } catch (error) {
        console.warn("API Error, falling back to mock data", error);
        setUsingMockData(true);
        // Fallback to mock data with a slight delay to simulate "try"
        return new Promise(resolve => setTimeout(() => resolve(generateMockLeads(25)), 800));
      }
    },
  });

  const { data: team = [], isLoading: isLoadingTeam, isError: isTeamError, refetch: refetchTeam } = useQuery<TeamMember[]>({
    queryKey: ["team"],
    queryFn: async () => {
      try {
        const response = await fetch(TEAM_API_URL, {
          headers: { "Authorization": `Bearer ${API_TOKEN}`, "Content-Type": "application/json" }
        });
        
        if (!response.ok) {
           console.warn("Team API not available, using inferred data");
           return MOCK_TEAM; 
        }
        
        const data = await response.json();
        return Array.isArray(data) ? data : [];
      } catch (err) {
        console.warn("Failed to fetch team, falling back to mock", err);
        return MOCK_TEAM;
      }
    },
  });

  useEffect(() => {
    if (usingMockData) {
      toast({
        variant: "destructive", // Using destructive style to draw attention, but message is informational
        title: "Modo de Demonstração",
        description: "Não foi possível conectar à API (Bloqueio CORS/Firewall). Exibindo dados de exemplo.",
        duration: 5000,
      });
    }
  }, [usingMockData, toast]);

  const isLoading = isLoadingLeads || isLoadingTeam;
  const isError = false; // We handle errors gracefully now by showing mock data

  const refetchAll = () => {
    refetchLeads();
    refetchTeam();
  };

  // --- Data Processing ---
  const sdrs = useMemo(() => {
    const sdrMap = new Map<string, SDR>();

    // 1. Initialize with real team members from API if available
    team.forEach(member => {
       sdrMap.set(member.name, {
         ...member,
         leads: [],
         performance: member.performance || Math.floor(Math.random() * 30) + 70, // Mock performance if missing
         avatar_url: member.avatar_url || FALLBACK_AVATARS[member.name] || `https://ui-avatars.com/api/?name=${member.name}&background=random`
       });
    });

    // 2. Distribute leads to SDRs
    leads.forEach(lead => {
      const sdrName = lead.sdr_name || "Não Atribuído";
      
      // If SDR doesn't exist in team list (or team list was empty), create entry
      if (!sdrMap.has(sdrName)) {
        sdrMap.set(sdrName, {
          id: `inferred-${sdrName.replace(/\s+/g, '-').toLowerCase()}`,
          name: sdrName,
          role: "SDR",
          email: `${sdrName.split(' ')[0].toLowerCase()}@company.com`,
          avatar_url: FALLBACK_AVATARS[sdrName] || `https://ui-avatars.com/api/?name=${sdrName}&background=random`,
          performance: Math.floor(Math.random() * 30) + 70,
          leads: []
        });
      }
      
      sdrMap.get(sdrName)?.leads.push(lead);
    });

    // Convert to array and sort
    return Array.from(sdrMap.values()).sort((a, b) => b.leads.length - a.leads.length);
  }, [leads, team]);

  const filteredSdrs = selectedSdrId === "all" 
    ? sdrs 
    : sdrs.filter(sdr => sdr.id === selectedSdrId);

  // Helper to get all filtered leads for display
  const displayLeads = useMemo(() => {
    let currentLeads = filteredSdrs.flatMap(sdr => 
      sdr.leads.map(lead => ({ ...lead, sdrName: sdr.name, sdrAvatar: sdr.avatar_url }))
    );

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      currentLeads = currentLeads.filter(lead => 
        lead.name.toLowerCase().includes(q) ||
        (lead.company && lead.company.toLowerCase().includes(q)) ||
        (lead.sdrName && lead.sdrName.toLowerCase().includes(q))
      );
    }
    return currentLeads;
  }, [filteredSdrs, searchQuery]);

  // Metrics
  const totalPipelineValue = displayLeads.reduce((acc, lead) => acc + (Number(lead.value) || 0), 0);
  const conversionRate = displayLeads.length ? (displayLeads.filter(l => l.status === "Fechado").length / displayLeads.length * 100) : 0;

  return (
    <div className="min-h-screen bg-gray-50/50 dark:bg-gray-950 font-sans pb-10">
      {/* Header */}
      <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b bg-background/80 px-6 backdrop-blur-xl">
        <div className="flex items-center gap-2 font-semibold text-lg text-primary">
          <Target className="h-6 w-6" />
          <span>SalesFlow</span>
        </div>
        <nav className="ml-auto flex items-center gap-4">
          <div className={`flex items-center gap-2 rounded-full px-3 py-1 text-xs border transition-colors ${
            usingMockData 
              ? 'bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-900/30 dark:text-orange-400' 
              : 'bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-400'
          }`}>
             <span className={`w-2 h-2 rounded-full ${isLoading ? 'bg-yellow-400 animate-pulse' : usingMockData ? 'bg-orange-500' : 'bg-green-500'}`}></span>
             {isLoading ? 'Sincronizando...' : usingMockData ? 'Modo Demo (Offline)' : 'Online (CRM)'}
          </div>
          <Button variant="ghost" size="sm" className="text-muted-foreground">Dashboard</Button>
          <Separator orientation="vertical" className="h-6" />
          <Avatar className="h-8 w-8 cursor-pointer">
            <AvatarImage src="https://github.com/shadcn.png" />
            <AvatarFallback>AD</AvatarFallback>
          </Avatar>
        </nav>
      </header>

      <main className="container mx-auto p-6 space-y-8">
        {/* Title & Actions */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">Visão Geral de Leads</h1>
            <p className="text-muted-foreground mt-1">
              Gerenciamento de equipe e pipeline de vendas.
            </p>
          </div>
          <div className="flex items-center gap-2">
             {usingMockData && (
               <div className="hidden md:flex items-center text-xs text-orange-600 bg-orange-50 px-3 py-2 rounded-md border border-orange-200 mr-2">
                 <AlertCircle className="w-3 h-3 mr-1.5" />
                 Conexão API bloqueada. Exibindo dados locais.
               </div>
             )}
            <Button variant="outline" size="icon" onClick={refetchAll} title="Recarregar Dados">
               <RefreshCcw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            </Button>
            <Select value={selectedSdrId} onValueChange={setSelectedSdrId}>
              <SelectTrigger className="w-[200px] bg-background">
                <SelectValue placeholder="Filtrar por SDR" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os SDRs</SelectItem>
                {sdrs.map(sdr => (
                  <SelectItem key={sdr.id} value={sdr.id}>{sdr.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button className="shadow-lg shadow-primary/20">
              <ArrowUpRight className="mr-2 h-4 w-4" /> Exportar Relatório
            </Button>
          </div>
        </div>

        {/* Loading State */}
        {isLoading && !usingMockData && (
           <div className="h-[400px] flex flex-col items-center justify-center space-y-4">
             <Loader2 className="h-10 w-10 animate-spin text-primary" />
             <p className="text-muted-foreground animate-pulse">Carregando dados da equipe e leads...</p>
           </div>
        )}

        {/* Content - Always Show (Mock or Real) */}
        {!isLoading && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }} 
            animate={{ opacity: 1, y: 0 }} 
            transition={{ duration: 0.4 }}
          >
            {/* KPI Cards */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-6">
              <Card className="border-none shadow-sm bg-white dark:bg-card">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Total de Leads
                  </CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{displayLeads.length}</div>
                </CardContent>
              </Card>
              <Card className="border-none shadow-sm bg-white dark:bg-card">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Pipeline Total
                  </CardTitle>
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalPipelineValue)}
                  </div>
                </CardContent>
              </Card>
              <Card className="border-none shadow-sm bg-white dark:bg-card">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Taxa de Conversão
                  </CardTitle>
                  <Target className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{conversionRate.toFixed(1)}%</div>
                </CardContent>
              </Card>
              <Card className="border-none shadow-sm bg-white dark:bg-card">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Membros da Equipe
                  </CardTitle>
                  <Briefcase className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{sdrs.length}</div>
                </CardContent>
              </Card>
            </div>

            <div className="grid gap-6 md:grid-cols-7">
              {/* SDR List */}
              <Card className="md:col-span-2 border-none shadow-sm h-fit bg-white dark:bg-card overflow-hidden">
                <CardHeader>
                  <CardTitle>Equipe de Vendas</CardTitle>
                  <CardDescription>Performance e Leads</CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="space-y-0">
                    {sdrs.map((sdr) => (
                      <div 
                        key={sdr.id} 
                        onClick={() => setSelectedSdrId(sdr.id === selectedSdrId ? "all" : sdr.id)}
                        className={`
                          flex items-center gap-4 p-4 cursor-pointer transition-colors border-l-4
                          ${selectedSdrId === sdr.id 
                            ? "bg-primary/5 border-primary" 
                            : "hover:bg-muted/50 border-transparent"
                          }
                        `}
                      >
                        <Avatar>
                          <AvatarImage src={sdr.avatar_url} />
                          <AvatarFallback>{sdr.name.substring(0, 2)}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1 overflow-hidden">
                          <h4 className="font-medium truncate">{sdr.name}</h4>
                          <div className="flex items-center text-xs text-muted-foreground gap-2">
                             <span className="truncate max-w-[80px]">{sdr.role}</span>
                             <span>•</span>
                             <span>{sdr.leads.length} Leads</span>
                          </div>
                        </div>
                      </div>
                    ))}
                    
                    <div 
                      onClick={() => setSelectedSdrId("all")}
                      className={`
                        p-3 text-center text-sm font-medium cursor-pointer transition-colors border-t
                        ${selectedSdrId === "all" ? "text-primary bg-primary/5" : "text-muted-foreground hover:bg-muted/50"}
                      `}
                    >
                      Ver Todos
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Leads Table */}
              <Card className="md:col-span-5 border-none shadow-sm bg-white dark:bg-card">
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle>
                      {selectedSdrId === "all" ? "Todos os Leads" : `Leads de ${filteredSdrs[0]?.name}`}
                    </CardTitle>
                    <CardDescription>
                      {displayLeads.length} leads em carteira
                    </CardDescription>
                  </div>
                  <div className="relative w-64">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      type="search"
                      placeholder="Buscar lead, empresa..."
                      className="pl-9 bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-800"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </div>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow className="hover:bg-transparent">
                        <TableHead>Lead / Empresa</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Valor</TableHead>
                        {selectedSdrId === "all" && <TableHead>SDR Responsável</TableHead>}
                        <TableHead>Último Contato</TableHead>
                        <TableHead className="text-right">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {displayLeads.length > 0 ? (
                        displayLeads.map((lead) => (
                          <TableRow key={lead.id} className="group hover:bg-muted/30">
                            <TableCell>
                              <div className="flex flex-col">
                                <span className="font-medium text-foreground">{lead.name}</span>
                                <span className="text-xs text-muted-foreground">{lead.company || "Empresa não informada"}</span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge variant="secondary" className={`font-normal ${getStatusColor(lead.status)}`}>
                                {lead.status}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(lead.value) || 0)}
                            </TableCell>
                            {selectedSdrId === "all" && (
                              <TableCell>
                                <div className="flex items-center gap-2">
                                  <Avatar className="h-6 w-6">
                                    <AvatarImage src={lead.sdrAvatar} />
                                    <AvatarFallback>SDR</AvatarFallback>
                                  </Avatar>
                                  <span className="text-sm text-muted-foreground">{lead.sdrName}</span>
                                </div>
                              </TableCell>
                            )}
                            <TableCell className="text-muted-foreground text-sm">
                              {lead.lastContact || "Recentemente"}
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
                                    <Calendar className="mr-2 h-4 w-4" /> Agendar Reunião
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                            Nenhum lead encontrado.
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </div>
          </motion.div>
        )}
      </main>
    </div>
  );
}
