import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";

const CRM_API_URL = process.env.CRM_API_URL || "https://crm.halarum.dev/api/leads";
const CRM_API_TOKEN = process.env.CRM_API_TOKEN || "";

// Debug: log environment variables on startup
console.log("[CRM Config] URL:", CRM_API_URL);
console.log("[CRM Config] Token loaded:", CRM_API_TOKEN ? "Yes (length: " + CRM_API_TOKEN.length + ")" : "No");

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  // Proxy route for leads API
  app.get("/api/leads", async (req, res) => {
    try {
      const response = await fetch(CRM_API_URL, {
        headers: {
          "authtoken": CRM_API_TOKEN,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`[CRM API] Leads error ${response.status}:`, errorText);
        return res.status(response.status).json({
          error: `CRM API Error: ${response.status}`,
          details: errorText
        });
      }

      const data = await response.json();
      console.log("[CRM API] Leads fetched successfully, count:", Array.isArray(data) ? data.length : "not array");
      // Log first lead structure to see reminders
      if (Array.isArray(data) && data.length > 0) {
        console.log("[CRM API] First lead structure:", JSON.stringify(data[0], null, 2));
      }
      res.json(data);
    } catch (error) {
      console.error("Error fetching leads from CRM:", error);
      res.status(500).json({ error: "Failed to fetch leads from CRM" });
    }
  });

  // Proxy route for staff API - fetch staff by ID
  app.get("/api/staff/:id", async (req, res) => {
    try {
      const staffApiUrl = CRM_API_URL.replace("/leads/", `/staffs/${req.params.id}`);
      const response = await fetch(staffApiUrl, {
        headers: {
          "authtoken": CRM_API_TOKEN,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`[CRM API] Staff error ${response.status}:`, errorText);
        return res.status(response.status).json({
          error: `CRM API Error: ${response.status}`,
          details: errorText
        });
      }

      const data = await response.json();
      res.json(data);
    } catch (error) {
      console.error("Error fetching staff from CRM:", error);
      res.status(500).json({ error: "Failed to fetch staff from CRM" });
    }
  });

  // Proxy route for team API - fetch all staffs from leads
  app.get("/api/team", async (req, res) => {
    try {
      // First, get all leads to extract unique staff IDs
      const leadsResponse = await fetch(CRM_API_URL, {
        headers: {
          "authtoken": CRM_API_TOKEN,
          "Content-Type": "application/json",
        },
      });

      if (!leadsResponse.ok) {
        return res.status(leadsResponse.status).json({ error: "Failed to fetch leads" });
      }

      const leads = await leadsResponse.json();

      // Extract unique staff IDs from leads (field is "assigned")
      const allIds = (Array.isArray(leads) ? leads : [])
        .map((lead: any) => lead.assigned)
        .filter((id: any) => id != null && id !== "" && id !== "0");
      const staffIds = Array.from(new Set(allIds));

      console.log("[CRM API] Found staff IDs in leads:", staffIds);

      // Fetch each staff member
      const staffPromises = staffIds.map(async (id) => {
        try {
          const staffUrl = CRM_API_URL.replace("/leads/", `/staffs/${id}`);
          const staffResponse = await fetch(staffUrl, {
            headers: {
              "authtoken": CRM_API_TOKEN,
              "Content-Type": "application/json",
            },
          });

          if (staffResponse.ok) {
            return await staffResponse.json();
          }
          return null;
        } catch {
          return null;
        }
      });

      const staffResults = await Promise.all(staffPromises);
      const team = staffResults.filter((staff) => staff != null);

      console.log("[CRM API] Team fetched successfully, count:", team.length);
      res.json(team);
    } catch (error) {
      console.error("Error fetching team from CRM:", error);
      res.status(500).json({ error: "Failed to fetch team from CRM" });
    }
  });

  // Proxy route for lead activities (history)
  app.get("/api/leads/:id/activities", async (req, res) => {
    try {
      const activitiesUrl = CRM_API_URL.replace("/leads/", `/leads/${req.params.id}/activities`);
      console.log("[CRM API] Fetching activities from:", activitiesUrl);

      const response = await fetch(activitiesUrl, {
        headers: {
          "authtoken": CRM_API_TOKEN,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`[CRM API] Activities error ${response.status}:`, errorText);
        return res.status(response.status).json({
          error: `CRM API Error: ${response.status}`,
          details: errorText
        });
      }

      const data = await response.json();
      console.log("[CRM API] Activities fetched for lead", req.params.id, ":", data);
      res.json(data);
    } catch (error) {
      console.error("Error fetching activities from CRM:", error);
      res.status(500).json({ error: "Failed to fetch activities from CRM" });
    }
  });

  // Proxy route for lead reminders
  app.get("/api/leads/:id/reminders", async (req, res) => {
    try {
      // Try different possible endpoints for reminders
      const remindersUrl = CRM_API_URL.replace("/leads/", `/reminders/lead/${req.params.id}`);
      console.log("[CRM API] Fetching reminders from:", remindersUrl);

      const response = await fetch(remindersUrl, {
        headers: {
          "authtoken": CRM_API_TOKEN,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`[CRM API] Reminders error ${response.status}:`, errorText);
        return res.status(response.status).json({
          error: `CRM API Error: ${response.status}`,
          details: errorText
        });
      }

      const data = await response.json();
      console.log("[CRM API] Reminders fetched for lead", req.params.id, ":", data);
      res.json(data);
    } catch (error) {
      console.error("Error fetching reminders from CRM:", error);
      res.status(500).json({ error: "Failed to fetch reminders from CRM" });
    }
  });

  return httpServer;
}
