import {
  sqliteTable,
  integer,
  text,
  real,
  primaryKey,
} from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";

// ============== TYPE DEFINITIONS FOR ENUMS ==============
export type UserRole = "admin" | "manager" | "accountant" | "designer" | "worker" | "sales";
export type OrderStatus = "new" | "design" | "production" | "ready" | "delivered" | "cancelled";
export type InvoiceType = "sale" | "purchase" | "return_sale" | "return_purchase";
export type PaymentMethod = "cash" | "bank" | "card" | "credit" | "check";
export type ProductionStatus = "pending" | "in_progress" | "paused" | "completed" | "cancelled";
export type ShipmentStatus = "pending" | "shipped" | "in_transit" | "delivered" | "returned";
export type AttendanceStatus = "present" | "absent" | "late" | "leave" | "sick";

// ============== USERS / EMPLOYEES ==============
export const users = sqliteTable("users", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  email: text("email"),
  phone: text("phone"),
  password: text("password").notNull().default("123456"),
  role: text("role").$type<UserRole>().notNull().default("worker"),
  position: text("position"),
  department: text("department"),
  salary: real("salary").default(0),
  hireDate: text("hire_date"),
  status: integer("status", { mode: "boolean" }).notNull().default(true),
  notes: text("notes"),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().defaultNow(),
});

export const attendance = sqliteTable("attendance", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  date: text("date").notNull(),
  checkIn: integer("check_in", { mode: "timestamp" }),
  checkOut: integer("check_out", { mode: "timestamp" }),
  status: text("status").$type<AttendanceStatus>().notNull().default("present"),
  workingHours: real("working_hours").default(0),
  notes: text("notes"),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().defaultNow(),
});

export const leaves = sqliteTable("leaves", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  startDate: text("start_date").notNull(),
  endDate: text("end_date").notNull(),
  reason: text("reason"),
  approved: integer("approved", { mode: "boolean" }).notNull().default(false),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().defaultNow(),
});

export const salaries = sqliteTable("salaries", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  month: text("month").notNull(), // YYYY-MM
  baseSalary: real("base_salary").notNull().default(0),
  bonuses: real("bonuses").notNull().default(0),
  deductions: real("deductions").notNull().default(0),
  total: real("total").notNull().default(0),
  paid: integer("paid", { mode: "boolean" }).notNull().default(false),
  paidAt: integer("paid_at", { mode: "timestamp" }),
  notes: text("notes"),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().defaultNow(),
});

// ============== CUSTOMERS ==============
export const customers = sqliteTable("customers", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  phone: text("phone"),
  email: text("email"),
  address: text("address"),
  city: text("city"),
  taxNumber: text("tax_number"),
  openingBalance: real("opening_balance").notNull().default(0),
  notes: text("notes"),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().defaultNow(),
});

// ============== SUPPLIERS ==============
export const suppliers = sqliteTable("suppliers", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  phone: text("phone"),
  email: text("email"),
  address: text("address"),
  contactPerson: text("contact_person"),
  taxNumber: text("tax_number"),
  openingBalance: real("opening_balance").notNull().default(0),
  notes: text("notes"),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().defaultNow(),
});

// ============== PRODUCTS / INVENTORY ==============
export const products = sqliteTable("products", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  code: text("code").notNull().unique(),
  name: text("name").notNull(),
  category: text("category"),
  unit: text("unit").notNull().default("piece"),
  cost: real("cost").notNull().default(0),
  price: real("price").notNull().default(0),
  quantity: real("quantity").notNull().default(0),
  minQuantity: real("min_quantity").notNull().default(0),
  description: text("description"),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().defaultNow(),
});

// ============== RAW MATERIALS ==============
export const rawMaterials = sqliteTable("raw_materials", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  code: text("code").notNull().unique(),
  name: text("name").notNull(),
  category: text("category"),
  unit: text("unit").notNull().default("kg"),
  cost: real("cost").notNull().default(0),
  quantity: real("quantity").notNull().default(0),
  minQuantity: real("min_quantity").notNull().default(0),
  supplierId: integer("supplier_id").references(() => suppliers.id),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().defaultNow(),
});

