import { z } from "zod";
import { AssigneeRole, TaskPriority, TaskStatus } from "./types.js";
export declare const TaskSchema: z.ZodObject<{
    title: z.ZodString;
    description: z.ZodDefault<z.ZodOptional<z.ZodString>>;
    status: z.ZodDefault<z.ZodOptional<z.ZodNativeEnum<typeof TaskStatus>>>;
    priority: z.ZodDefault<z.ZodOptional<z.ZodNativeEnum<typeof TaskPriority>>>;
    labels: z.ZodDefault<z.ZodOptional<z.ZodArray<z.ZodString, "many">>>;
    assigneeRole: z.ZodOptional<z.ZodNativeEnum<typeof AssigneeRole>>;
    parentId: z.ZodNullable<z.ZodOptional<z.ZodNumber>>;
}, "strip", z.ZodTypeAny, {
    title: string;
    description: string;
    status: TaskStatus;
    priority: TaskPriority;
    labels: string[];
    assigneeRole?: AssigneeRole | undefined;
    parentId?: number | null | undefined;
}, {
    title: string;
    description?: string | undefined;
    status?: TaskStatus | undefined;
    priority?: TaskPriority | undefined;
    labels?: string[] | undefined;
    assigneeRole?: AssigneeRole | undefined;
    parentId?: number | null | undefined;
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
    title?: string | undefined;
    description?: string | undefined;
    status?: TaskStatus | undefined;
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
    title?: string | undefined;
    description?: string | undefined;
    status?: TaskStatus | undefined;
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
export declare const CommentSchema: z.ZodObject<{
    author: z.ZodString;
    text: z.ZodString;
}, "strip", z.ZodTypeAny, {
    text: string;
    author: string;
}, {
    text: string;
    author: string;
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
    title: string;
    type: string;
    createdBy: string;
    contentText?: string | undefined;
    fileBase64?: string | undefined;
    fileName?: string | undefined;
}, {
    title: string;
    type: string;
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