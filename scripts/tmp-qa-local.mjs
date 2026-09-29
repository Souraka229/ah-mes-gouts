import { PrismaClient } from "@prisma/client";
import { existsSync, readFileSync } from "fs";
function loadEnvFile(p){ if(!existsSync(p))return; for(const line of readFileSync(p,"utf8").split("\n")){const t=line.trim(); if(!t||t.startsWith("#"))continue; const i=t.indexOf("="); if(i<0)continue; const k=t.slice(0,i).trim(); let v=t.slice(i+1).trim(); if((v.startsWith('"')&&v.endsWith('"'))||(v.startsWith("'")&&v.endsWith("'")))v=v.slice(1,-1); process.env[k]=v; } }
loadEnvFile(".env.local");
const url = new URL(process.env.DATABASE_URL);
console.log("Cible QA locale :", url.hostname + ":" + url.port);
const prisma = new PrismaClient();
try {
  const t = await prisma.$queryRaw`SELECT count(*)::int AS n FROM "Order"`;
  const p = await prisma.$queryRaw`SELECT count(*)::int AS n FROM "Product"`;
  console.log("LOCALE OK — Order:", t[0].n, "| Product:", p[0].n);
} catch(e) { console.log("LOCALE INJOIGNABLE :", e.message.split("\n")[0]); }
await prisma.$disconnect();
