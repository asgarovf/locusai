# Custom AMI Generation Guide

**Date:** 2026-02-18
**Status:** Active
**Author:** Locus Engineering

## Executive Summary

This guide documents how to build, test, and maintain the custom Amazon Machine Image (AMI) that Locus uses for EC2 instance provisioning. The custom AMI ships with all agent dependencies pre-installed — Node.js, Bun, Git, Claude CLI, Codex CLI, PM2, and the Locus agent — eliminating the bootstrap delay and reducing provisioning from minutes to seconds. It covers both automated (Packer) and manual build approaches.

---

## Table of Contents

1. [Overview](#1-overview)
2. [Prerequisites](#2-prerequisites)
3. [Base Image](#3-base-image)
4. [Dependencies to Install](#4-dependencies-to-install)
5. [Packer Template (Automated Build)](#5-packer-template-automated-build)
6. [Manual Build Steps](#6-manual-build-steps)
7. [Testing the AMI](#7-testing-the-ami)
8. [AMI Updates & Versioning](#8-ami-updates--versioning)
9. [Multi-Region Distribution](#9-multi-region-distribution)
10. [Security Hardening](#10-security-hardening)
11. [Troubleshooting](#11-troubleshooting)

---

## 1. Overview

### What Is the Custom AMI?

The Locus custom AMI is a pre-baked Ubuntu 22.04 EC2 image containing every dependency the Locus agent needs to operate. When Locus provisions a new instance in a user's AWS account, it launches from this AMI so the agent is ready almost immediately — no lengthy installation step required.

### Why a Custom AMI?

| Concern | Standard Ubuntu AMI | Custom Locus AMI |
|---------|-------------------|-----------------|
| Provisioning time | 5-10 min (install deps at boot) | ~30 sec (deps pre-installed) |
| Bootstrap complexity | User-data script must succeed | Minimal user-data (clone repo only) |
| Failure surface area | Network issues, version changes | Locked to tested versions |
| Cost | Same | Same (no extra AMI storage cost for a single image) |

### How It Fits in the Architecture

The Locus AWS orchestration flow works as follows:

1. User connects their AWS credentials via the Locus dashboard
2. User configures a new instance (repo URL, integrations, instance type)
3. Locus API calls `ec2:RunInstances` with the custom AMI ID (`LOCUS_AMI_ID` env var)
4. EC2 boots from the custom AMI — all dependencies already present
5. A minimal user-data script clones the target repository and configures integrations
6. The instance reports `RUNNING` status; user completes CLI auth via the web terminal

The AMI ID is configured in the Locus API via the `LOCUS_AMI_ID` environment variable. If unset, the system falls back to a default Ubuntu AMI (`ami-0c02fb55956c7d316`), but this requires the full bootstrap to run at launch.

---

## 2. Prerequisites

Before building the custom AMI, ensure you have:

### Required

- **AWS account** with EC2 permissions (launch instances, create AMIs, manage security groups)
- **AWS CLI v2** installed and configured (`aws configure`)
- **SSH key pair** registered in the target AWS region (for connecting during manual builds)

### For Automated Builds (Recommended)

- **HashiCorp Packer** v1.9+ installed

```bash
# macOS
brew install packer

# Linux (Ubuntu/Debian)
curl -fsSL https://apt.releases.hashicorp.com/gpg | sudo apt-key add -
sudo apt-add-repository "deb [arch=amd64] https://apt.releases.hashicorp.com $(lsb_release -cs) main"
sudo apt-get update && sudo apt-get install packer

# Verify
packer version
```

### For Manual Builds

- SSH client (OpenSSH or similar)
- Ability to connect to EC2 instances on port 22

---

## 3. Base Image

| Property | Value |
|----------|-------|
| **OS** | Ubuntu 22.04 LTS (Jammy Jellyfish) |
| **AMI ID (us-east-1)** | `ami-0c7217cdde317cfec` |
| **Architecture** | x86_64 (amd64) |
| **Root volume** | 8 GB gp3 (expandable) |

### Why Ubuntu 22.04 LTS?

- **Node.js compatibility**: Officially supported platform; NodeSource provides up-to-date packages
- **Community support**: Largest ecosystem of tutorials, packages, and troubleshooting resources
- **LTS stability**: Supported until April 2027 with security patches
- **Claude CLI & Codex**: Both tested and supported on Ubuntu
- **AWS first-class support**: Canonical publishes optimized Ubuntu AMIs for EC2

> **Note:** When Ubuntu 24.04 LTS reaches maturity and all dependencies confirm support, the base image should be upgraded. Track this as a versioned AMI rebuild.

---

## 4. Dependencies to Install

All dependencies and their installation commands are listed below. Version pins use the latest stable releases as of the guide date — update these when rebuilding.

### 4.1 System Packages

```bash
sudo apt-get update && sudo apt-get upgrade -y
sudo apt-get install -y \
  build-essential \
  python3 \
  python3-pip \
  curl \
  wget \
  unzip \
  jq \
  ca-certificates \
  gnupg \
  lsb-release \
  software-properties-common \
  apt-transport-https
```

**Purpose:** Build tools for native npm modules (`build-essential`, `python3`), and utilities used by installation scripts.

### 4.2 Git

```bash
sudo add-apt-repository ppa:git-core/ppa -y
sudo apt-get update
sudo apt-get install -y git

# Verify
git --version   # Expected: git version 2.43+
```

### 4.3 Node.js 20 LTS (via NodeSource)

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Verify
node --version   # Expected: v20.x.x
npm --version    # Expected: 10.x.x
```

**Why Node.js 20 LTS:** The Locus agent and CLI are built on Node.js. Version 20 is the current LTS with support through April 2026.

### 4.4 Bun Runtime

```bash
curl -fsSL https://bun.sh/install | bash

# Add to system-wide path
sudo ln -sf /home/ubuntu/.bun/bin/bun /usr/local/bin/bun

# Verify
bun --version   # Expected: 1.x.x
```

**Purpose:** Used as an alternative package manager and runtime. The Locus install script supports Bun as a package manager option.

### 4.5 PM2 (Process Manager)

```bash
sudo npm install -g pm2

# Configure PM2 to start on boot
pm2 startup systemd -u ubuntu --hp /home/ubuntu
sudo env PATH=$PATH:/usr/bin pm2 startup systemd -u ubuntu --hp /home/ubuntu

# Verify
pm2 --version   # Expected: 5.x.x
```

**Purpose:** Manages the Locus agent process — auto-restarts on crash, persists across reboots, provides log management.

### 4.6 Claude CLI

```bash
# Install Claude CLI (requires npm)
sudo npm install -g @anthropic-ai/claude-code

# Verify installation (auth happens later via web terminal)
claude --version
```

**Note:** Claude CLI requires interactive authentication. Users complete this step after provisioning through the Locus web-based terminal. The AMI only needs the binary pre-installed.

### 4.7 Codex CLI

```bash
# Install Codex CLI
sudo npm install -g @openai/codex

# Verify
codex --version
```

**Note:** Like Claude CLI, Codex requires interactive authentication post-provisioning.

### 4.8 Locus Agent Package

```bash
# Install the Locus CLI globally (includes the agent worker)
sudo npm install -g @locusai/cli

# Verify
locus --version
```

**Alternative — Direct install script:**

```bash
curl -fsSL https://locusai.dev/install.sh | bash -s -- \
  --repo "placeholder" \
  --server
```

> **Preferred approach for AMI:** Use `npm install -g @locusai/cli` for a clean, predictable installation. The install script is designed for end-user setup and handles repo cloning, which is not needed during AMI build.

### 4.9 Summary Table

| Dependency | Version | Install Method | Purpose |
|-----------|---------|---------------|---------|
| Ubuntu 22.04 LTS | 22.04 | Base AMI | Operating system |
| build-essential | Latest | apt | Native module compilation |
| python3 | 3.10+ | apt | Build dependency for node-gyp |
| Git | 2.43+ | apt (PPA) | Repository management |
| Node.js | 20 LTS | NodeSource | Runtime for Locus agent |
| npm | 10.x | Bundled with Node.js | Package manager |
| Bun | 1.x | Official installer | Alternative runtime/package manager |
| PM2 | 5.x | npm global | Process management |
| Claude CLI | Latest | npm global | AI code generation |
| Codex CLI | Latest | npm global | AI code generation |
| Locus CLI | Latest | npm global | Locus agent and worker |

---

## 5. Packer Template (Automated Build)

The recommended approach for reproducible AMI builds. Save this as `packer/locus-ami.pkr.hcl` in the Locus repository.

### 5.1 Packer HCL Template

```hcl
packer {
  required_plugins {
    amazon = {
      version = ">= 1.2.0"
      source  = "github.com/hashicorp/amazon"
    }
  }
}

# ─── Variables ────────────────────────────────────────────────────────────────

variable "aws_region" {
  type    = string
  default = "us-east-1"
}

variable "base_ami" {
  type        = string
  default     = "ami-0c7217cdde317cfec"
  description = "Ubuntu 22.04 LTS base AMI in us-east-1"
}

variable "instance_type" {
  type    = string
  default = "t3.small"
}

variable "ami_name_prefix" {
  type    = string
  default = "locus-agent"
}

variable "node_version" {
  type    = string
  default = "20"
}

variable "ami_version" {
  type        = string
  default     = "1.0.0"
  description = "Semantic version tag for this AMI build"
}

# ─── Locals ───────────────────────────────────────────────────────────────────

locals {
  timestamp = formatdate("YYYYMMDD-hhmm", timestamp())
  ami_name  = "${var.ami_name_prefix}-v${var.ami_version}-${local.timestamp}"
}

# ─── Source ───────────────────────────────────────────────────────────────────

source "amazon-ebs" "locus" {
  region        = var.aws_region
  source_ami    = var.base_ami
  instance_type = var.instance_type
  ssh_username  = "ubuntu"
  ami_name      = local.ami_name

  # Tag the resulting AMI for identification and lifecycle management
  tags = {
    Name        = local.ami_name
    Project     = "locus"
    Environment = "production"
    Version     = var.ami_version
    BaseAMI     = var.base_ami
    BuildDate   = local.timestamp
    ManagedBy   = "packer"
  }

  # Tag the snapshot backing the AMI
  snapshot_tags = {
    Name    = "${local.ami_name}-snapshot"
    Project = "locus"
  }

  # Increase root volume to 20 GB for dependencies and workspace
  launch_block_device_mappings {
    device_name           = "/dev/sda1"
    volume_size           = 20
    volume_type           = "gp3"
    delete_on_termination = true
  }
}

# ─── Build ────────────────────────────────────────────────────────────────────

build {
  name    = "locus-ami"
  sources = ["source.amazon-ebs.locus"]

  # Upload provisioning script
  provisioner "shell" {
    inline = [
      "echo '=== Locus AMI Build Started ==='",
      "echo \"Build timestamp: ${local.timestamp}\"",
      "echo \"Target version: ${var.ami_version}\""
    ]
  }

  # System updates and base packages
  provisioner "shell" {
    inline = [
      "sudo apt-get update",
      "sudo DEBIAN_FRONTEND=noninteractive apt-get upgrade -y",
      "sudo DEBIAN_FRONTEND=noninteractive apt-get install -y \\",
      "  build-essential python3 python3-pip curl wget unzip jq \\",
      "  ca-certificates gnupg lsb-release software-properties-common \\",
      "  apt-transport-https"
    ]
  }

  # Git (latest stable from PPA)
  provisioner "shell" {
    inline = [
      "sudo add-apt-repository ppa:git-core/ppa -y",
      "sudo apt-get update",
      "sudo apt-get install -y git",
      "git --version"
    ]
  }

  # Node.js 20 LTS via NodeSource
  provisioner "shell" {
    inline = [
      "curl -fsSL https://deb.nodesource.com/setup_${var.node_version}.x | sudo -E bash -",
      "sudo apt-get install -y nodejs",
      "node --version",
      "npm --version"
    ]
  }

  # Bun runtime
  provisioner "shell" {
    inline = [
      "curl -fsSL https://bun.sh/install | bash",
      "sudo ln -sf /home/ubuntu/.bun/bin/bun /usr/local/bin/bun",
      "bun --version"
    ]
  }

  # PM2 process manager
  provisioner "shell" {
    inline = [
      "sudo npm install -g pm2",
      "pm2 --version"
    ]
  }

  # Claude CLI
  provisioner "shell" {
    inline = [
      "sudo npm install -g @anthropic-ai/claude-code",
      "claude --version || echo 'Claude CLI installed (version check may require auth)'"
    ]
  }

  # Codex CLI
  provisioner "shell" {
    inline = [
      "sudo npm install -g @openai/codex",
      "codex --version || echo 'Codex CLI installed (version check may require auth)'"
    ]
  }

  # Locus agent CLI
  provisioner "shell" {
    inline = [
      "sudo npm install -g @locusai/cli",
      "locus --version || echo 'Locus CLI installed'"
    ]
  }

  # Configure PM2 startup on boot
  provisioner "shell" {
    inline = [
      "sudo env PATH=$PATH:/usr/bin pm2 startup systemd -u ubuntu --hp /home/ubuntu || true"
    ]
  }

  # Security hardening
  provisioner "shell" {
    inline = [
      "# Disable root SSH login",
      "sudo sed -i 's/^#*PermitRootLogin.*/PermitRootLogin no/' /etc/ssh/sshd_config",
      "",
      "# Enable UFW firewall with SSH allowed",
      "sudo ufw default deny incoming",
      "sudo ufw default allow outgoing",
      "sudo ufw allow 22/tcp",
      "sudo ufw --force enable",
      "",
      "# Install and configure fail2ban",
      "sudo apt-get install -y fail2ban",
      "sudo systemctl enable fail2ban",
      "",
      "# Enable unattended security updates",
      "sudo apt-get install -y unattended-upgrades",
      "sudo dpkg-reconfigure -f noninteractive unattended-upgrades"
    ]
  }

  # Cleanup
  provisioner "shell" {
    inline = [
      "sudo apt-get autoremove -y",
      "sudo apt-get clean",
      "sudo rm -rf /var/lib/apt/lists/*",
      "sudo rm -rf /tmp/*",
      "",
      "echo '=== Locus AMI Build Complete ==='"
    ]
  }

  # Post-build: output the AMI ID
  post-processor "manifest" {
    output     = "packer-manifest.json"
    strip_path = true
  }
}
```

### 5.2 Building with Packer

```bash
# Initialize Packer plugins (first time only)
cd packer/
packer init locus-ami.pkr.hcl

# Validate the template
packer validate locus-ami.pkr.hcl

# Build the AMI (uses default variable values)
packer build locus-ami.pkr.hcl

# Build with custom version tag
packer build -var 'ami_version=1.2.0' locus-ami.pkr.hcl

# Build in a different region (requires a different base AMI)
packer build -var 'aws_region=us-west-2' -var 'base_ami=ami-xxxxxxxxx' locus-ami.pkr.hcl
```

### 5.3 Build Output

After a successful build, Packer outputs:

```
==> locus-ami.amazon-ebs.locus: AMIs were created:
us-east-1: ami-0abc1234567890def

==> locus-ami.amazon-ebs.locus: Running post-processor: manifest
Build 'locus-ami.amazon-ebs.locus' finished after 8 minutes 32 seconds.
```

The AMI ID is also saved to `packer-manifest.json`:

```json
{
  "builds": [
    {
      "artifact_id": "us-east-1:ami-0abc1234567890def",
      "builder_type": "amazon-ebs"
    }
  ]
}
```

**Update the Locus API configuration** with the new AMI ID (see [Section 8](#8-ami-updates--versioning)).

---

## 6. Manual Build Steps

Use this approach if Packer is not available or for one-off builds.

### Step 1: Launch a Base Ubuntu Instance

```bash
# Launch a t3.small instance from the base Ubuntu 22.04 AMI
aws ec2 run-instances \
  --image-id ami-0c7217cdde317cfec \
  --instance-type t3.small \
  --key-name your-key-pair-name \
  --security-group-ids sg-xxxxxxxx \
  --block-device-mappings '[{"DeviceName":"/dev/sda1","Ebs":{"VolumeSize":20,"VolumeType":"gp3"}}]' \
  --tag-specifications 'ResourceType=instance,Tags=[{Key=Name,Value=locus-ami-builder}]' \
  --query 'Instances[0].InstanceId' \
  --output text
```

Note the returned instance ID (e.g., `i-0abc123456789`).

### Step 2: Wait for the Instance to Start

```bash
aws ec2 wait instance-running --instance-ids i-0abc123456789

# Get the public IP
aws ec2 describe-instances \
  --instance-ids i-0abc123456789 \
  --query 'Reservations[0].Instances[0].PublicIpAddress' \
  --output text
```

### Step 3: SSH into the Instance

```bash
ssh -i ~/.ssh/your-key.pem ubuntu@<public-ip>
```

### Step 4: Install All Dependencies

Run the following commands sequentially on the instance:

```bash
#!/bin/bash
set -euo pipefail

echo "=== Locus AMI Manual Build ==="
echo "Started at: $(date)"

# ─── System Updates ───────────────────────────────────────────────────────
sudo apt-get update
sudo DEBIAN_FRONTEND=noninteractive apt-get upgrade -y
sudo DEBIAN_FRONTEND=noninteractive apt-get install -y \
  build-essential python3 python3-pip curl wget unzip jq \
  ca-certificates gnupg lsb-release software-properties-common \
  apt-transport-https

# ─── Git ──────────────────────────────────────────────────────────────────
sudo add-apt-repository ppa:git-core/ppa -y
sudo apt-get update
sudo apt-get install -y git
echo "Git: $(git --version)"

# ─── Node.js 20 LTS ──────────────────────────────────────────────────────
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs
echo "Node.js: $(node --version)"
echo "npm: $(npm --version)"

# ─── Bun ──────────────────────────────────────────────────────────────────
curl -fsSL https://bun.sh/install | bash
sudo ln -sf /home/ubuntu/.bun/bin/bun /usr/local/bin/bun
echo "Bun: $(bun --version)"

# ─── PM2 ──────────────────────────────────────────────────────────────────
sudo npm install -g pm2
sudo env PATH=$PATH:/usr/bin pm2 startup systemd -u ubuntu --hp /home/ubuntu || true
echo "PM2: $(pm2 --version)"

# ─── Claude CLI ───────────────────────────────────────────────────────────
sudo npm install -g @anthropic-ai/claude-code
echo "Claude CLI installed"

# ─── Codex CLI ────────────────────────────────────────────────────────────
sudo npm install -g @openai/codex
echo "Codex CLI installed"

# ─── Locus Agent CLI ─────────────────────────────────────────────────────
sudo npm install -g @locusai/cli
echo "Locus CLI installed"

# ─── Security Hardening ──────────────────────────────────────────────────
# Disable root SSH login
sudo sed -i 's/^#*PermitRootLogin.*/PermitRootLogin no/' /etc/ssh/sshd_config

# UFW firewall
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow 22/tcp
sudo ufw --force enable

# fail2ban
sudo apt-get install -y fail2ban
sudo systemctl enable fail2ban

# Unattended security updates
sudo apt-get install -y unattended-upgrades
sudo dpkg-reconfigure -f noninteractive unattended-upgrades

# ─── Cleanup ─────────────────────────────────────────────────────────────
sudo apt-get autoremove -y
sudo apt-get clean
sudo rm -rf /var/lib/apt/lists/*
sudo rm -rf /tmp/*

echo "=== Locus AMI Manual Build Complete ==="
echo "Finished at: $(date)"
```

> **Tip:** You can save the above script as `build-ami.sh`, copy it to the instance with `scp`, and run it: `chmod +x build-ami.sh && ./build-ami.sh`

### Step 5: Verify the Installation

Before creating the AMI, verify all dependencies:

```bash
echo "=== Dependency Verification ==="
git --version
node --version
npm --version
bun --version
pm2 --version
which claude && echo "Claude CLI: OK" || echo "Claude CLI: MISSING"
which codex && echo "Codex CLI: OK" || echo "Codex CLI: MISSING"
which locus && echo "Locus CLI: OK" || echo "Locus CLI: MISSING"
sudo ufw status
sudo systemctl status fail2ban --no-pager
```

### Step 6: Create the AMI

```bash
# From your local machine (not the EC2 instance):
aws ec2 create-image \
  --instance-id i-0abc123456789 \
  --name "locus-agent-v1.0.0-$(date +%Y%m%d)" \
  --description "Locus agent AMI with Node.js 20, Bun, Claude CLI, Codex CLI, PM2" \
  --tag-specifications \
    'ResourceType=image,Tags=[{Key=Project,Value=locus},{Key=Version,Value=1.0.0},{Key=ManagedBy,Value=manual}]' \
  --query 'ImageId' \
  --output text
```

This returns the new AMI ID (e.g., `ami-0abc1234567890def`).

### Step 7: Wait for AMI Creation

```bash
aws ec2 wait image-available --image-ids ami-0abc1234567890def
echo "AMI is ready!"
```

### Step 8: Terminate the Builder Instance

```bash
aws ec2 terminate-instances --instance-ids i-0abc123456789
```

---

## 7. Testing the AMI

After building a new AMI, always run a smoke test before deploying to production.

### 7.1 Launch a Test Instance

```bash
aws ec2 run-instances \
  --image-id ami-0abc1234567890def \
  --instance-type t3.micro \
  --key-name your-key-pair-name \
  --security-group-ids sg-xxxxxxxx \
  --tag-specifications 'ResourceType=instance,Tags=[{Key=Name,Value=locus-ami-test}]' \
  --query 'Instances[0].InstanceId' \
  --output text
```

### 7.2 Connect and Verify

```bash
ssh -i ~/.ssh/your-key.pem ubuntu@<test-instance-ip>
```

Run the verification script:

```bash
#!/bin/bash
set -e

echo "=== Locus AMI Smoke Test ==="
PASS=0
FAIL=0

check() {
  local name="$1"
  local cmd="$2"
  if eval "$cmd" &>/dev/null; then
    echo "  PASS: $name"
    ((PASS++))
  else
    echo "  FAIL: $name"
    ((FAIL++))
  fi
}

check "Git installed"         "git --version"
check "Node.js installed"     "node --version"
check "npm installed"         "npm --version"
check "Bun installed"         "bun --version"
check "PM2 installed"         "pm2 --version"
check "Claude CLI installed"  "which claude"
check "Codex CLI installed"   "which codex"
check "Locus CLI installed"   "which locus"
check "UFW active"            "sudo ufw status | grep -q 'Status: active'"
check "fail2ban running"      "sudo systemctl is-active fail2ban"
check "Root login disabled"   "grep -q '^PermitRootLogin no' /etc/ssh/sshd_config"

echo ""
echo "=== Results: $PASS passed, $FAIL failed ==="

if [ "$FAIL" -gt 0 ]; then
  echo "AMI VERIFICATION FAILED — do not deploy."
  exit 1
else
  echo "AMI VERIFICATION PASSED — safe to deploy."
fi
```

### 7.3 Test Agent Bootstrap

Simulate what happens during actual provisioning:

```bash
# Clone a test repo (mimics user-data behavior)
cd /home/ubuntu
git clone https://github.com/octocat/Hello-World.git test-repo
cd test-repo

# Verify Locus agent can start (will fail auth, but binary should execute)
locus --version

# Verify PM2 can manage a process
pm2 start --name test-process "node -e 'setInterval(() => {}, 1000)'"
pm2 list
pm2 delete test-process

# Cleanup
cd /home/ubuntu && rm -rf test-repo
```

### 7.4 Cleanup Test Instance

```bash
aws ec2 terminate-instances --instance-ids <test-instance-id>
```

---

## 8. AMI Updates & Versioning

### When to Rebuild

Rebuild the AMI when any of the following occur:

| Trigger | Example | Priority |
|---------|---------|----------|
| **Security patch** | Ubuntu CVE, Node.js vulnerability | High — rebuild within 48 hours |
| **Major dependency update** | Node.js 20 → 22 LTS | Medium — plan and test |
| **New dependency added** | New CLI integration | Medium |
| **Minor version bumps** | Claude CLI patch update | Low — batch with other changes |
| **Base AMI update** | New Canonical Ubuntu 22.04 AMI | Low — quarterly |

### Versioning Strategy

AMI names follow this convention:

```
locus-agent-v{MAJOR}.{MINOR}.{PATCH}-{YYYYMMDD-HHmm}
```

Examples:
- `locus-agent-v1.0.0-20260218-1430`
- `locus-agent-v1.1.0-20260315-0900`
- `locus-agent-v2.0.0-20260601-1200`

**Version bumping rules:**

- **MAJOR**: Base OS change (e.g., Ubuntu 22.04 → 24.04), Node.js major version
- **MINOR**: New dependency added, significant version bump of existing dep
- **PATCH**: Security patches, minor version bumps, bug fixes

### Updating the Locus Configuration

After building a new AMI, update the `LOCUS_AMI_ID` environment variable in the Locus API:

```bash
# In the API environment configuration (.env or deployment config):
LOCUS_AMI_ID=ami-0abc1234567890def
```

The Locus API reads this at `apps/api/src/aws/aws-instances.service.ts`:

```typescript
const amiId = this.configService.get<string>("LOCUS_AMI_ID") ?? DEFAULT_AMI_ID;
```

**Rollback procedure:** If a new AMI causes issues, revert `LOCUS_AMI_ID` to the previous AMI ID. Old AMIs should be retained for at least 30 days after replacement.

### AMI Lifecycle

```
Build New AMI
    ↓
Test with Smoke Suite (Section 7)
    ↓
Update LOCUS_AMI_ID in staging
    ↓
Provision test instance in staging
    ↓
Verify end-to-end flow works
    ↓
Update LOCUS_AMI_ID in production
    ↓
Monitor new instances for 48 hours
    ↓
Deregister old AMI (after 30 days)
```

### Deregistering Old AMIs

```bash
# Deregister the old AMI (does not delete the snapshot)
aws ec2 deregister-image --image-id ami-old123456789

# Find and delete the associated snapshot
aws ec2 describe-snapshots \
  --filters "Name=description,Values=*ami-old123456789*" \
  --query 'Snapshots[0].SnapshotId' --output text

aws ec2 delete-snapshot --snapshot-id snap-xxxxxxxx
```

---

## 9. Multi-Region Distribution

> **Current scope:** Single region (`us-east-1`). Multi-region is a future consideration.

When multi-region support is needed, AMIs must be copied to each target region since AMIs are region-specific.

### Copy an AMI to Another Region

```bash
# Copy the AMI from us-east-1 to us-west-2
aws ec2 copy-image \
  --source-region us-east-1 \
  --source-image-id ami-0abc1234567890def \
  --name "locus-agent-v1.0.0-20260218-1430" \
  --description "Locus agent AMI (copied from us-east-1)" \
  --region us-west-2 \
  --query 'ImageId' \
  --output text

# Wait for the copy to complete
aws ec2 wait image-available \
  --image-ids ami-newregion123 \
  --region us-west-2
```

### Multi-Region Configuration

The Locus API would need a region-to-AMI mapping:

```bash
# Environment configuration for multi-region
LOCUS_AMI_ID_US_EAST_1=ami-0abc1234567890def
LOCUS_AMI_ID_US_WEST_2=ami-newregion123456
LOCUS_AMI_ID_EU_WEST_1=ami-euregion123456
```

### Automation Script for Multi-Region Copies

```bash
#!/bin/bash
# copy-ami-to-regions.sh
# Usage: ./copy-ami-to-regions.sh <source-ami-id> <ami-name>

SOURCE_AMI="$1"
AMI_NAME="$2"
SOURCE_REGION="us-east-1"
TARGET_REGIONS=("us-west-2" "eu-west-1" "ap-southeast-1")

for region in "${TARGET_REGIONS[@]}"; do
  echo "Copying to $region..."
  NEW_AMI=$(aws ec2 copy-image \
    --source-region "$SOURCE_REGION" \
    --source-image-id "$SOURCE_AMI" \
    --name "$AMI_NAME" \
    --region "$region" \
    --query 'ImageId' \
    --output text)
  echo "  $region: $NEW_AMI"
done

echo "Copies initiated. Run 'aws ec2 wait image-available' per region to confirm."
```

---

## 10. Security Hardening

The following hardening measures are applied during the AMI build (both in the Packer template and manual steps). This section explains the rationale and configuration.

### 10.1 Disable Root SSH Login

```bash
sudo sed -i 's/^#*PermitRootLogin.*/PermitRootLogin no/' /etc/ssh/sshd_config
```

**Why:** Root login over SSH is a common attack vector. The `ubuntu` user with sudo access provides equivalent functionality with an audit trail.

### 10.2 UFW Firewall

```bash
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow 22/tcp       # SSH
sudo ufw --force enable
```

**Why:** Blocks all inbound traffic except SSH. If the agent exposes additional ports in the future (e.g., webhook endpoints), those must be explicitly allowed.

**Note:** Locus also manages AWS security groups at the EC2 level, providing a second layer of network control. UFW acts as a host-level firewall in case security group rules are misconfigured.

### 10.3 fail2ban

```bash
sudo apt-get install -y fail2ban
sudo systemctl enable fail2ban
```

**Default configuration** bans IPs after 5 failed SSH attempts for 10 minutes. This is sufficient for the default use case.

**Custom configuration** (optional, create `/etc/fail2ban/jail.local`):

```ini
[sshd]
enabled = true
port = 22
maxretry = 3
bantime = 3600
findtime = 600
```

### 10.4 Unattended Security Updates

```bash
sudo apt-get install -y unattended-upgrades
sudo dpkg-reconfigure -f noninteractive unattended-upgrades
```

**Why:** Automatically applies security patches from Ubuntu's security repository. Only security updates are applied — not feature updates that might break compatibility.

### 10.5 Additional Recommendations

These are not applied in the default AMI but should be considered for high-security deployments:

| Measure | Command/Config | When to Apply |
|---------|---------------|---------------|
| **SSH key-only auth** | `PasswordAuthentication no` in sshd_config | Already default on Ubuntu EC2 |
| **Change SSH port** | `Port 2222` in sshd_config + UFW rule | If SSH brute force is a concern |
| **Restrict sudo** | Remove NOPASSWD for non-essential commands | Team deployments |
| **Audit logging** | `sudo apt install auditd` | Compliance requirements |
| **Disk encryption** | Use encrypted EBS volumes at launch | Sensitive codebases |

---

## 11. Troubleshooting

### Build Failures

#### Packer: "Timeout waiting for SSH"

**Cause:** Security group does not allow inbound SSH from the Packer build machine.

**Fix:** Ensure the default VPC security group allows SSH (port 22) from your IP, or specify a security group in the Packer template:

```hcl
source "amazon-ebs" "locus" {
  # ... existing config ...
  security_group_ids = ["sg-xxxxxxxx"]
}
```

#### Packer: "Access Denied" or credential errors

**Cause:** AWS credentials not configured or insufficient permissions.

**Fix:** Ensure `~/.aws/credentials` is configured or `AWS_ACCESS_KEY_ID`/`AWS_SECRET_ACCESS_KEY` are set. Required permissions:
- `ec2:RunInstances`, `ec2:StopInstances`, `ec2:TerminateInstances`
- `ec2:CreateImage`, `ec2:RegisterImage`, `ec2:DeregisterImage`
- `ec2:DescribeImages`, `ec2:DescribeInstances`
- `ec2:CreateTags`, `ec2:ModifyImageAttribute`

#### NodeSource: "Repository not found" or GPG errors

**Cause:** NodeSource repository setup script has changed or is temporarily unavailable.

**Fix:** Use the official NodeSource setup, or fall back to the manual repository addition:

```bash
sudo mkdir -p /etc/apt/keyrings
curl -fsSL https://deb.nodesource.com/gpgkey/nodesource-repo.gpg.key | sudo gpg --dearmor -o /etc/apt/keyrings/nodesource.gpg
echo "deb [signed-by=/etc/apt/keyrings/nodesource.gpg] https://deb.nodesource.com/node_20.x nodistro main" | sudo tee /etc/apt/sources.list.d/nodesource.list
sudo apt-get update && sudo apt-get install -y nodejs
```

#### Bun install fails

**Cause:** The Bun install script downloads a binary for the detected architecture. Fails if running on ARM.

**Fix:** Verify the instance type is x86_64 (amd64). ARM-based instances (Graviton) require a different Bun build:

```bash
# Check architecture
uname -m  # Should output: x86_64
```

#### npm global install permission errors

**Cause:** Running `npm install -g` without sudo, or npm prefix misconfigured.

**Fix:** Always use `sudo npm install -g` for global packages during AMI build. Alternatively, configure npm to use a user-local directory:

```bash
mkdir -p ~/.npm-global
npm config set prefix '~/.npm-global'
echo 'export PATH=~/.npm-global/bin:$PATH' >> ~/.bashrc
source ~/.bashrc
```

### Runtime Issues

#### Instance boots but agent doesn't start

**Cause:** PM2 startup configuration not persisted, or user-data script failed.

**Debug:**
```bash
# Check user-data script output
cat /var/log/locus-setup.log

# Check cloud-init logs
cat /var/log/cloud-init-output.log

# Check PM2 status
pm2 list
pm2 logs
```

#### Claude/Codex CLI not found after SSH

**Cause:** Global npm binaries not in PATH for the `ubuntu` user.

**Fix:** Verify the PATH includes `/usr/bin` and `/usr/local/bin`:

```bash
echo $PATH
which claude
npm list -g --depth=0
```

#### UFW blocking required traffic

**Cause:** A new integration requires an inbound port that UFW is blocking.

**Fix:**
```bash
# Allow a specific port (e.g., webhook on 3000)
sudo ufw allow 3000/tcp

# Check current rules
sudo ufw status numbered
```

#### AMI not available in target region

**Cause:** AMIs are region-specific. An AMI built in `us-east-1` is not visible in `us-west-2`.

**Fix:** Copy the AMI to the target region (see [Section 9](#9-multi-region-distribution)).

#### Disk space full on instances

**Cause:** The 20 GB root volume may fill up with large repositories or many npm packages.

**Fix:** Monitor disk usage and increase volume size at launch:

```bash
# Check disk usage
df -h /

# To increase: modify the launch_block_device_mappings in Packer,
# or specify a larger volume when launching via the AWS API
```

---

## Appendix: Quick Reference

### Build Commands

```bash
# Packer (automated)
cd packer/
packer init locus-ami.pkr.hcl
packer build -var 'ami_version=1.0.0' locus-ami.pkr.hcl

# Update Locus config
export LOCUS_AMI_ID=ami-0abc1234567890def
```

### Key Environment Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `LOCUS_AMI_ID` | AMI used for provisioning | `ami-0abc1234567890def` |
| `LOCUS_AWS_KEY_PAIR_NAME` | EC2 key pair name | `locus-production` |
| `LOCUS_SSH_PRIVATE_KEY_PATH` | Path to SSH private key | `/etc/locus/keys/id_rsa` |
| `LOCUS_AGENT_LATEST_VERSION` | Current agent version | `1.0.0` |

### Key File Locations (on AMI instances)

| Path | Description |
|------|-------------|
| `/home/ubuntu/` | Default workspace root |
| `/var/log/locus-setup.log` | Provisioning bootstrap log |
| `/var/log/cloud-init-output.log` | Cloud-init output |
| `/etc/ssh/sshd_config` | SSH server configuration |
| `/etc/fail2ban/jail.local` | fail2ban custom config |
