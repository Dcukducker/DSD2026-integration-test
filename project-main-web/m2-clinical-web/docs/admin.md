# Software Requirements Specification (M2) - Doctor Module (Simplified)

## 1 External Use Cases - Admin

### 1.1 Actor Table

| Actor | Description |
| :--- | :--- |
| System Administrator | Monitors and manages the platform, including doctor registration approval, user account management, system data review, and notification administration |

### 1.2 Use Case Table

| Use Case ID | Use Case Name | Primary Actor | Brief Description |
| :--- | :--- | :--- | :--- |
| UC-M2-ADMIN-01 | Admin Login / Logout | System Administrator | System Administrator logs into the system and accesses the admin dashboard, or logs out to terminate the session |
| UC-M2-ADMIN-02 | Review Doctor Registration | System Administrator | System Administrator reviews doctor registration applications and verifies submitted licenses |
| UC-M2-ADMIN-03 | Manage Doctor Accounts | System Administrator | System Administrator manages doctor accounts after registration |
| UC-M2-ADMIN-04 | Manage Patient Accounts | System Administrator | System Administrator manages patient/user accounts |
| UC-M2-ADMIN-05 | View Health Data Reports | System Administrator | System Administrator views aggregated system statistics and health data reports |
| UC-M2-ADMIN-06 | Handle User Feedback | System Administrator | System Administrator processes feedback submitted by users |
| UC-M2-ADMIN-07 | Manage Content | System Administrator | System Administrator manages platform content such as announcements |
| UC-M2-ADMIN-08 | Role & Permission Management | System Administrator | System Administrator assigns roles and permissions to users |
| UC-M2-ADMIN-09 | Audit Admin Actions | System Administrator | System records administrator activities for traceability |
| UC-M2-ADMIN-10 | Notification Management | System Administrator | System Administrator manages system notifications |

### 1.3 Detailed Use Cases

#### UC-M2-ADMIN-01: Admin Login / Logout

| Element | Description |
| :--- | :--- |
| **Reference** | UC-M2-ADMIN-01 |
| **Actors** | System Administrator |
| **Goal** | Administrator logs into the system and accesses the admin dashboard |
| **Summary** | Admin enters credentials to authenticate and gain access to the system, or logs out to terminate the session |
| **Trigger** | Admin navigates to login page or clicks logout button |
| **Precondition** | Admin account exists |
| **Postconditions** | Admin session is created or terminated |

**Basic Flow**

| Step | Actor Action | System Response |
| :--- | :--- | :--- |
| 1 | Admin enters username and password | |
| 2 | Admin clicks login button | System validates credentials |
| 3 | | System grants access and creates session |
| 4 | Admin logs out | Session is destroyed |

**Alternative Flow**

| Occurrence Step | Condition | System Response |
| :--- | :--- | :--- |
| 2 | Invalid credentials entered | Error message displayed |

---

#### UC-M2-ADMIN-02: Review Doctor Registration

| Element | Description |
| :--- | :--- |
| **Reference** | UC-M2-ADMIN-02 |
| **Actors** | System Administrator |
| **Goal** | Administrator reviews doctor registration applications and verifies submitted licenses |
| **Summary** | Admin reviews pending doctor registration requests, inspects license documents, and approves or rejects applications |
| **Trigger** | Doctor submits registration request |
| **Precondition** | Doctor has submitted registration request |
| **Postconditions** | Application status is updated (approved/rejected); doctor is notified |

**Basic Flow**

| Step | Actor Action | System Response |
| :--- | :--- | :--- |
| 1 | Admin views pending applications | |
| 2 | Admin opens doctor profile | |
| 3 | Admin reviews license documents | |
| 4 | Admin approves or rejects application | |
| 5 | | System updates status and notifies doctor |

**Alternative Flow**

| Occurrence Step | Condition | System Response |
| :--- | :--- | :--- |
| 3 | Missing or unclear documents | Reject with reason |

---

#### UC-M2-ADMIN-03: Manage Doctor Accounts

