
Authentication: JWT required  
All responses are JSON.

---

# 🌐 HTTP Response Status Codes

DocDock follows standard RESTful response semantics.

## ✅ Success

- **200 OK** – Successful request
- **201 Created** – Resource successfully created
- **204 No Content** – Successful operation with no response body

---

## ❌ Client Errors

- **400 Bad Request** – Invalid request payload or validation error
- **401 Unauthorized** – Missing or invalid authentication token
- **403 Forbidden** – Access denied
- **404 Not Found** – Resource not found
- **409 Conflict** – Duplicate resource or state conflict
- **429 Too Many Requests** – Rate limit exceeded

---

## 💥 Server Errors

- **500 Internal Server Error**
- **502 Bad Gateway**
- **503 Service Unavailable**
- **504 Gateway Timeout**

---

# 📄 Document Endpoints

---

## 🔹 Get Root Documents

`GET /api/v1/orgs/:orgId/docs`

Returns documents located at the organization root.

---

## 🔹 Get Single Document

`GET /api/v1/orgs/:orgId/docs/:docId`

Returns a single document and its current version metadata.

---

## 🔹 Create Document

`POST /api/v1/orgs/:orgId/docs`

Creates a new document in the organization root.

---

## 🔹 Upload New Version

`POST /api/v1/orgs/:orgId/docs/:docId/versions`

Creates a new version for an existing document.

---

## 🔹 Get Document Versions

`GET /api/v1/orgs/:orgId/docs/:docId/versions`

Returns version history for a document.

---

## 🔹 Rename Document

`PATCH /api/v1/orgs/:orgId/docs/:docId`

Renames an existing document.

---

## 🔹 Move Document

`PATCH /api/v1/orgs/:orgId/docs/:docId/move`

Moves a document to another folder within the organization.

---

## 🔹 Delete Document (Soft Delete)

`DELETE /api/v1/orgs/:orgId/docs/:docId`

Marks a document as deleted.

---

## 🔹 Restore Document

`POST /api/v1/orgs/:orgId/docs/:docId/restore`

Restores a previously deleted document.

---

# 📁 Folder Endpoints

---

## 🔹 Get Root Folders

`GET /api/v1/orgs/:orgId/folders/:folderId`

Returns contents of the folder

---

## 🔹 Create Folder

`POST /api/v1/orgs/:orgId/folders`

Creates a new folder in the organization root.

---

## 🔹 Rename Folder

`PATCH /api/v1/orgs/:orgId/folders/:folderId`

Renames an existing folder.

---

## 🔹 Move Folder

`PATCH /api/v1/orgs/:orgId/folders/:folderId/move`

Moves a folder within the organization hierarchy.

---

## 🔹 Delete Folder (Recursive Soft Delete)

`DELETE /api/v1/orgs/:orgId/folders/:folderId`

Recursively marks a folder and its contents as deleted.

---

## 🔹 Restore Folder (Recursive Restore)

`POST /api/v1/orgs/:orgId/folders/:folderId/restore`

Recursively restores a previously deleted folder and its contents.
