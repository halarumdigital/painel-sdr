import React, { useState, useMemo } from "react";
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
  RefreshCcw
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

// --- Configuration ---
// In a real app with Vite, these should be import.meta.env.VITE_CRM_API_URL
// We are using the provided values directly for this prototype connection
const API_URL = "https://crm.halarum.dev/api/leads";
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
  sdr_name?: string; // API might return this
}

interface SDR {
  id: string;
  name: string;
  role: string;
  avatar?: string;
  email: string;
  performance: number; // 0-100
  leads: Lead[];
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

// Default SDRs metadata to map names to avatars
const SDR_METADATA: Record<string, Partial<SDR>> = {
  "Ana Silva": { role: "Senior SDR", avatar: "https://i.pravatar.cc/150?u=ana", performance: 88 },
  "Carlos Mendes": { role: "SDR Pleno", avatar: "https://i.pravatar.cc/150?u=carlos", performance: 72 },
  "Mariana Costa": { role: "SDR Júnior", avatar: "https://i.pravatar.cc/150?u=mariana", performance: 94 },
  "Roberto Lima": { role: "Senior SDR", avatar: "https://i.pravatar.cc/150?u=roberto", performance: 65 },
};

export default function SdrDashboard() {
  const [selectedSdrId, setSelectedSdrId] = useState<string | "all">("all");
  const [searchQuery, setSearchQuery] = useState("");

  // --- API Query ---
  const { data: leads = [], isLoading, isError, refetch } = useQuery<Lead[]>({
    queryKey: ["leads"],
    queryFn: async () => {
      try {
        const response = await fetch(API_URL, {
          headers: {
            "Authorization": `Bearer ${API_TOKEN}`,
            "Content-Type": "application/json"
          }
        });
        
        if (!response.ok) {
          throw new Error(`API Error: ${response.status}`);
        }
        
        const data = await response.json();
        return Array.isArray(data) ? data : [];
      } catch (error) {
        console.error("Failed to fetch leads:", error);
        throw error;
      }
    },
  });

  // --- Data Processing ---
  const sdrs = useMemo(() => {
    // Group leads by SDR Name
    const sdrMap = new Map<string, Lead[]>();
    
    leads.forEach(lead => {
      const sdrName = lead.sdr_name || "Não Atribuído";
      if (!sdrMap.has(sdrName)) {
        sdrMap.set(sdrName, []);
      }
      sdrMap.get(sdrName)?.push(lead);
    });

    // Convert map to SDR array
    const sdrList: SDR[] = Array.from(sdrMap.entries()).map(([name, leads], index) => {
      const meta = SDR_METADATA[name] || {};
      return {
        id: `sdr-${name.replace(/\s+/g, '-').toLowerCase()}`,
        name,
        role: meta.role || "SDR",
        avatar: meta.avatar,
        email: `${name.split(' ')[0].toLowerCase()}@company.com`,
        performance: meta.performance || Math.floor(Math.random() * 30) + 70, // Fallback random performance
        leads
      };
    });

    return sdrList.sort((a, b) => b.leads.length - a.leads.length);
  }, [leads]);

  const filteredSdrs = selectedSdrId === "all" 
    ? sdrs 
    : sdrs.filter(sdr => sdr.id === selectedSdrId);

  // Helper to get all filtered leads
  const displayLeads = useMemo(() => {
    let currentLeads = filteredSdrs.flatMap(sdr => 
      sdr.leads.map(lead => ({ ...lead, sdrName: sdr.name, sdrAvatar: sdr.avatar }))
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
          <div className="flex items-center gap-2 bg-muted/50 rounded-full px-3 py-1 text-xs text-muted-foreground border">
             <span className={`w-2 h-2 rounded-full ${isLoading ? 'bg-yellow-400 animate-pulse' : isError ? 'bg-red-500' : 'bg-green-500'}`}></span>
             {isLoading ? 'Conectando API...' : isError ? 'Erro de Conexão' : 'Conectado ao CRM'}
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
            <p className="text-muted-foreground mt-1">Acompanhe o desempenho e os leads de cada SDR em tempo real.</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" onClick={() => refetch()} title="Recarregar Dados">
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
        {isLoading && (
           <div className="h-[400px] flex flex-col items-center justify-center space-y-4">
             <Loader2 className="h-10 w-10 animate-spin text-primary" />
             <p className="text-muted-foreground animate-pulse">Carregando dados da API...</p>
           </div>
        )}

        {/* Error State */}
        {isError && (
          <div className="p-8 border border-red-200 bg-red-50 rounded-lg text-center">
            <p className="text-red-600 font-medium">Não foi possível carregar os leads.</p>
            <p className="text-sm text-red-500 mt-1">Verifique sua conexão ou a chave de API.</p>
            <Button variant="outline" className="mt-4 border-red-200 text-red-700 hover:bg-red-100" onClick={() => refetch()}>
              Tentar Novamente
            </Button>
          </div>
        )}

        {/* Content */}
        {!isLoading && !isError && (
          <>
            {/* KPI Cards */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
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
                    SDRs Ativos
                  </CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
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
                  <CardTitle>Equipe de SDRs</CardTitle>
                  <CardDescription>Desempenho da API</CardDescription>
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
                          <AvatarImage src={sdr.avatar} />
                          <AvatarFallback>{sdr.name.substring(0, 2)}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1 overflow-hidden">
                          <h4 className="font-medium truncate">{sdr.name}</h4>
                          <div className="flex items-center text-xs text-muted-foreground gap-2">
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
                      {displayLeads.length} leads recuperados
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
          </>
        )}
      </main>
    </div>
  );
}
