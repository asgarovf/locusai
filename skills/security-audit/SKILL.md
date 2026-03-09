---
name: security-audit
description: Audit code and infrastructure for security vulnerabilities. Use when performing security reviews, checking for OWASP Top 10 issues, auditing dependencies, or hardening applications.
allowed-tools: [Read, Grep, Glob, Bash]
tags: [security, audit, vulnerabilities, owasp, xss, sql-injection, authentication, secrets]
platforms: [Claude, ChatGPT, Gemini]
author: locusai
---

# Security Audit

## When to use this skill
- Auditing a codebase for security vulnerabilities
- Reviewing authentication and authorization
- Checking for exposed secrets or credentials
- Assessing dependency security
- Hardening an application before deployment
- Responding to security alerts

## Step 1: Secrets and credentials scan

```bash
# Search for hardcoded secrets
grep -rn "password\s*=\|api_key\s*=\|secret\s*=\|token\s*=" --include="*.ts" --include="*.py" --include="*.js" --include="*.env" .
grep -rn "AKIA[0-9A-Z]\{16\}" .  # AWS access keys
grep -rn "sk-[a-zA-Z0-9]\{20,\}" .  # API keys (OpenAI, Stripe, etc.)
grep -rn "ghp_[a-zA-Z0-9]\{36\}" .  # GitHub personal access tokens

# Check for .env files in git
git ls-files | grep -i "\.env"

# Check .gitignore covers sensitive files
cat .gitignore | grep -i "env\|secret\|key\|credential"
```

**Findings to flag:**
- Any credential in source code (even in comments)
- `.env` files tracked by git
- Missing `.gitignore` entries for sensitive files

## Step 2: Input validation (Injection attacks)

### SQL Injection

```bash
# Find raw SQL queries
grep -rn "query(\`\|query(f\"\|execute(f\"\|\.raw(" --include="*.ts" --include="*.py" --include="*.js" .
grep -rn "\$\{.*\}" --include="*.sql" .
```

```typescript
// VULNERABLE
db.query(`SELECT * FROM users WHERE id = ${userId}`);

// SAFE: Parameterized query
db.query('SELECT * FROM users WHERE id = $1', [userId]);
```

### XSS (Cross-Site Scripting)

```bash
# Find dangerous HTML injection
grep -rn "innerHTML\|dangerouslySetInnerHTML\|v-html\|\|html(" --include="*.tsx" --include="*.jsx" --include="*.vue" --include="*.html" .
```

```typescript
// VULNERABLE
element.innerHTML = userInput;
<div dangerouslySetInnerHTML={{ __html: userContent }} />

// SAFE
element.textContent = userInput;
// Or sanitize: DOMPurify.sanitize(userContent)
```

### Command Injection

```bash
# Find shell command execution
grep -rn "exec(\|spawn(\|execSync(\|child_process\|subprocess\|os\.system\|os\.popen" --include="*.ts" --include="*.py" --include="*.js" .
```

```typescript
// VULNERABLE
exec(`git log --author="${userInput}"`);

// SAFE: Use array form to avoid shell interpretation
execFile('git', ['log', `--author=${userInput}`]);
```

### Path Traversal

```bash
grep -rn "readFile\|readFileSync\|open(\|Path\|sendFile\|serve_file" --include="*.ts" --include="*.py" --include="*.js" . | grep -v node_modules
```

```typescript
// VULNERABLE
app.get('/file', (req, res) => {
  res.sendFile(path.join('/uploads', req.query.name));
  // req.query.name = "../../etc/passwd"
});

// SAFE: Validate path stays within allowed directory
const safePath = path.resolve('/uploads', req.query.name);
if (!safePath.startsWith('/uploads/')) {
  return res.status(403).send('Access denied');
}
```

## Step 3: Authentication and authorization

```bash
# Find auth-related code
grep -rn "authenticate\|authorize\|isAdmin\|checkPermission\|jwt\|session\|cookie" --include="*.ts" --include="*.py" --include="*.js" -l .

# Find unprotected routes
grep -rn "app\.\(get\|post\|put\|delete\|patch\)" --include="*.ts" --include="*.js" .
```

**Check for:**
- [ ] All sensitive endpoints require authentication
- [ ] Role-based access control properly enforced
- [ ] JWT tokens have expiration (`exp` claim)
- [ ] Passwords hashed with bcrypt/argon2 (not MD5/SHA)
- [ ] Session tokens are httpOnly, secure, sameSite
- [ ] Rate limiting on login endpoints
- [ ] Account lockout after failed attempts

## Step 4: Dependency audit

```bash
# Node.js
npm audit
npm audit --json | jq '.vulnerabilities | to_entries[] | select(.value.severity == "critical" or .value.severity == "high") | {name: .key, severity: .value.severity}'

# Python
pip-audit
safety check

# Check for known vulnerable versions
npx is-my-node-vulnerable
```

## Step 5: Configuration security

```bash
# Check for debug mode in production
grep -rn "DEBUG\s*=\s*True\|NODE_ENV.*development" --include="*.py" --include="*.ts" --include="*.env" .

# Check CORS configuration
grep -rn "cors\|Access-Control\|origin.*\*" --include="*.ts" --include="*.py" --include="*.js" .

# Check for permissive CORS
grep -rn "origin:\s*['\"]?\*['\"]?" --include="*.ts" --include="*.js" .
```

**Check for:**
- [ ] CORS not set to `*` in production
- [ ] HTTPS enforced (HSTS headers)
- [ ] Security headers set (CSP, X-Frame-Options, X-Content-Type-Options)
- [ ] Debug mode disabled in production
- [ ] Error messages don't leak stack traces

## Step 6: Data protection

- [ ] Sensitive data encrypted at rest
- [ ] PII not logged in plain text
- [ ] Database connections use TLS
- [ ] Backups are encrypted
- [ ] Data retention policies implemented
- [ ] GDPR/privacy compliance (if applicable)

## Audit report format

```markdown
## Security Audit Summary

**Scope**: [what was reviewed]
**Date**: [date]
**Risk Level**: [Critical / High / Medium / Low]

### Critical Findings
1. **[Title]** — [description, location, impact, fix]

### High Findings
1. **[Title]** — [description, location, impact, fix]

### Medium Findings
1. ...

### Recommendations
- [Prioritized list of improvements]
```

## Checklist

- [ ] No hardcoded secrets or credentials
- [ ] All user input validated and sanitized
- [ ] SQL injection prevention (parameterized queries)
- [ ] XSS prevention (output encoding)
- [ ] Command injection prevention
- [ ] Authentication on all sensitive endpoints
- [ ] Authorization checks enforced
- [ ] Dependencies audited for vulnerabilities
- [ ] CORS properly configured
- [ ] Security headers set
- [ ] Error messages don't leak internals
- [ ] Logging doesn't contain sensitive data