| Element | Description |
| :--- | :--- |
| **Reference** | UC-M2-ADMIN-03 |
| **Actors** | System Administrator |
| **Goal** | Administrator manages doctor accounts after registration |
| **Summary** | Admin searches, views, and manages individual doctor account statuses |
| **Trigger** | Admin accesses doctor management section |
| **Precondition** | Doctor account exists |
| **Postconditions** | Account status updated (enabled/disabled/deleted) |

**Basic Flow**

| Step | Actor Action | System Response |
| :--- | :--- | :--- |
| 1 | Admin searches doctor list | |
| 2 | Admin views account details | |
| 3 | Admin enables/disables or deletes account | System updates account status |

---

#### UC-M2-ADMIN-04: Manage Patient Accounts

| Element | Description |
| :--- | :--- |
| **Reference** | UC-M2-ADMIN-04 |
| **Actors** | System Administrator |
| **Goal** | Administrator manages patient/user accounts |
| **Summary** | Admin views user list, inspects data, and manages account states |
| **Trigger** | Admin accesses user management section |
| **Precondition** | User account exists |
| **Postconditions** | Account status updated or account deleted |

**Basic Flow**

| Step | Actor Action | System Response |
| :--- | :--- | :--- |
| 1 | Admin views user list | |
| 2 | Admin inspects user data summary | |
| 3 | Admin disables or deletes account if necessary | System updates account status |

---

#### UC-M2-ADMIN-05: View Health Data Reports

| Element | Description |
| :--- | :--- |
| **Reference** | UC-M2-ADMIN-05 |
| **Actors** | System Administrator |
| **Goal** | Administrator views aggregated system statistics and health data reports |
| **Summary** | Admin accesses dashboard to review platform analytics and usage metrics |
| **Trigger** | Admin navigates to reports/dashboard section |
| **Precondition** | System has collected aggregated data |
| **Postconditions** | Admin reviews system metrics and statistics |

**Basic Flow**

| Step | Actor Action | System Response |
| :--- | :--- | :--- |
| 1 | Admin accesses dashboard | |
| 2 | | System displays charts and metrics |
| 3 | Admin analyzes platform usage | |

---

#### UC-M2-ADMIN-06: Handle User Feedback

| Element | Description |
| :--- | :--- |
| **Reference** | UC-M2-ADMIN-06 |
| **Actors** | System Administrator |
| **Goal** | Administrator processes feedback submitted by users |
| **Summary** | Admin reviews user feedback and marks feedback as resolved or responds to users |
| **Trigger** | User submits feedback |
| **Precondition** | User feedback has been submitted |
| **Postconditions** | Feedback is marked as processed or response is sent |

**Basic Flow**

| Step | Actor Action | System Response |
| :--- | :--- | :--- |
| 1 | Admin views feedback list | |
| 2 | Admin reads feedback details | |
| 3 | Admin marks as resolved or responds | System updates feedback status |

---

#### UC-M2-ADMIN-07: Manage Content

| Element | Description |
| :--- | :--- |
| **Reference** | UC-M2-ADMIN-07 |
| **Actors** | System Administrator |
| **Goal** | Administrator manages platform content such as announcements |
| **Summary** | Admin creates, edits, publishes, or deletes content |
| **Trigger** | Admin accesses content management section |
| **Precondition** | Admin has content management permissions |
| **Postconditions** | Content is created, updated, or deleted |

**Basic Flow**

| Step | Actor Action | System Response |
| :--- | :--- | :--- |
| 1 | Admin creates or edits content | |
| 2 | Admin publishes or deletes content | System updates published content |

---

#### UC-M2-ADMIN-08: Role & Permission Management

| Element | Description |
| :--- | :--- |
| **Reference** | UC-M2-ADMIN-08 |
| **Actors** | System Administrator |
| **Goal** | Administrator assigns roles and permissions to users |
| **Summary** | Admin selects a user and assigns appropriate role to update system permissions |
| **Trigger** | Admin accesses role management section |
| **Precondition** | User account exists |
| **Postconditions** | User role and permissions are updated |

**Basic Flow**

| Step | Actor Action | System Response |
| :--- | :--- | :--- |
| 1 | Admin selects user | |
| 2 | Admin assigns role (Doctor/User/Admin) | |
| 3 | | System updates permissions |

