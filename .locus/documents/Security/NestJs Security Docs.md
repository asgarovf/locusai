# **Technical Specification: NestJS Security Standards & Best Practices**

**Project:** Locus AI\
**Document Version:** 1.0.0\
**Status:** DRAFT / PLANNING\
**Lead Architect:** Locus AI

---

## **1. Executive Summary**

As Locus AI operates on a **"Cloud Planning + Local Execution"** model, the security of our NestJS backend is the cornerstone of trust. We handle sensitive project manifests, semantic indices, and coordinate execution on local machines. This document outlines the mandatory security protocols for the NestJS 11 backend to prevent unauthorized access, data leaks, and injection attacks.

---

## **2. Core Security Pillars**

### **2.1 Authentication & Identity Management**

We utilize **Passport.js** with **JWT (JSON Web Tokens)** for stateless authentication.

- **Implementation Requirements:**
  - Use `@nestjs/jwt` for token signing and verification.
  - **Short-lived Access Tokens:** 15-30 minutes.
  - **Secure Refresh Tokens:** Stored in HTTP-only, SameSite=Strict cookies (not accessible via JS).
  - **Bcrypt/Argon2:** Mandatory for password hashing (minimum 12 rounds).
- **Locus AI Specific:** Local Agents must use **API Keys** or **Machine-to-Machine (M2M) tokens** with strict scopes, rotated every 30 days.

### **2.2 Authorization (RBAC & ABAC)**

Access control must be enforced at the controller and method level using NestJS Guards.

- **Role-Based Access Control (RBAC):** Define roles (Admin, Architect, Agent, Viewer).
- **Attribute-Based Access Control (ABAC):** For granular permissions (e.g., "Agent X can only access Project Y").
- **Implementation:** Use a custom `@Roles()` decorator and an `AuthGuard`.

### **2.3 Input Validation & Sanitization**

Never trust client input. All incoming data must be validated against a schema.

- **Tools:** `class-validator` and `class-transformer`.
- **Global Validation Pipe:**

  ```typescript
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,               // Strip non-decorated properties
    forbidNonWhitelisted: true,    // Throw error if extra properties exist
    transform: true,               // Auto-transform payloads to DTO instances
  }));
  
  ```
- **Sanitization:** Use `dompurify` or `sanitize-html` if processing any markdown or user-provided HTML to prevent XSS.

### **2.4 Secure Headers & Middleware**

Protect the application from common web vulnerabilities (OWASP Top 10).

- **Helmet:** Mandatory middleware to set secure HTTP headers (HSTS, CSP, X-Frame-Options, etc.).
- **CORS:** Strictly define allowed origins. Never use `origin: '*'`.
- **Rate Limiting:** Use `@nestjs/throttler` to prevent Brute Force and DDoS attacks on sensitive endpoints (Login, Password Reset, Local Agent Polling).

---

## **3. Database & Infrastructure Security**

### **3.1 TypeORM & SQL Injection**

- **Parameterized Queries:** Always use TypeORM's `QueryBuilder` or repository methods. Never concatenate strings into raw queries.
- **Encryption at Rest:** Ensure PostgreSQL sensitive columns (like API keys for providers) are encrypted using `typeorm-transformer` or native PG crypto.

### **3.2 Secret Management**

- **Zero Hardcoded Secrets:** Use `@nestjs/config` to load environment variables.
- **Validation:** Use `joi` to validate that all required environment variables exist at startup.
- **Production:** Use a Secret Manager (AWS Secrets Manager, HashiCorp Vault, or GitHub Secrets) instead of `.env` files.

---

## **4. Locus AI Unique Security: Local Agent Polling**

Since Local Agents poll the Cloud for tasks:

1. **Mutual TLS (mTLS) / Signed Requests:** Ideally, requests from agents should be signed to verify identity.
2. **Payload Encryption:** Manifests containing sensitive logic should be encrypted before being sent to the local agent, decryptable only by the agent's private key.
3. **Audit Logging:** Every interaction between the Cloud and the Local Agent must be logged in the event-sourced audit trail.

---

## **5. Security Acceptance Checklist**

**IDRequirementTestable CriteriaSEC-01No Raw SQL**Code review confirms 0 instances of string concatenation in DB queries.**SEC-02DTO Enforcement**All POST/PATCH endpoints have a defined DTO with `class-validator` decorators.**SEC-03Security Headers**`curl -I` on the API returns `X-Content-Type-Options: nosniff` and `Strict-Transport-Security`.**SEC-04Rate Limiting**Sending 100 requests/sec to `/auth/login` results in a `429 Too Many Requests`.**SEC-05JWT Validation**Expired tokens or tokens signed with a different secret return `401 Unauthorized`.**SEC-06Cookie Security**Refresh tokens are marked `HttpOnly`, `Secure`, and `SameSite=Strict`.

---

## **6. Next Steps**

To implement these standards, I recommend the following immediate actions: