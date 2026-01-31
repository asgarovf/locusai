# Locus Terminology Glossary

This document provides definitions for key terms and concepts used throughout the Locus project management system.

---

## Core Entities

### Workspace
The top-level container for your team's work. A workspace contains all your sprints, tasks, team members, and documentation. Think of it as your team's dedicated project environment.

**Key Features:**
- Contains multiple sprints
- Manages team member access and roles
- Houses the documentation knowledge base
- Provides unified task management across sprints

---

### Sprint
A time-boxed period for completing a set of tasks. Sprints help teams organize work into manageable iterations with clear goals and deadlines.

**Sprint Statuses:**
- `PLANNED` - Sprint is scheduled but not yet started
- `ACTIVE` - Sprint is currently in progress
- `COMPLETED` - Sprint has finished

**Attributes:**
- Name and description
- Start and end dates
- Goal/objective
- Associated tasks

---

### Task
A unit of work that needs to be completed. Tasks are the fundamental building blocks of work in Locus.

**Task Properties:**
- Title and description
- Status (current state)
- Priority (urgency level)
- Assignee (team member responsible)
- Sprint assignment
- Metadata (created date, updated date, etc.)

---

## Task Management

### Status
The current state of a task in its lifecycle. Status helps teams track progress and identify bottlenecks.

**Available Statuses:**
1. `Backlog` - Task is identified but not yet started
2. `In Progress` - Task is actively being worked on
3. `Review` - Task is complete and awaiting review
4. `Verification` - Task is being verified/tested
5. `Done` - Task is completed and verified
6. `Blocked` - Task cannot proceed due to dependencies or issues

---

### Priority
The urgency level assigned to a task, helping teams focus on the most important work first.

**Priority Levels:**
- `Low` - Can be addressed when time permits
- `Medium` - Standard priority work
- `High` - Important work that should be addressed soon
- `Critical` - Urgent work requiring immediate attention

---

### Assignee Role
The type of specialist needed to complete a task. This helps with resource planning and task routing.

**Role Types:**
- `Backend` - Backend development work (APIs, databases, server logic)
- `Frontend` - Frontend development work (UI, UX, client-side logic)
- `QA` - Quality assurance and testing
- `PM` - Project management and coordination
- `Design` - Design work (UI/UX design, graphics, etc.)

---

### Assignee / Assigned To
The actual team member (person or AI agent) who is responsible for completing the task. This is the specific individual assigned, as opposed to the role type needed.

---

## Documentation

### Documentation
The knowledge base containing project documentation, specifications, and reference materials. Documentation in Locus is organized and typed for easy access and maintenance.

**Document Types:**
- `General` - General documentation and guides
- `PRD` - Product Requirements Documents (what to build and why)
- `Tech Spec` - Technical Specifications (how to build it)
- `ADR` - Architecture Decision Records (key technical decisions and rationale)
- `API Design` - API design documents and specifications

**Key Features:**
- Version controlled
- Searchable
- Organized into groups
- Linked to relevant tasks and sprints

---

### Doc Group
A folder or organizational unit for grouping related documentation. Doc groups help structure the knowledge base for easier navigation and maintenance.

**Use Cases:**
- Group by feature or project area
- Group by document type
- Group by sprint or milestone

---

## Additional Concepts

### Team Member
A user who has access to the workspace and can be assigned tasks. Team members have roles and permissions within the workspace.

---

### Metadata
Automatically tracked information about entities such as:
- Created timestamp
- Last updated timestamp
- Creator information
- Version history

---

### Task Properties Panel
The UI component that displays and allows editing of task details, including status, priority, assignee, and custom properties.

---

### Verification
A stage in the task lifecycle where completed work is tested and validated before being marked as done. This ensures quality and completeness.

---

## Workflow Concepts

### Task Lifecycle
The typical flow of a task through various statuses:
1. Created → Backlog
2. Backlog → In Progress (when work begins)
3. In Progress → Review (when work is complete)
4. Review → Verification (when review passes)
5. Verification → Done (when verified)

Alternative paths:
- Any status → Blocked (when impediments arise)
- Blocked → Previous status (when unblocked)
- Review/Verification → In Progress (if changes needed)

---

### Sprint Planning
The process of selecting tasks from the backlog and assigning them to an upcoming sprint. This involves:
- Estimating effort
- Assigning priorities
- Distributing work among team members
- Setting sprint goals

---

## System Terms

### Backlog
The collection of all tasks that are identified but not yet started. The backlog serves as the repository of planned work.

---

### Active Sprint
The currently running sprint that the team is working on. Typically only one sprint is active at a time.

---

### Knowledge Base
The complete collection of documentation within a workspace, organized by groups and types.

---

## Notes

- **Extensibility**: The Locus system is designed to be flexible. Custom properties and fields can be added to tasks and other entities as needed.
- **Integration**: Tasks, sprints, and documentation are interconnected, allowing for comprehensive project tracking and knowledge management.
- **AI Integration**: Locus supports AI agents as assignees, enabling automated task execution and assistance.

---

*Last Updated: 2026-01-31*
