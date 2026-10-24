import "reflect-metadata";
import { BadRequestException, Body, Controller, Get, HttpCode, Injectable, Module, Param, Post, UnauthorizedException } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { FastifyAdapter, NestFastifyApplication } from "@nestjs/platform-fastify";
import cors from "@fastify/cors";
import argon2 from "argon2";
import { createHash, randomBytes } from "node:crypto";
import { SignJWT, jwtVerify } from "jose";
import { loginSchema, signUpSchema } from "@mise/validation";

const accessKey = new TextEncoder().encode(process.env.JWT_ACCESS_SECRET || "development-access-secret-must-be-replaced");
const refreshKey = new TextEncoder().encode(process.env.JWT_REFRESH_SECRET || "development-refresh-secret-must-be-replaced");
const digest = (value: string) => createHash("sha256").update(value).digest("hex");
type Account = { id: string; email: string; name: string; passwordHash: string };

@Injectable()
class AuthService {
  private accounts = new Map<string, Account>();
  private sessions = new Map<string, { userId: string; expiresAt: number }>();
  async signUp(input: unknown) { const value = signUpSchema.parse(input); if (this.accounts.has(value.email)) throw new BadRequestException("Email already registered"); const account = { id: crypto.randomUUID(), email: value.email, name: value.name, passwordHash: await argon2.hash(value.password, { type: argon2.argon2id }) }; this.accounts.set(account.email, account); return this.tokens(account); }
  async login(input: unknown) { const value = loginSchema.parse(input); const account = this.accounts.get(value.email); if (!account || !(await argon2.verify(account.passwordHash, value.password))) throw new UnauthorizedException("Invalid email or password"); return this.tokens(account); }
  async refresh(token: string) { const verified = await jwtVerify(token, refreshKey); const id = digest(token); const session = this.sessions.get(id); if (!session || session.expiresAt < Date.now()) throw new UnauthorizedException("Session expired"); this.sessions.delete(id); const account = [...this.accounts.values()].find((a) => a.id === verified.payload.sub); if (!account) throw new UnauthorizedException(); return this.tokens(account); }
  private async tokens(account: Account) { const accessToken = await new SignJWT({ email: account.email }).setProtectedHeader({ alg: "HS256" }).setSubject(account.id).setIssuedAt().setExpirationTime("15m").sign(accessKey); const refreshToken = await new SignJWT().setProtectedHeader({ alg: "HS256" }).setSubject(account.id).setIssuedAt().setExpirationTime("30d").sign(refreshKey); this.sessions.set(digest(refreshToken), { userId: account.id, expiresAt: Date.now() + 30 * 864e5 }); return { user: { id: account.id, email: account.email, name: account.name }, accessToken, refreshToken }; }
}
@Controller("v1")
class ApiController {
  constructor(private readonly auth: AuthService) {}
  @Get("health") health() { return { status: "ok", service: "mise-api", version: "v1" }; }
  @Post("auth/sign-up") signUp(@Body() body: unknown) { return this.auth.signUp(body); }
  @HttpCode(200) @Post("auth/login") login(@Body() body: unknown) { return this.auth.login(body); }
  @HttpCode(200) @Post("auth/refresh") refresh(@Body() body: { refreshToken?: string }) { if (!body.refreshToken) throw new UnauthorizedException(); return this.auth.refresh(body.refreshToken); }
}
@Injectable()
class WorkforceService {
  private timesheets = [{ id: "ts_01", person: "Maria Santos", station: "Floor", date: "24 Oct", hours: 8, status: "pending" }, { id: "ts_02", person: "Ravi Kumar", station: "Kitchen", date: "24 Oct", hours: 8.5, status: "pending" }, { id: "ts_03", person: "Nina Rao", station: "Bar", date: "23 Oct", hours: 7, status: "approved" }];
  private requests = [{ id: "rq_01", type: "Time off", person: "Daniel Lee", detail: "28–30 October · Personal leave", status: "pending" }, { id: "rq_02", type: "Shift swap", person: "Maria Santos", detail: "Friday 17:00–23:00 with Asha Patel", status: "pending" }, { id: "rq_03", type: "Availability", person: "Nina Rao", detail: "Unavailable Tuesday before 4 PM", status: "approved" }];
  private announcements = [{ id: "post_01", author: "Asha Patel", role: "Manager", text: "Friday dinner is fully booked from 7 PM. Please arrive ten minutes early for the service brief.", pinned: true, reactions: 8 }, { id: "post_02", author: "Ravi Kumar", role: "Kitchen", text: "New allergen labels are now on the dry-store shelves. Ask if you need a walkthrough.", pinned: false, reactions: 4 }];
  team() { return [{ id: "maria", name: "Maria Santos", role: "Server", station: "Floor", status: "On shift", initials: "MS" }, { id: "ravi", name: "Ravi Kumar", role: "Line cook", station: "Kitchen", status: "Off today", initials: "RK" }, { id: "nina", name: "Nina Rao", role: "Bartender", station: "Bar", status: "Starts 4 PM", initials: "NR" }]; }
  listTimesheets() { return this.timesheets; }
  approve(id: string) { const item = this.timesheets.find((sheet) => sheet.id === id); if (!item) throw new BadRequestException("Timesheet not found"); item.status = "approved"; return item; }
  listRequests() { return this.requests; }
  decideRequest(id: string, status: "approved" | "declined") { const request = this.requests.find((item) => item.id === id); if (!request) throw new BadRequestException("Request not found"); request.status = status; return request; }
  listAnnouncements() { return this.announcements; }
  addAnnouncement(text: string) { if (!text.trim()) throw new BadRequestException("Post cannot be empty"); const item = { id: `post_${Date.now()}`, author: "You", role: "Manager", text, pinned: false, reactions: 0 }; this.announcements.unshift(item); return item; }
}
const workforceService = new WorkforceService();
@Controller("v1/workforce")
class WorkforceController {
  @Get("team") team() { return workforceService.team(); }
  @Get("timesheets") timesheets() { return workforceService.listTimesheets(); }
  @Post("timesheets/:id/approve") approve(@Param("id") id: string) { return workforceService.approve(id); }
  @Get("requests") requests() { return workforceService.listRequests(); }
  @Post("requests/:id/:decision") decide(@Param("id") id: string, @Param("decision") decision: "approved" | "declined") { if (decision !== "approved" && decision !== "declined") throw new BadRequestException("Invalid decision"); return workforceService.decideRequest(id, decision); }
  @Get("announcements") announcements() { return workforceService.listAnnouncements(); }
  @Post("announcements") announcement(@Body() body: { text?: string }) { return workforceService.addAnnouncement(body.text ?? ""); }
}
@Injectable()
class PantryService {
  private items = [{ id:"tomatoes", name:"Roma tomatoes", category:"Produce", unit:"kg", stock:3, par:12, location:"Walk-in" }, { id:"chicken", name:"Chicken breast", category:"Protein", unit:"kg", stock:18, par:15, location:"Walk-in" }, { id:"espresso", name:"Espresso beans", category:"Dry goods", unit:"kg", stock:2, par:6, location:"Dry store" }, { id:"gin", name:"House gin", category:"Bar", unit:"bottle", stock:14, par:10, location:"Back bar" }];
  private orders: Array<{ id:string; supplier:string; status:string; lines:number; total:number }> = [];
  private recipes = [{ id:"butter-chicken", name:"Butter chicken", price:520, cost:164, yield:1, allergens:["Dairy"], ingredients:["Chicken breast · 220 g", "Tomato puree · 140 g", "Cream · 45 ml"] }, { id:"espresso-tonic", name:"Espresso tonic", price:290, cost:68, yield:1, allergens:[], ingredients:["Espresso · 18 g", "Tonic water · 200 ml", "Orange peel · 1 piece"] }];
  private wastes = [{ id:"w_01", item:"Roma tomatoes", quantity:"1.5 kg", reason:"Spoiled", cost:90, recordedBy:"Ravi", at:"Today, 09:15" }];
  private eightysix = [{ id:"86_01", item:"Burrata", note:"Supplier short delivery", active:true }];
  list() { return this.items; }
  count(id: string, stock: number) { const item = this.items.find((entry) => entry.id === id); if (!item || !Number.isFinite(stock) || stock < 0) throw new BadRequestException("Invalid stock count"); item.stock = stock; return item; }
  suggestedOrder() { return this.items.filter((item) => item.stock < item.par).map((item) => ({ itemId:item.id, name:item.name, quantity:item.par-item.stock, unit:item.unit, supplier:item.id === "espresso" ? "Roast House Coffee" : "FreshCart Produce" })); }
  createOrder() { const lines = this.suggestedOrder(); const order = { id:`po_${Date.now()}`, supplier:"Multiple suppliers", status:"sent", lines:lines.length, total:lines.reduce((sum,line)=>sum + line.quantity * (line.itemId === "espresso" ? 850 : 60),0) }; this.orders.unshift(order); return order; }
  listRecipes() { return this.recipes; }
  listWaste() { return this.wastes; }
  logWaste(input: { item?:string; quantity?:string; reason?:string }) { if (!input.item || !input.quantity || !input.reason) throw new BadRequestException("Waste item, quantity and reason are required"); const waste = { id:`w_${Date.now()}`, item:input.item, quantity:input.quantity, reason:input.reason, cost:0, recordedBy:"You", at:"Just now" }; this.wastes.unshift(waste); return waste; }
  listEightySix() { return this.eightysix; }
  toggleEightySix(item: string) { const found = this.eightysix.find((entry)=>entry.item === item); if (found) { found.active = !found.active; return found; } const entry = { id:`86_${Date.now()}`, item, note:"Marked from Pantry", active:true }; this.eightysix.unshift(entry); return entry; }
}
const pantryService = new PantryService();
@Controller("v1/pantry")
class PantryController {
  @Get("items") items() { return pantryService.list(); }
  @Post("items/:id/count") count(@Param("id") id: string, @Body() body: { stock?: number }) { return pantryService.count(id, Number(body.stock)); }
  @Get("suggested-order") suggestedOrder() { return pantryService.suggestedOrder(); }
  @Post("orders") createOrder() { return pantryService.createOrder(); }
  @Get("recipes") recipes() { return pantryService.listRecipes(); }
  @Get("waste") waste() { return pantryService.listWaste(); }
  @Post("waste") logWaste(@Body() body: { item?:string; quantity?:string; reason?:string }) { return pantryService.logWaste(body); }
  @Get("86-board") eightysix() { return pantryService.listEightySix(); }
  @Post("86-board/:item") toggleEightySix(@Param("item") item: string) { return pantryService.toggleEightySix(decodeURIComponent(item)); }
}
@Injectable()
class PosService {
  private tickets = [{ id:"T-1042", table:"12", items:["Butter chicken × 2", "Espresso tonic × 1"], status:"new", elapsed:"02:14" }];
  private tables = [{ id:"1", label:"1", seats:2, status:"free" }, { id:"7", label:"7", seats:4, status:"ordered" }, { id:"12", label:"12", seats:4, status:"paying" }, { id:"14", label:"14", seats:2, status:"seated" }, { id:"B1", label:"Bar 1", seats:2, status:"ordered" }];
  menu() { return [{ id:"butter-chicken", name:"Butter chicken", price:520, category:"Mains" }, { id:"espresso-tonic", name:"Espresso tonic", price:290, category:"Drinks" }, { id:"truffle-fries", name:"Truffle fries", price:260, category:"Sides" }, { id:"mango-lassi", name:"Mango lassi", price:180, category:"Drinks" }]; }
  listTickets() { return this.tickets; }
  createTicket(input: { table?:string; items?:Array<{ name:string; quantity:number }> }) { if (!input.table || !input.items?.length) throw new BadRequestException("Table and order items are required"); const ticket = { id:`T-${Math.floor(1000+Math.random()*9000)}`, table:input.table, items:input.items.map((item)=>`${item.name} × ${item.quantity}`), status:"new", elapsed:"00:00" }; this.tickets.unshift(ticket); return ticket; }
  bump(id:string) { const ticket = this.tickets.find((entry)=>entry.id===id); if (!ticket) throw new BadRequestException("Ticket not found"); ticket.status="complete"; return ticket; }
  listTables() { return this.tables; }
  settleTable(id:string) { const table = this.tables.find((entry)=>entry.id===id); if (!table) throw new BadRequestException("Table not found"); table.status="free"; return table; }
  closeSummary() { return { businessDate:"2026-10-24", sales:42680, cashExpected:8200, card:28480, wallet:6000, checks:91, voids:1, discounts:640 }; }
}
const posService = new PosService();
@Controller("v1/pos")
class PosController {
  @Get("menu") menu() { return posService.menu(); }
  @Get("tickets") tickets() { return posService.listTickets(); }
  @Post("tickets") create(@Body() body: { table?:string; items?:Array<{ name:string; quantity:number }> }) { return posService.createTicket(body); }
  @Post("tickets/:id/bump") bump(@Param("id") id:string) { return posService.bump(id); }
  @Get("tables") tables() { return posService.listTables(); }
  @Post("tables/:id/settle") settle(@Param("id") id:string) { return posService.settleTable(id); }
  @Get("close-summary") closeSummary() { return posService.closeSummary(); }
}
@Injectable()
class OperationsService {
  private checklist = [{ id:"open-1", task:"Switch on espresso machine", station:"Bar", complete:true }, { id:"open-2", task:"Sanitise prep benches", station:"Kitchen", complete:true }, { id:"open-3", task:"Count till float", station:"Floor", complete:false }, { id:"open-4", task:"Check walk-in temperature", station:"Kitchen", complete:false }];
  private temperatures = [{ id:"temp-1", asset:"Walk-in fridge", value:3.2, unit:"°C", recordedAt:"09:15", status:"safe" }, { id:"temp-2", asset:"Freezer", value:-18, unit:"°C", recordedAt:"09:17", status:"safe" }];
  tasks() { return this.checklist; }
  toggleTask(id:string) { const task=this.checklist.find((item)=>item.id===id); if(!task) throw new BadRequestException("Task not found"); task.complete=!task.complete; return task; }
  temps() { return this.temperatures; }
  addTemp(input:{asset?:string; value?:number}) { if(!input.asset || !Number.isFinite(input.value)) throw new BadRequestException("Asset and temperature are required"); const temp={id:`temp_${Date.now()}`,asset:input.asset,value:Number(input.value),unit:"°C",recordedAt:"Just now",status:Number(input.value)>5?"alert":"safe"};this.temperatures.unshift(temp);return temp; }
}
const operationsService=new OperationsService();
@Controller("v1/operations")
class OperationsController {
  @Get("checklist") checklist() { return operationsService.tasks(); }
  @Post("checklist/:id/toggle") toggle(@Param("id") id:string) { return operationsService.toggleTask(id); }
  @Get("temperatures") temperatures() { return operationsService.temps(); }
  @Post("temperatures") temperature(@Body() body:{asset?:string;value?:number}) { return operationsService.addTemp(body); }
}
@Injectable()
class ReportsService {
  summary() { return { sales:42680, salesChange:12.4, covers:91, averageCheck:469, laborPercent:26.4, foodCostPercent:30.1, primeCostPercent:56.5, waste:90, hours:112, chart:[{label:"Mon",sales:31200},{label:"Tue",sales:28900},{label:"Wed",sales:35400},{label:"Thu",sales:38600},{label:"Fri",sales:42680},{label:"Sat",sales:0},{label:"Sun",sales:0}] }; }
  targets() { return [{ id:"sales", name:"Daily sales", current:42680, target:40000, format:"currency", direction:"above" }, { id:"labor", name:"Labor cost", current:26.4, target:28, format:"percent", direction:"below" }, { id:"food", name:"Food cost", current:30.1, target:30, format:"percent", direction:"below" }]; }
  forecast() { return { date:"Saturday, 25 October", sales:54800, covers:118, confidence:"Medium", hours:[{hour:"12 PM",covers:14},{hour:"1 PM",covers:21},{hour:"2 PM",covers:16},{hour:"7 PM",covers:29},{hour:"8 PM",covers:34},{hour:"9 PM",covers:22}], actions:["Add one floor staff member from 7–10 PM", "Prep 12 extra portions of butter chicken", "Order 8 kg Roma tomatoes by 4 PM"] }; }
}
const reportsService=new ReportsService();
@Controller("v1/reports")
class ReportsController { @Get("summary") summary() { return reportsService.summary(); } @Get("targets") targets() { return reportsService.targets(); } @Get("forecast") forecast(){return reportsService.forecast();} }
@Injectable()
class CookbookService {
  private courses = [{ id:"allergens", title:"Allergen essentials", role:"All team", duration:"12 min", progress:100, lessons:3 }, { id:"service", title:"The Good Fork service", role:"Floor", duration:"18 min", progress:66, lessons:4 }, { id:"close", title:"Closing the pass", role:"Shift leads", duration:"10 min", progress:0, lessons:2 }];
  list() { return this.courses; }
}
const cookbookService = new CookbookService();
@Controller("v1/cookbook")
class CookbookController { @Get("courses") courses() { return cookbookService.list(); } }
@Injectable()
class PublicMenuService { menu() { return { location:"The Good Fork · Bengaluru", categories:[{name:"Mains",items:[{id:"butter",name:"Butter chicken",price:520,description:"Charred chicken, tomato, cream, fenugreek",allergens:["Dairy"]}]},{name:"Drinks",items:[{id:"tonic",name:"Espresso tonic",price:290,description:"Double espresso, tonic, orange",allergens:[]},{id:"lassi",name:"Mango lassi",price:180,description:"Mango, yogurt, cardamom",allergens:["Dairy"]}]}]}; } }
class ReservationsService { private bookings=[{id:"res_01",name:"Priya Sharma",time:"7:00 PM",guests:4,status:"confirmed",table:"12"},{id:"res_02",name:"Omar Khan",time:"7:30 PM",guests:2,status:"confirmed",table:"14"}]; list(){return this.bookings;} create(input:{name?:string;time?:string;guests?:number}){if(!input.name||!input.time||!input.guests)throw new BadRequestException("Name, time and guests are required");const booking={id:`res_${Date.now()}`,name:input.name,time:input.time,guests:Number(input.guests),status:"confirmed",table:"Unassigned"};this.bookings.push(booking);return booking;} }
class CustomersService { private customers=[{id:"c_01",name:"Priya Sharma",visits:14,spend:18640,points:420,allergies:["Peanuts"],note:"Prefers window table",lastVisit:"18 Oct"},{id:"c_02",name:"Omar Khan",visits:5,spend:6820,points:120,allergies:[],note:"",lastVisit:"12 Oct"}]; list(){return this.customers;} }
const publicMenuService=new PublicMenuService();
const reservationsService=new ReservationsService();
const customersService=new CustomersService();
@Controller("v1/public")
class PublicController { @Get("menu/:location") menu(@Param("location") _location:string) { return publicMenuService.menu(); } }
@Controller("v1/reservations")
class ReservationsController { @Get() list(){return reservationsService.list();} @Post() create(@Body() body:{name?:string;time?:string;guests?:number}){return reservationsService.create(body);} }
@Controller("v1/customers")
class CustomersController { @Get() list(){return customersService.list();} }
@Injectable()
class PlatformService { private flags=[{id:"workforce",name:"Workforce",enabled:true},{id:"pantry",name:"Pantry",enabled:true},{id:"pos",name:"POS & The Line",enabled:true},{id:"forecasting",name:"Forecasting",enabled:false},{id:"ai",name:"AI assistant",enabled:false},{id:"public_ordering",name:"Public ordering",enabled:true}]; list(){return this.flags;} toggle(id:string){const flag=this.flags.find((item)=>item.id===id);if(!flag)throw new BadRequestException("Feature flag not found");flag.enabled=!flag.enabled;return flag;} }
class DeveloperService { private apiKeys=[{id:"key_01",name:"Kitchen dashboard",prefix:"mise_live_••••7K2P",scope:"orders:read",created:"24 Oct"}]; private webhooks=[{id:"hook_01",event:"order.created",url:"https://example.com/mise/orders",active:true}]; listKeys(){return this.apiKeys;} hooksList(){return this.webhooks;} createKey(name:string){if(!name.trim())throw new BadRequestException("Key name is required");const key={id:`key_${Date.now()}`,name,prefix:"mise_live_••••NEW",scope:"orders:read",created:"Just now"};this.apiKeys.push(key);return key;} toggleHook(id:string){const hook=this.webhooks.find((item)=>item.id===id);if(!hook)throw new BadRequestException("Webhook not found");hook.active=!hook.active;return hook;} }
const platformService=new PlatformService();
const developerService=new DeveloperService();
@Controller("v1/platform")
class PlatformController { @Get("flags") flags(){return platformService.list();} @Post("flags/:id/toggle") toggle(@Param("id") id:string){return platformService.toggle(id);} }
@Controller("v1/developer")
class DeveloperController { @Get("keys") keys(){return developerService.listKeys();} @Post("keys") createKey(@Body() body:{name?:string}){return developerService.createKey(body.name??"");} @Get("webhooks") hooks(){return developerService.hooksList();} @Post("webhooks/:id/toggle") toggleHook(@Param("id") id:string){return developerService.toggleHook(id);} }
@Module({ controllers: [ApiController, WorkforceController, PantryController, PosController, OperationsController, ReportsController, CookbookController, PublicController, ReservationsController, CustomersController, PlatformController, DeveloperController], providers: [AuthService, WorkforceService, PantryService, PosService, OperationsService, ReportsService, CookbookService, PublicMenuService, ReservationsService, CustomersService, PlatformService, DeveloperService] }) class ApiModule {}
async function bootstrap() { const app = await NestFactory.create<NestFastifyApplication>(ApiModule, new FastifyAdapter()); await app.register(cors as never, { origin: process.env.WEB_ORIGIN || true }); await app.listen({ port: Number(process.env.PORT || 4000), host: "0.0.0.0" }); }
if (process.env.NODE_ENV !== "test") void bootstrap();
