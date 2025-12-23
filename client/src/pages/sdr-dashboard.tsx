import React, { useState } from "react";
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
  ChevronDown
} from "lucide-react";
import { motion } from "framer-motion";

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

// --- Mock Data ---

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

const generateLeads = (count: number): Lead[] => {
  const statuses: LeadStatus[] = ["Novo", "Contatado", "Em Negociação", "Qualificado", "Fechado", "Perdido"];
  const companies = ["TechCorp", "InnovateLtda", "GlobalSolutions", "AlphaIndustries", "OmegaSoft", "BetaSystems", "GammaGroup"];
  
  return Array.from({ length: count }).map((_, i) => ({
    id: `lead-${Math.random().toString(36).substr(2, 9)}`,
    name: `Lead Cliente ${i + 1}`,
    company: companies[Math.floor(Math.random() * companies.length)],
    email: `contato${i}@exemplo.com`,
    phone: `(11) 9${Math.floor(Math.random() * 90000000 + 10000000)}`,
    status: statuses[Math.floor(Math.random() * statuses.length)],
    value: Math.floor(Math.random() * 50000) + 1000,
    lastContact: new Date(Date.now() - Math.floor(Math.random() * 1000000000)).toLocaleDateString('pt-BR'),
  }));
};

const SDR_DATA: SDR[] = [
  {
    id: "sdr-1",
    name: "Ana Silva",
    role: "Senior SDR",
    email: "ana.silva@company.com",
    avatar: "https://i.pravatar.cc/150?u=ana",
    performance: 88,
    leads: generateLeads(12),
  },
  {
    id: "sdr-2",
    name: "Carlos Mendes",
    role: "SDR Pleno",
    email: "carlos.mendes@company.com",
    avatar: "https://i.pravatar.cc/150?u=carlos",
    performance: 72,
    leads: generateLeads(8),
  },
  {
    id: "sdr-3",
    name: "Mariana Costa",
    role: "SDR Júnior",
    email: "mariana.costa@company.com",
    avatar: "https://i.pravatar.cc/150?u=mariana",
    performance: 94,
    leads: generateLeads(15),
  },
  {
    id: "sdr-4",
    name: "Roberto Lima",
    role: "Senior SDR",
    email: "roberto.lima@company.com",
    avatar: "https://i.pravatar.cc/150?u=roberto",
    performance: 65,
    leads: generateLeads(6),
  },
];

const getStatusColor = (status: LeadStatus) => {
  switch (status) {
    case "Novo": return "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400";
    case "Contatado": return "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400";
    case "Em Negociação": return "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400";
    case "Qualificado": return "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400";
    case "Fechado": return "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400";
    case "Perdido": return "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400";
    default: return "bg-gray-100 text-gray-700";
  }
};

// --- Components ---

export default function SdrDashboard() {
  const [selectedSdrId, setSelectedSdrId] = useState<string | "all">("all");
  const [searchQuery, setSearchQuery] = useState("");

  const filteredSdrs = selectedSdrId === "all" 
    ? SDR_DATA 
    : SDR_DATA.filter(sdr => sdr.id === selectedSdrId);

  // Flatten leads if looking at all, or just selected SDR's leads
  const allLeads = filteredSdrs.flatMap(sdr => sdr.leads.map(lead => ({ ...lead, sdrName: sdr.name, sdrAvatar: sdr.avatar })));
  
  const filteredLeads = allLeads.filter(lead => 
    lead.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    lead.company.toLowerCase().includes(searchQuery.toLowerCase()) ||
    lead.sdrName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalPipelineValue = filteredLeads.reduce((acc, lead) => acc + lead.value, 0);
  const conversionRate = (filteredLeads.filter(l => l.status === "Fechado").length / filteredLeads.length * 100) || 0;

  return (
    <div className="min-h-screen bg-gray-50/50 dark:bg-gray-950 font-sans pb-10">
      {/* Header */}
      <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b bg-background/80 px-6 backdrop-blur-xl">
        <div className="flex items-center gap-2 font-semibold text-lg text-primary">
          <Target className="h-6 w-6" />
          <span>SalesFlow</span>
        </div>
        <nav className="ml-auto flex items-center gap-4">
          <Button variant="ghost" size="sm" className="text-muted-foreground">Dashboard</Button>
          <Button variant="ghost" size="sm" className="text-muted-foreground">Relatórios</Button>
          <Button variant="ghost" size="sm" className="text-muted-foreground">Configurações</Button>
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
            <p className="text-muted-foreground mt-1">Acompanhe o desempenho e os leads de cada SDR.</p>
          </div>
          <div className="flex items-center gap-2">
            <Select value={selectedSdrId} onValueChange={setSelectedSdrId}>
              <SelectTrigger className="w-[200px] bg-background">
                <SelectValue placeholder="Filtrar por SDR" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os SDRs</SelectItem>
                {SDR_DATA.map(sdr => (
                  <SelectItem key={sdr.id} value={sdr.id}>{sdr.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button className="shadow-lg shadow-primary/20">
              <ArrowUpRight className="mr-2 h-4 w-4" /> Exportar Relatório
            </Button>
          </div>
        </div>

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
              <div className="text-2xl font-bold">{filteredLeads.length}</div>
              <p className="text-xs text-muted-foreground mt-1">
                <span className="text-emerald-500 font-medium">+12%</span> em relação ao mês passado
              </p>
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
              <p className="text-xs text-muted-foreground mt-1">
                Valor estimado em negociação
              </p>
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
              <p className="text-xs text-muted-foreground mt-1">
                Leads convertidos em vendas
              </p>
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
              <div className="text-2xl font-bold">{filteredSdrs.length}</div>
              <p className="text-xs text-muted-foreground mt-1">
                Equipe de prospecção
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Area */}
        <div className="grid gap-6 md:grid-cols-7">
          
          {/* SDR List (Sidebar-ish on desktop) */}
          <Card className="md:col-span-2 border-none shadow-sm h-fit bg-white dark:bg-card overflow-hidden">
            <CardHeader>
              <CardTitle>Equipe de SDRs</CardTitle>
              <CardDescription>Desempenho individual</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <div className="space-y-0">
                {SDR_DATA.map((sdr, index) => (
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
                        <span>•</span>
                        <span className={sdr.performance > 80 ? "text-emerald-600" : "text-yellow-600"}>
                          {sdr.performance}% Perf.
                        </span>
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
                <CardDescription>Gerencie e acompanhe o status dos leads.</CardDescription>
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
                  {filteredLeads.length > 0 ? (
                    filteredLeads.map((lead) => (
                      <TableRow key={lead.id} className="group hover:bg-muted/30">
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="font-medium text-foreground">{lead.name}</span>
                            <span className="text-xs text-muted-foreground">{lead.company}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary" className={`font-normal ${getStatusColor(lead.status)}`}>
                            {lead.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(lead.value)}
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
                          {lead.lastContact}
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
                              <Separator className="my-1" />
                              <DropdownMenuItem className="text-destructive">
                                Arquivar Lead
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
      </main>
    </div>
  );
}