---

#### UC-M2-ADMIN-09: Audit Admin Actions

| Element | Description |
| :--- | :--- |
| **Reference** | UC-M2-ADMIN-09 |
| **Actors** | System Administrator, System |
| **Goal** | System records administrator activities for traceability and audit purposes |
| **Summary** | System automatically logs all admin actions; admin can query logs when needed |
| **Trigger** | Admin performs an action in the system |
| **Precondition** | Audit logging is enabled |
| **Postconditions** | Admin action is recorded in audit log |

**Basic Flow**

| Step | Actor Action | System Response |
| :--- | :--- | :--- |
| 1 | Admin performs admin action | |
| 2 | | System logs admin action to audit trail |
| 3 | Admin queries logs when needed | System retrieves and displays audit records |

---

#### UC-M2-ADMIN-10: Notification Management

| Element | Description |
| :--- | :--- |
| **Reference** | UC-M2-ADMIN-10 |
| **Actors** | System Administrator, System |
| **Goal** | Administrator manages system notifications |
| **Summary** | System sends automatic notifications for key events; admin can also send manual notifications when needed |
| **Trigger** | System event occurs or admin initiates notification |
| **Precondition** | Notification system is configured |
| **Postconditions** | Notifications are sent to target users |

**Basic Flow**

| Step | Actor Action | System Response |
| :--- | :--- | :--- |
| 1 | | System sends automatic notifications (e.g., approval result) |
| 2 | Admin initiates manual notification | |
| 3 | | System sends manual notifications to users |

---

## 2 Internal Use Cases - Admin

### 2.1 Actor Table

| Actor | Description |
| :--- | :--- |
| System Administrator | Initiates administrative operations through the admin interface |
| M2 | Admin module that coordinates requests, business rules, and data access |
| V2 | Database module that stores, queries, and updates administrative data |

### 2.2 Use Case Table

| Use Case ID | Use Case Name | Primary Actors | Brief Description |
| :--- | :--- | :--- | :--- |
| IUC-M2-ADMIN-01 | Admin Login / Logout | System Administrator, M2, V2 | M2 validates administrator credentials through V2 and manages session state |
| IUC-M2-ADMIN-02 | Review Doctor Registration | System Administrator, M2, V2 | M2 retrieves pending doctor registration data from V2 and updates approval status |
| IUC-M2-ADMIN-03 | Manage Doctor Accounts | System Administrator, M2, V2 | M2 queries and updates doctor account records stored in V2 |
| IUC-M2-ADMIN-04 | Manage Patient Accounts | System Administrator, M2, V2 | M2 queries and updates patient account records stored in V2 |
| IUC-M2-ADMIN-05 | View Health Data Reports | System Administrator, M2, V2 | M2 aggregates report data from V2 and returns statistics to the dashboard |
| IUC-M2-ADMIN-06 | Handle User Feedback | System Administrator, M2, V2 | M2 stores feedback and response records in V2 and updates processing status |
| IUC-M2-ADMIN-07 | Manage Content | System Administrator, M2, V2 | M2 creates, edits, publishes, and deletes content records in V2 |
| IUC-M2-ADMIN-08 | Role & Permission Management | System Administrator, M2, V2 | M2 reads and updates user role and permission mappings in V2 |
| IUC-M2-ADMIN-09 | Audit Admin Actions | System Administrator, M2, V2 | M2 writes administrator action logs into V2 for traceability |
| IUC-M2-ADMIN-10 | Notification Management | System Administrator, M2, V2 | Administrator specifies notification targets and message content; M2 stores target email information, content, and send records in V2 |

### 2.3 Specific Use Cases

#### IUC-M2-ADMIN-01: Admin Login / Logout

| Element | Description |
| :--- | :--- |
| **Reference** | UC-M2-ADMIN-01 |
| **Actors** | System Administrator, M2, V2 |
| **Goal** | M2 validates administrator credentials through V2 and manages session state |
| **Summary** | The administrator submits login or logout requests. M2 checks credential data in V2, creates or destroys session data, and returns the result |
| **Trigger** | Administrator clicks login or logout in the admin interface |
| **Precondition** | Administrator account exists in V2 |
| **Postconditions** | Session data is created or removed in the system |