// ============== ORDERS ==============
export const orders = sqliteTable("orders", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  orderNumber: text("order_number").notNull().unique(),
  customerId: integer("customer_id").notNull().references(() => customers.id),
  orderDate: text("order_date").notNull(),
  deliveryDate: text("delivery_date"),
  status: text("status").$type<OrderStatus>().notNull().default("new"),
  subtotal: real("subtotal").notNull().default(0),
  tax: real("tax").notNull().default(0),
  discount: real("discount").notNull().default(0),
  total: real("total").notNull().default(0),
  cost: real("cost").notNull().default(0),
  profit: real("profit").notNull().default(0),
  paid: real("paid").notNull().default(0),
  remaining: real("remaining").notNull().default(0),
  description: text("description"),
  notes: text("notes"),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().defaultNow(),
});

export const orderItems = sqliteTable("order_items", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  orderId: integer("order_id").notNull().references(() => orders.id, { onDelete: "cascade" }),
  productId: integer("product_id").references(() => products.id),
  description: text("description").notNull(),
  quantity: real("quantity").notNull().default(1),
  unitPrice: real("unit_price").notNull().default(0),
  cost: real("cost").notNull().default(0),
  total: real("total").notNull().default(0),
  notes: text("notes"),
});

// ============== PRODUCTION / WORK ORDERS ==============
export const workOrders = sqliteTable("work_orders", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  workOrderNumber: text("work_order_number").notNull().unique(),
  orderId: integer("order_id").references(() => orders.id, { onDelete: "set null" }),
  title: text("title").notNull(),
  description: text("description"),
  assignedTo: integer("assigned_to").references(() => users.id),
  startDate: text("start_date"),
  dueDate: text("due_date"),
  completedDate: text("completed_date"),
  status: text("status").$type<ProductionStatus>().notNull().default("pending"),
  priority: text("priority").notNull().default("normal"),
  estimatedCost: real("estimated_cost").notNull().default(0),
  actualCost: real("actual_cost").notNull().default(0),
  notes: text("notes"),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().defaultNow(),
});

export const productionSteps = sqliteTable("production_steps", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  workOrderId: integer("work_order_id").notNull().references(() => workOrders.id, { onDelete: "cascade" }),
  stepName: text("step_name").notNull(),
  assignedTo: integer("assigned_to").references(() => users.id),
  status: text("status").$type<ProductionStatus>().notNull().default("pending"),
  startTime: integer("start_time", { mode: "timestamp" }),
  endTime: integer("end_time", { mode: "timestamp" }),
  notes: text("notes"),
  order_index: integer("order_index").notNull().default(0),
});

// ============== INVOICES ==============
export const invoices = sqliteTable("invoices", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  invoiceNumber: text("invoice_number").notNull().unique(),
  type: text("type").$type<InvoiceType>().notNull(),
  customerId: integer("customer_id").references(() => customers.id),
  supplierId: integer("supplier_id").references(() => suppliers.id),
  orderId: integer("order_id").references(() => orders.id),
  invoiceDate: text("invoice_date").notNull(),
  dueDate: text("due_date"),
  subtotal: real("subtotal").notNull().default(0),
  tax: real("tax").notNull().default(0),
  discount: real("discount").notNull().default(0),
  total: real("total").notNull().default(0),
  paid: real("paid").notNull().default(0),
  remaining: real("remaining").notNull().default(0),
  status: text("status").notNull().default("pending"),
  paymentMethod: text("payment_method").$type<PaymentMethod>(),
  notes: text("notes"),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().defaultNow(),
});

