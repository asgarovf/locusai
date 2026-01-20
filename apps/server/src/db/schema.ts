/**
 * Drizzle Schema - Hybrid (SQLite / Postgres)
 */

import { sql } from "drizzle-orm";
import {
  jsonb,
  integer as pgInteger,
  pgTable,
  text as pgText,
  serial,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

const isCloud = process.env.DB_MODE === "cloud";

// ============================================================================
// Multi-tenancy Tables
// ============================================================================

const usersSqlite = sqliteTable("users", {
  id: text("id").primaryKey(),
  email: text("email").notNull().unique(),
  name: text("name").notNull(),
  avatarUrl: text("avatar_url"),
  role: text("role").notNull().default("USER"),
  passwordHash: text("password_hash"), // Optional for cloud mode (OTP-only)
  // Onboarding fields
  companyName: text("company_name"),
  teamSize: text("team_size"), // 'solo', '2-10', '11-50', '51-200', '200+'
  userRole: text("user_role"), // 'developer', 'designer', 'product_manager', 'other'
  onboardingCompleted: integer("onboarding_completed", { mode: "boolean" })
    .notNull()
    .default(false),
  emailVerified: integer("email_verified", { mode: "boolean" })
    .notNull()
    .default(false),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
});

const usersPg = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: pgText("email").notNull().unique(),
  name: pgText("name").notNull(),
  avatarUrl: pgText("avatar_url"),
  role: pgText("role").notNull().default("USER"),
  passwordHash: pgText("password_hash"), // Optional for cloud mode (OTP-only)
  // Onboarding fields
  companyName: pgText("company_name"),
  teamSize: pgText("team_size"), // 'solo', '2-10', '11-50', '51-200', '200+'
  userRole: pgText("user_role"), // 'developer', 'designer', 'product_manager', 'other'
  onboardingCompleted: pgText("onboarding_completed")
    .$type<boolean>()
    .notNull()
    .default(sql`false`),
  emailVerified: pgText("email_verified")
    .$type<boolean>()
    .notNull()
    .default(sql`false`),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const users = (isCloud ? usersPg : usersSqlite) as typeof usersSqlite;

const organizationsSqlite = sqliteTable("organizations", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  avatarUrl: text("avatar_url"),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
});