**Basic Flow**

| Step | Actor Action | System Response |
| :--- | :--- | :--- |
| 1 | Administrator submits username and password | M2 receives login request |
| 2 | M2 requests credential data from V2 | V2 returns account record |
| 3 | M2 validates credentials | M2 creates session data |
| 4 | Administrator logs out | M2 removes session data from V2 or session store |

**Alternative Flow**

| Occurrence Step | Condition | System Response |
| :--- | :--- | :--- |
| 2 | Account does not exist or password is invalid | M2 returns login failure |

---

#### IUC-M2-ADMIN-02: Review Doctor Registration

| Element | Description |
| :--- | :--- |
| **Reference** | UC-M2-ADMIN-02 |
| **Actors** | System Administrator, M2, V2 |
| **Goal** | M2 retrieves pending doctor registration data from V2 and updates approval status |
| **Summary** | The administrator reviews submitted registration records and license information. M2 reads the application data from V2, stores the review result, and updates the application status |
| **Trigger** | Administrator opens the pending application list |
| **Precondition** | Doctor registration request exists in V2 |
| **Postconditions** | Application status is updated in V2 |

**Basic Flow**

| Step | Actor Action | System Response |
| :--- | :--- | :--- |
| 1 | Administrator views pending applications | M2 requests pending records from V2 |
| 2 | Administrator opens a doctor profile | M2 requests doctor detail data from V2 |
| 3 | Administrator reviews license documents | M2 displays the stored document data |
| 4 | Administrator approves or rejects the application | M2 writes the review result to V2 |
| 5 | | M2 returns the updated status |

**Alternative Flow**

| Occurrence Step | Condition | System Response |
| :--- | :--- | :--- |
| 3 | License data is missing or unclear | M2 marks the application as rejected with reason |

---

#### IUC-M2-ADMIN-03: Manage Doctor Accounts

| Element | Description |
| :--- | :--- |
| **Reference** | UC-M2-ADMIN-03 |
| **Actors** | System Administrator, M2, V2 |
| **Goal** | M2 queries and updates doctor account records stored in V2 |
| **Summary** | The administrator searches doctor records, views account details, and changes account status. M2 reads and updates the corresponding data in V2 |
| **Trigger** | Administrator enters doctor management page |
| **Precondition** | Doctor account exists in V2 |
| **Postconditions** | Doctor account status is updated in V2 |

**Basic Flow**

| Step | Actor Action | System Response |
| :--- | :--- | :--- |
| 1 | Administrator searches doctor list | M2 queries doctor records in V2 |
| 2 | Administrator views account details | M2 returns account details from V2 |
| 3 | Administrator enables, disables, or deletes the account | M2 updates account status in V2 |

---

#### IUC-M2-ADMIN-04: Manage Patient Accounts

| Element | Description |
| :--- | :--- |
| **Reference** | UC-M2-ADMIN-04 |
| **Actors** | System Administrator, M2, V2 |
| **Goal** | M2 queries and updates patient account records stored in V2 |
| **Summary** | The administrator views patient records and manages account status. M2 retrieves user data from V2 and writes status changes back to V2 |
| **Trigger** | Administrator enters patient management page |
| **Precondition** | Patient account exists in V2 |
| **Postconditions** | Patient account status is updated or deleted in V2 |

**Basic Flow**

| Step | Actor Action | System Response |
| :--- | :--- | :--- |
| 1 | Administrator views user list | M2 queries user records in V2 |
| 2 | Administrator inspects user data summary | M2 displays the retrieved data |
| 3 | Administrator disables or deletes the account | M2 updates account status in V2 |

---

#### IUC-M2-ADMIN-05: View Health Data Reports