export const invoiceItems = sqliteTable("invoice_items", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  invoiceId: integer("invoice_id").notNull().references(() => invoices.id, { onDelete: "cascade" }),
  productId: integer("product_id").references(() => products.id),
  description: text("description").notNull(),
  quantity: real("quantity").notNull().default(1),
  unitPrice: real("unit_price").notNull().default(0),
  total: real("total").notNull().default(0),
});

// ============== PAYMENTS / INSTALLMENTS ==============
export const payments = sqliteTable("payments", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  invoiceId: integer("invoice_id").references(() => invoices.id, { onDelete: "set null" }),
  customerId: integer("customer_id").references(() => customers.id),
  supplierId: integer("supplier_id").references(() => suppliers.id),
  amount: real("amount").notNull(),
  paymentDate: text("payment_date").notNull(),
  paymentMethod: text("payment_method").$type<PaymentMethod>().notNull().default("cash"),
  reference: text("reference"),
  notes: text("notes"),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().defaultNow(),
});

export const installments = sqliteTable("installments", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  invoiceId: integer("invoice_id").notNull().references(() => invoices.id, { onDelete: "cascade" }),
  customerId: integer("customer_id").notNull().references(() => customers.id),
  installmentNumber: integer("installment_number").notNull(),
  amount: real("amount").notNull(),
  dueDate: text("due_date").notNull(),
  paidDate: text("paid_date"),
  paid: integer("paid", { mode: "boolean" }).notNull().default(false),
  notes: text("notes"),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().defaultNow(),
});

// ============== EXPENSES ==============
export const expenses = sqliteTable("expenses", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  category: text("category").notNull(),
  description: text("description").notNull(),
  amount: real("amount").notNull(),
  expenseDate: text("expense_date").notNull(),
  paymentMethod: text("payment_method").$type<PaymentMethod>().notNull().default("cash"),
  receipt: text("receipt"),
  notes: text("notes"),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().defaultNow(),
});

// ============== SHIPMENTS ==============
export const shipments = sqliteTable("shipments", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  shipmentNumber: text("shipment_number").notNull().unique(),
  orderId: integer("order_id").references(() => orders.id),
  customerId: integer("customer_id").notNull().references(() => customers.id),
  carrier: text("carrier"),
  trackingNumber: text("tracking_number"),
  shippingDate: text("shipping_date"),
  estimatedArrival: text("estimated_arrival"),
  shippingCost: real("shipping_cost").notNull().default(0),
  status: text("status").$type<ShipmentStatus>().notNull().default("pending"),
  address: text("address"),
  notes: text("notes"),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().defaultNow(),
});

// ============== INVENTORY MOVEMENTS ==============
export const inventoryMovements = sqliteTable("inventory_movements", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  productId: integer("product_id").references(() => products.id, { onDelete: "cascade" }),
  rawMaterialId: integer("raw_material_id").references(() => rawMaterials.id, { onDelete: "cascade" }),
  type: text("type").notNull(), // in, out, adjustment
  quantity: real("quantity").notNull(),
  reason: text("reason"),
  reference: text("reference"),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().defaultNow(),
});

// ============== QUOTATIONS ==============
export const quotations = sqliteTable("quotations", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  quoteNumber: text("quote_number").notNull().unique(),
  customerId: integer("customer_id").notNull().references(() => customers.id),
  quoteDate: text("quote_date").notNull(),
  validUntil: text("valid_until"),
  subtotal: real("subtotal").notNull().default(0),
  tax: real("tax").notNull().default(0),
  discount: real("discount").notNull().default(0),
  total: real("total").notNull().default(0),
  status: text("status").notNull().default("pending"),
  notes: text("notes"),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().defaultNow(),
});

export const quotationItems = sqliteTable("quotation_items", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  quotationId: integer("quotation_id").notNull().references(() => quotations.id, { onDelete: "cascade" }),
  description: text("description").notNull(),
  quantity: real("quantity").notNull().default(1),
  unitPrice: real("unit_price").notNull().default(0),
  total: real("total").notNull().default(0),
});