const organizationsPg = pgTable("organizations", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: pgText("name").notNull(),
  slug: pgText("slug").notNull().unique(),
  avatarUrl: pgText("avatar_url"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const organizations = (
  isCloud ? organizationsPg : organizationsSqlite
) as typeof organizationsSqlite;

const projectsSqlite = sqliteTable("projects", {
  id: text("id").primaryKey(),
  orgId: text("org_id")
    .notNull()
    .references(() => organizationsSqlite.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  slug: text("slug").notNull(),
  description: text("description"),
  repoUrl: text("repo_url"),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
});

const projectsPg = pgTable("projects", {
  id: uuid("id").primaryKey().defaultRandom(),
  orgId: uuid("org_id")
    .notNull()
    .references(() => organizationsPg.id, { onDelete: "cascade" }),
  name: pgText("name").notNull(),
  slug: pgText("slug").notNull(),
  description: pgText("description"),
  repoUrl: pgText("repo_url"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const projects = (
  isCloud ? projectsPg : projectsSqlite
) as typeof projectsSqlite;

const membershipsSqlite = sqliteTable("memberships", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => usersSqlite.id, { onDelete: "cascade" }),
  orgId: text("org_id")
    .notNull()
    .references(() => organizationsSqlite.id, { onDelete: "cascade" }),
  role: text("role").notNull().default("MEMBER"),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
});

const membershipsPg = pgTable("memberships", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => usersPg.id, { onDelete: "cascade" }),
  orgId: uuid("org_id")
    .notNull()
    .references(() => organizationsPg.id, { onDelete: "cascade" }),
  role: pgText("role").notNull().default("MEMBER"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const memberships = (
  isCloud ? membershipsPg : membershipsSqlite
) as typeof membershipsSqlite;

const apiKeysSqlite = sqliteTable("api_keys", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => usersSqlite.id, { onDelete: "cascade" }),
  projectId: text("project_id")
    .notNull()
    .references(() => projectsSqlite.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  keyPrefix: text("key_prefix").notNull(),
  keyHash: text("key_hash").notNull(),
  lastUsedAt: integer("last_used_at", { mode: "timestamp_ms" }),
  expiresAt: integer("expires_at", { mode: "timestamp_ms" }),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
});

const apiKeysPg = pgTable("api_keys", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => usersPg.id, { onDelete: "cascade" }),
  projectId: uuid("project_id")
    .notNull()
    .references(() => projectsPg.id, { onDelete: "cascade" }),
  name: pgText("name").notNull(),
  keyPrefix: pgText("key_prefix").notNull(),
  keyHash: pgText("key_hash").notNull(),
  lastUsedAt: timestamp("last_used_at"),
  expiresAt: timestamp("expires_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const apiKeys = (
  isCloud ? apiKeysPg : apiKeysSqlite
) as typeof apiKeysSqlite;

// Workspaces (under organizations)
const workspacesSqlite = sqliteTable("workspaces", {
  id: text("id").primaryKey(),
  orgId: text("org_id")
    .notNull()
    .references(() => organizationsSqlite.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  slug: text("slug").notNull(),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
});

const workspacesPg = pgTable("workspaces", {
  id: uuid("id").primaryKey().defaultRandom(),
  orgId: uuid("org_id")
    .notNull()
    .references(() => organizationsPg.id, { onDelete: "cascade" }),
  name: pgText("name").notNull(),
  slug: pgText("slug").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const workspaces = (
  isCloud ? workspacesPg : workspacesSqlite
) as typeof workspacesSqlite;

// OTP Verification
const otpVerificationSqlite = sqliteTable("otp_verification", {
  id: text("id").primaryKey(),
  email: text("email").notNull(),
  code: text("code").notNull(),
  expiresAt: integer("expires_at", { mode: "timestamp_ms" }).notNull(),
  verified: integer("verified", { mode: "boolean" }).notNull().default(false),
  attempts: integer("attempts").notNull().default(0),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
});

const otpVerificationPg = pgTable("otp_verification", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: pgText("email").notNull(),
  code: pgText("code").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  verified: pgText("verified").$type<boolean>().notNull().default(sql`false`),
  attempts: pgInteger("attempts").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const otpVerification = (
  isCloud ? otpVerificationPg : otpVerificationSqlite
) as typeof otpVerificationSqlite;

// ============================================================================
// Core Application Tables
// ============================================================================

const sprintsSqlite = sqliteTable("sprints", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  projectId: text("project_id").references(() => projectsSqlite.id, {
    onDelete: "cascade",
  }),
  name: text("name").notNull(),
  status: text("status").notNull().default("PLANNED"),
  startDate: integer("start_date", { mode: "timestamp_ms" }),
  endDate: integer("end_date", { mode: "timestamp_ms" }),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
});

const sprintsPg = pgTable("sprints", {
  id: serial("id").primaryKey(),
  projectId: uuid("project_id").references(() => projectsPg.id, {
    onDelete: "cascade",
  }),
  name: pgText("name").notNull(),
  status: pgText("status").notNull().default("PLANNED"),
  startDate: timestamp("start_date"),
  endDate: timestamp("end_date"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const sprints = (
  isCloud ? sprintsPg : sprintsSqlite
) as typeof sprintsSqlite;

const tasksSqlite = sqliteTable("tasks", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  projectId: text("project_id").references(() => projectsSqlite.id, {
    onDelete: "cascade",
  }),
  title: text("title").notNull(),
  description: text("description"),
  status: text("status").notNull().default("BACKLOG"),
  priority: text("priority").notNull().default("MEDIUM"),
  labels: text("labels", { mode: "json" }).$type<string[]>().default([]),
  assigneeRole: text("assignee_role"),
  parentId: integer("parent_id"),
  sprintId: integer("sprint_id").references(() => sprintsSqlite.id),
  lockedBy: text("locked_by"),
  lockExpiresAt: integer("lock_expires_at", { mode: "timestamp_ms" }),
  acceptanceChecklist: text("acceptance_checklist", { mode: "json" })
    .$type<Array<{ id: string; text: string; done: boolean }>>()
    .default([]),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
});

const tasksPg = pgTable("tasks", {
  id: serial("id").primaryKey(),
  projectId: uuid("project_id").references(() => projectsPg.id, {
    onDelete: "cascade",
  }),
  title: pgText("title").notNull(),
  description: pgText("description"),
  status: pgText("status").notNull().default("BACKLOG"),
  priority: pgText("priority").notNull().default("MEDIUM"),
  labels: jsonb("labels").$type<string[]>().default([]),
  assigneeRole: pgText("assignee_role"),
  parentId: pgInteger("parent_id"),
  sprintId: pgInteger("sprint_id").references(() => sprintsPg.id),
  lockedBy: pgText("locked_by"),
  lockExpiresAt: timestamp("lock_expires_at"),
  acceptanceChecklist: jsonb("acceptance_checklist")
    .$type<Array<{ id: string; text: string; done: boolean }>>()
    .default([]),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const tasks = (isCloud ? tasksPg : tasksSqlite) as typeof tasksSqlite;

const commentsSqlite = sqliteTable("comments", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  taskId: integer("task_id")
    .notNull()
    .references(() => tasksSqlite.id, { onDelete: "cascade" }),
  author: text("author").notNull(),
  text: text("text").notNull(),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
});

const commentsPg = pgTable("comments", {
  id: serial("id").primaryKey(),
  taskId: pgInteger("task_id")
    .notNull()
    .references(() => tasksPg.id, { onDelete: "cascade" }),
  author: pgText("author").notNull(),
  text: pgText("text").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const comments = (
  isCloud ? commentsPg : commentsSqlite
) as typeof commentsSqlite;

const artifactsSqlite = sqliteTable("artifacts", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  taskId: integer("task_id")
    .notNull()
    .references(() => tasksSqlite.id, { onDelete: "cascade" }),
  type: text("type").notNull(),
  title: text("title").notNull(),
  contentText: text("content_text"),
  filePath: text("file_path"),
  createdBy: text("created_by").notNull(),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
});

const artifactsPg = pgTable("artifacts", {
  id: serial("id").primaryKey(),
  taskId: pgInteger("task_id")
    .notNull()
    .references(() => tasksPg.id, { onDelete: "cascade" }),
  type: pgText("type").notNull(),
  title: pgText("title").notNull(),
  contentText: pgText("content_text"),
  filePath: pgText("file_path"),
  createdBy: pgText("created_by").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const artifacts = (
  isCloud ? artifactsPg : artifactsSqlite
) as typeof artifactsSqlite;

const eventsSqlite = sqliteTable("events", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  taskId: integer("task_id")
    .notNull()
    .references(() => tasksSqlite.id, { onDelete: "cascade" }),
  type: text("type").notNull(),
  payload: text("payload", { mode: "json" }).$type<unknown>(),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
});

const eventsPg = pgTable("events", {
  id: serial("id").primaryKey(),
  taskId: pgInteger("task_id")
    .notNull()
    .references(() => tasksPg.id, { onDelete: "cascade" }),
  type: pgText("type").notNull(),
  payload: jsonb("payload").$type<unknown>(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const events = (
  isCloud ? eventsPg : eventsSqlite
) as typeof eventsSqlite;

const documentsSqlite = sqliteTable("documents", {
  id: text("id").primaryKey(),
  projectId: text("project_id").references(() => projectsSqlite.id, {
    onDelete: "cascade",
  }),
  path: text("path").notNull(),
  title: text("title").notNull(),
  content: text("content").notNull(),
  createdBy: text("created_by").notNull(),
  updatedBy: text("updated_by").notNull(),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
});

const documentsPg = pgTable("documents", {
  id: uuid("id").primaryKey().defaultRandom(),
  projectId: uuid("project_id").references(() => projectsPg.id, {
    onDelete: "cascade",
  }),
  path: pgText("path").notNull(),
  title: pgText("title").notNull(),
  content: pgText("content").notNull(),
  createdBy: uuid("created_by").notNull(),
  updatedBy: uuid("updated_by").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const documents = (
  isCloud ? documentsPg : documentsSqlite
) as typeof documentsSqlite;

// ============================================================================
// Type Exports
// ============================================================================
// Note: We cast exports to SQLite type to satisfy Drizzle types in static analysis.
// Runtime properties are compatible.

export type User = typeof usersSqlite.$inferSelect;
export type NewUser = typeof usersSqlite.$inferInsert;

export type Organization = typeof organizationsSqlite.$inferSelect;
export type NewOrganization = typeof organizationsSqlite.$inferInsert;

export type Project = typeof projectsSqlite.$inferSelect;
export type NewProject = typeof projectsSqlite.$inferInsert;

export type Membership = typeof membershipsSqlite.$inferSelect;
export type NewMembership = typeof membershipsSqlite.$inferInsert;

export type APIKey = typeof apiKeysSqlite.$inferSelect;
export type NewAPIKey = typeof apiKeysSqlite.$inferInsert;

export type Sprint = typeof sprintsSqlite.$inferSelect;
export type NewSprint = typeof sprintsSqlite.$inferInsert;

export type Task = typeof tasksSqlite.$inferSelect;
export type NewTask = typeof tasksSqlite.$inferInsert;

export type Comment = typeof commentsSqlite.$inferSelect;
export type NewComment = typeof commentsSqlite.$inferInsert;

export type Artifact = typeof artifactsSqlite.$inferSelect;
export type NewArtifact = typeof artifactsSqlite.$inferInsert;

export type Event = typeof eventsSqlite.$inferSelect;
export type NewEvent = typeof eventsSqlite.$inferInsert;

export type Document = typeof documentsSqlite.$inferSelect;
export type NewDocument = typeof documentsSqlite.$inferInsert;

export type Workspace = typeof workspacesSqlite.$inferSelect;
export type NewWorkspace = typeof workspacesSqlite.$inferInsert;

export type OtpVerification = typeof otpVerificationSqlite.$inferSelect;
export type NewOtpVerification = typeof otpVerificationSqlite.$inferInsert;