| Element | Description |
| :--- | :--- |
| **Reference** | UC-M2-ADMIN-05 |
| **Actors** | System Administrator, M2, V2 |
| **Goal** | M2 aggregates report data from V2 and returns statistics to the dashboard |
| **Summary** | The administrator opens the dashboard. M2 reads aggregated data from V2, computes statistics, and displays charts and metrics |
| **Trigger** | Administrator opens the report dashboard |
| **Precondition** | Relevant system data exists in V2 |
| **Postconditions** | Report data is displayed to the administrator |

**Basic Flow**

| Step | Actor Action | System Response |
| :--- | :--- | :--- |
| 1 | Administrator accesses dashboard | M2 requests report data from V2 |
| 2 | | V2 returns stored statistics data |
| 3 | M2 aggregates and formats the data | M2 displays charts and metrics |
| 4 | Administrator analyzes platform usage | |

---

#### IUC-M2-ADMIN-06: Handle User Feedback

| Element | Description |
| :--- | :--- |
| **Reference** | UC-M2-ADMIN-06 |
| **Actors** | System Administrator, M2, V2 |
| **Goal** | M2 stores feedback and response records in V2 and updates processing status |
| **Summary** | The administrator reads submitted feedback and marks it as resolved or replies. M2 stores the feedback state and response content in V2 |
| **Trigger** | User feedback is submitted and appears in the admin list |
| **Precondition** | Feedback record exists in V2 |
| **Postconditions** | Feedback status is updated in V2 |

**Basic Flow**

| Step | Actor Action | System Response |
| :--- | :--- | :--- |
| 1 | Administrator views feedback list | M2 queries feedback records from V2 |
| 2 | Administrator reads feedback details | M2 displays the details |
| 3 | Administrator marks as resolved or responds | M2 updates feedback status and response in V2 |

---

#### IUC-M2-ADMIN-07: Manage Content

| Element | Description |
| :--- | :--- |
| **Reference** | UC-M2-ADMIN-07 |
| **Actors** | System Administrator, M2, V2 |
| **Goal** | M2 creates, edits, publishes, and deletes content records in V2 |
| **Summary** | The administrator manages announcements or other content. M2 writes content data to V2 and updates publish state |
| **Trigger** | Administrator opens content management page |
| **Precondition** | Administrator has content management permission |
| **Postconditions** | Content data is created, updated, published, or deleted in V2 |

**Basic Flow**

| Step | Actor Action | System Response |
| :--- | :--- | :--- |
| 1 | Administrator creates or edits content | M2 stores content data in V2 |
| 2 | Administrator publishes or deletes content | M2 updates publish state in V2 |

---

#### IUC-M2-ADMIN-08: Role & Permission Management

| Element | Description |
| :--- | :--- |
| **Reference** | UC-M2-ADMIN-08 |
| **Actors** | System Administrator, M2, V2 |
| **Goal** | M2 reads and updates user role and permission mappings in V2 |
| **Summary** | The administrator selects a user role configuration. M2 loads the current permissions from V2 and writes the new mapping back to V2 |
| **Trigger** | Administrator opens role management page |
| **Precondition** | User account exists in V2 |
| **Postconditions** | User role and permissions are updated in V2 |

**Basic Flow**

| Step | Actor Action | System Response |
| :--- | :--- | :--- |
| 1 | Administrator selects user | M2 retrieves user data from V2 |
| 2 | Administrator assigns role | M2 updates role mapping in V2 |
| 3 | | M2 updates permission data in V2 |

---

#### IUC-M2-ADMIN-09: Audit Admin Actions

| Element | Description |
| :--- | :--- |
| **Reference** | UC-M2-ADMIN-09 |
| **Actors** | System Administrator, M2, V2 |
| **Goal** | M2 writes administrator action logs into V2 for traceability |
| **Summary** | The system records administrator actions automatically. M2 stores audit records in V2 and allows queries when needed |
| **Trigger** | Administrator performs an action in the system |
| **Precondition** | Audit logging is enabled |
| **Postconditions** | Audit log record is stored in V2 |

**Basic Flow**

| Step | Actor Action | System Response |
| :--- | :--- | :--- |
| 1 | Administrator performs admin action | M2 prepares audit record |
| 2 | | M2 writes audit record to V2 |
| 3 | Administrator queries logs when needed | M2 retrieves and displays audit records from V2 |


