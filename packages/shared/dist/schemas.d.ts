import { z } from "zod";
import { AssigneeRole, MembershipRole, TaskPriority, TaskStatus, UserRole } from "./enums";
export declare const OrganizationSchema: z.ZodObject<{
    name: z.ZodString;
    slug: z.ZodString;
}, "strip", z.ZodTypeAny, {
    name: string;
    slug: string;
}, {
    name: string;
    slug: string;
}>;
export declare const OrganizationUpdateSchema: z.ZodObject<{
    name: z.ZodOptional<z.ZodString>;
    avatarUrl: z.ZodNullable<z.ZodOptional<z.ZodString>>;
}, "strip", z.ZodTypeAny, {
    name?: string | undefined;
    avatarUrl?: string | null | undefined;
}, {
    name?: string | undefined;
    avatarUrl?: string | null | undefined;
}>;
export declare const ProjectSchema: z.ZodObject<{
    orgId: z.ZodString;
    name: z.ZodString;
    slug: z.ZodString;
    description: z.ZodOptional<z.ZodString>;
    repoUrl: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    name: string;
    orgId: string;
    slug: string;
    description?: string | undefined;
    repoUrl?: string | undefined;
}, {
    name: string;
    orgId: string;
    slug: string;
    description?: string | undefined;
    repoUrl?: string | undefined;
}>;
export declare const ProjectUpdateSchema: z.ZodObject<{
    name: z.ZodOptional<z.ZodString>;
    description: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    repoUrl: z.ZodNullable<z.ZodOptional<z.ZodString>>;
}, "strip", z.ZodTypeAny, {
    name?: string | undefined;
    description?: string | null | undefined;
    repoUrl?: string | null | undefined;
}, {
    name?: string | undefined;
    description?: string | null | undefined;
    repoUrl?: string | null | undefined;
}>;
export declare const UserSchema: z.ZodObject<{
    email: z.ZodString;
    name: z.ZodString;
    avatarUrl: z.ZodOptional<z.ZodString>;
    role: z.ZodDefault<z.ZodOptional<z.ZodNativeEnum<typeof UserRole>>>;
}, "strip", z.ZodTypeAny, {
    email: string;
    name: string;
    role: UserRole;
    avatarUrl?: string | undefined;
}, {
    email: string;
    name: string;
    avatarUrl?: string | undefined;
    role?: UserRole | undefined;
}>;
export declare const MembershipSchema: z.ZodObject<{
    userId: z.ZodString;
    orgId: z.ZodString;
    role: z.ZodDefault<z.ZodNativeEnum<typeof MembershipRole>>;
}, "strip", z.ZodTypeAny, {
    role: MembershipRole;
    orgId: string;
    userId: string;
}, {
    orgId: string;
    userId: string;
    role?: MembershipRole | undefined;
}>;
export declare const APIKeySchema: z.ZodObject<{
    projectId: z.ZodString;
    name: z.ZodString;
    expiresAt: z.ZodOptional<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    name: string;
    projectId: string;
    expiresAt?: number | undefined;
}, {
    name: string;
    projectId: string;
    expiresAt?: number | undefined;
}>;
export declare const DocumentSchema: z.ZodObject<{
    projectId: z.ZodString;
    path: z.ZodString;
    title: z.ZodString;
    content: z.ZodString;
}, "strip", z.ZodTypeAny, {
    path: string;
    title: string;
    projectId: string;
    content: string;
}, {
    path: string;
    title: string;
    projectId: string;
    content: string;
}>;
export declare const DocumentUpdateSchema: z.ZodObject<{
    path: z.ZodOptional<z.ZodString>;
    title: z.ZodOptional<z.ZodString>;
    content: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    path?: string | undefined;
    title?: string | undefined;
    content?: string | undefined;
}, {
    path?: string | undefined;
    title?: string | undefined;
    content?: string | undefined;
}>;
export declare const TaskSchema: z.ZodObject<{
    projectId: z.ZodOptional<z.ZodString>;
    title: z.ZodString;
    description: z.ZodDefault<z.ZodOptional<z.ZodString>>;
    status: z.ZodDefault<z.ZodOptional<z.ZodNativeEnum<typeof TaskStatus>>>;
    priority: z.ZodDefault<z.ZodOptional<z.ZodNativeEnum<typeof TaskPriority>>>;
    labels: z.ZodDefault<z.ZodOptional<z.ZodArray<z.ZodString, "many">>>;
    assigneeRole: z.ZodOptional<z.ZodNativeEnum<typeof AssigneeRole>>;
    parentId: z.ZodNullable<z.ZodOptional<z.ZodNumber>>;
    sprintId: z.ZodNullable<z.ZodOptional<z.ZodNumber>>;
}, "strip", z.ZodTypeAny, {
    status: TaskStatus;
    title: string;
    description: string;
    priority: TaskPriority;
    labels: string[];
    assigneeRole?: AssigneeRole | undefined;
    sprintId?: number | null | undefined;
    parentId?: number | null | undefined;
    projectId?: string | undefined;
}, {
    title: string;
    status?: TaskStatus | undefined;
    description?: string | undefined;
    priority?: TaskPriority | undefined;
    labels?: string[] | undefined;
    assigneeRole?: AssigneeRole | undefined;
    sprintId?: number | null | undefined;
    parentId?: number | null | undefined;
    projectId?: string | undefined;
}>;
export declare const TaskUpdateSchema: z.ZodObject<{
    title: z.ZodOptional<z.ZodString>;
    description: z.ZodOptional<z.ZodString>;
    labels: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    status: z.ZodOptional<z.ZodNativeEnum<typeof TaskStatus>>;
    priority: z.ZodOptional<z.ZodNativeEnum<typeof TaskPriority>>;
    assigneeRole: z.ZodOptional<z.ZodNativeEnum<typeof AssigneeRole>>;
    parentId: z.ZodNullable<z.ZodOptional<z.ZodNumber>>;
    acceptanceChecklist: z.ZodOptional<z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        text: z.ZodString;
        done: z.ZodBoolean;
    }, "strip", z.ZodTypeAny, {
        id: string;
        text: string;
        done: boolean;
    }, {
        id: string;
        text: string;
        done: boolean;
    }>, "many">>;
}, "strip", z.ZodTypeAny, {
    status?: TaskStatus | undefined;
    title?: string | undefined;
    description?: string | undefined;
    priority?: TaskPriority | undefined;
    labels?: string[] | undefined;
    assigneeRole?: AssigneeRole | undefined;
    parentId?: number | null | undefined;
    acceptanceChecklist?: {
        id: string;
        text: string;
        done: boolean;
    }[] | undefined;
}, {
    status?: TaskStatus | undefined;
    title?: string | undefined;
    description?: string | undefined;
    priority?: TaskPriority | undefined;
    labels?: string[] | undefined;
    assigneeRole?: AssigneeRole | undefined;
    parentId?: number | null | undefined;
    acceptanceChecklist?: {
        id: string;
        text: string;
        done: boolean;
    }[] | undefined;
}>;
export declare const SprintSchema: z.ZodObject<{
    projectId: z.ZodOptional<z.ZodString>;
    name: z.ZodString;
    startDate: z.ZodOptional<z.ZodNumber>;
    endDate: z.ZodOptional<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    name: string;
    startDate?: number | undefined;
    endDate?: number | undefined;
    projectId?: string | undefined;
}, {
    name: string;
    startDate?: number | undefined;
    endDate?: number | undefined;
    projectId?: string | undefined;
}>;
export declare const CommentSchema: z.ZodObject<{
    author: z.ZodString;
    text: z.ZodString;
}, "strip", z.ZodTypeAny, {
    author: string;
    text: string;
}, {
    author: string;
    text: string;
}>;
export declare const LockSchema: z.ZodObject<{
    agentId: z.ZodString;
    ttlSeconds: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    agentId: string;
    ttlSeconds: number;
}, {
    agentId: string;
    ttlSeconds: number;
}>;
export declare const UnlockSchema: z.ZodObject<{
    agentId: z.ZodString;
}, "strip", z.ZodTypeAny, {
    agentId: string;
}, {
    agentId: string;
}>;
export declare const ArtifactSchema: z.ZodObject<{
    type: z.ZodString;
    title: z.ZodString;
    contentText: z.ZodOptional<z.ZodString>;
    fileBase64: z.ZodOptional<z.ZodString>;
    fileName: z.ZodOptional<z.ZodString>;
    createdBy: z.ZodString;
}, "strip", z.ZodTypeAny, {
    type: string;
    title: string;
    createdBy: string;
    contentText?: string | undefined;
    fileBase64?: string | undefined;
    fileName?: string | undefined;
}, {
    type: string;
    title: string;
    createdBy: string;
    contentText?: string | undefined;
    fileBase64?: string | undefined;
    fileName?: string | undefined;
}>;
export declare const CiRunSchema: z.ZodObject<{
    taskId: z.ZodNumber;
    preset: z.ZodString;
}, "strip", z.ZodTypeAny, {
    taskId: number;
    preset: string;
}, {
    taskId: number;
    preset: string;
}>;
export declare const DocWriteSchema: z.ZodObject<{
    path: z.ZodString;
    content: z.ZodString;
}, "strip", z.ZodTypeAny, {
    path: string;
    content: string;
}, {
    path: string;
    content: string;
}>;
export declare const DocSearchSchema: z.ZodObject<{
    query: z.ZodString;
}, "strip", z.ZodTypeAny, {
    query: string;
}, {
    query: string;
}>;
//# sourceMappingURL=schemas.d.ts.map