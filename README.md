# 🚀 DocDock — Multi-Tenant Document Management System

[![Run in Postman](https://run.pstmn.io/button.svg)](https://schema.getpostman.com/json/collection/v2.1.0/collection.json)
[![View API Docs](https://img.shields.io/badge/View-API%20Docs-0072F5?style=for-the-badge&logo=swagger&logoColor=white)](docs/api.md)
[![View ERD](https://img.shields.io/badge/View-Database%20ERD-4CAF50?style=for-the-badge&logo=databricks&logoColor=white)](docs/DB-ERD.svg)
[![Setup Guide](https://img.shields.io/badge/Setup-Guide-FF9800?style=for-the-badge&logo=readthedocs&logoColor=white)](SETUP.md)
---

## Architecture Overview

![Architecture Overview](docs/architecture-overview.png)

---

**DocDock** is a SaaS-ready, production-grade backend system for managing documents with:

- Version control  
- Hierarchical folder structures  
- Fine-grained access control  
- Transaction-safe operations  

Built to demonstrate **advanced backend architecture**, **data integrity**, and **real-world system design patterns**.

---

## 🧠 What This Project Solves

Modern organizations require:

- Secure document storage  
- Version tracking without data loss  
- Controlled access management  
- Recoverable delete workflows  
- Structured folder hierarchies  

DocDock delivers all of the above with:

- Strong multi-tenant isolation  
- RBAC + ACL-based authorization  
- Recursive folder operations  
- Full audit logging  
- Transactional safety  

---

## 🛠 Tech Stack

- **Node.js**
- **Express**
- **Prisma ORM**
- **PostgreSQL**
- **Cloudinary** (file storage)
- **JWT Authentication**

---

## 🔐 Core Features

### 🏢 Multi-Tenancy

- Organizations act as isolated tenants  
- Users can belong to multiple organizations  
- All resources strictly scoped by `orgId`  
- Cross-tenant access prevention  

---

### 🔑 Role-Based Access Control (RBAC)

Organization-level roles:

- `ADMIN`
- `EDITOR`
- `VIEWER`

Permission-based enforcement such as:

- `document.create`
- `document.delete`
- `folder.update`
- etc.

---

### 🛂 ACL Overrides

Supports fine-grained permission overrides:

- Folder-level permissions  
- Document-level permissions  

Resolution order:

1. Document-level override  
2. Folder-level override  
3. Organization role permissions  

Supports explicit `ALLOW` / `DENY` logic.

---

### 📁 Folder System

- Unlimited nested hierarchy (self-referential tree)  
- Recursive CTE-based subtree operations  
- Cycle prevention during move operations  
- Recursive soft delete  
- Recursive restore  
- Intelligent restore behavior (restores to root if parent no longer exists)

---

### 📄 Document System

- `Doc` → Logical document container  
- `DocVersion` → Versioned file storage  
- `currentVersionId` pointer to active version  

Features:

- Upload new versions without overwriting history  
- Full version history retention  
- Safe move & rename operations  
- Soft delete & restore  

---

### 🗑 Soft Delete & Restore

- Uses `deletedAt` timestamp  
- Fully reversible destructive operations  
- Recursive folder deletion  
- Intelligent restore logic  
- No automatic permanent data loss  

---

### 🧾 Audit Logging

Every critical action is logged, including:

- Document creation  
- Version updates  
- Folder rename/move  
- Delete & restore operations  

Audit entries store:

- Actor  
- Organization  
- Resource type  
- Resource ID  
- Metadata  
- Timestamp  

---

## 🏗 Engineering Highlights

- Recursive SQL (CTE) for subtree operations  
- Transactional integrity via Prisma  
- Database-level uniqueness constraints  
- Cross-tenant isolation at query level  
- Soft delete strategy across all resources  
- Clean separation of concerns:
- Industry-grade restore behavior  

---

## 📈 Why This Project Matters

DocDock is **not a CRUD demo**.

It demonstrates:

- Real SaaS multi-tenant architecture  
- Complex permission resolution systems  
- Recursive tree handling in relational databases  
- Version control modeling in SQL  
- Production-safe delete & restore workflows  
- Strong data integrity guarantees  

---

## 🎯 Status

✅ Document lifecycle fully implemented  
✅ Folder lifecycle fully implemented  
✅ Transactional safety enforced  
✅ Audit logging integrated  
✅ Multi-tenant isolation enforced  

---

**DocDock** represents a serious backend architecture project focused on production-ready SaaS design principles and enterprise-grade document management.
