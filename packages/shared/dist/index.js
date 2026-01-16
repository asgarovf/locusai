export var TaskStatus;
(function (TaskStatus) {
    TaskStatus["BACKLOG"] = "BACKLOG";
    TaskStatus["IN_PROGRESS"] = "IN_PROGRESS";
    TaskStatus["REVIEW"] = "REVIEW";
    TaskStatus["VERIFICATION"] = "VERIFICATION";
    TaskStatus["DONE"] = "DONE";
    TaskStatus["BLOCKED"] = "BLOCKED";
})(TaskStatus || (TaskStatus = {}));
export var AssigneeRole;
(function (AssigneeRole) {
    AssigneeRole["BACKEND"] = "BACKEND";
    AssigneeRole["FRONTEND"] = "FRONTEND";
    AssigneeRole["QA"] = "QA";
    AssigneeRole["PM"] = "PM";
    AssigneeRole["DESIGN"] = "DESIGN";
})(AssigneeRole || (AssigneeRole = {}));
export var EventType;
(function (EventType) {
    EventType["TASK_CREATED"] = "TASK_CREATED";
    EventType["TASK_UPDATED"] = "TASK_UPDATED";
    EventType["STATUS_CHANGED"] = "STATUS_CHANGED";
    EventType["COMMENT_ADDED"] = "COMMENT_ADDED";
    EventType["ARTIFACT_ADDED"] = "ARTIFACT_ADDED";
    EventType["LOCKED"] = "LOCKED";
    EventType["UNLOCKED"] = "UNLOCKED";
    EventType["CI_RAN"] = "CI_RAN";
})(EventType || (EventType = {}));
export * from "./schemas.js";
