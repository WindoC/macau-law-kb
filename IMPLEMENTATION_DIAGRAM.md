# Implementation Flow Diagram

## Migration Architecture Overview

```mermaid
graph TB
    subgraph "Current State (Old Branch)"
        A1[Next.js App] --> B1[Supabase Client]
        B1 --> C1[Supabase Auth]
        B1 --> D1[Supabase Database]
        B1 --> E1[Supabase RLS]
    end
    
    subgraph "New Clean Implementation"
        A2[Next.js App] --> B2[Direct PostgreSQL 'pg']
        A2 --> C2[OIDC Auth Layer]
        A2 --> D2[JWT Session Management]
        C2 --> E2[Google OIDC]
        C2 --> F2[GitHub OAuth]
        B2 --> G2[Same PostgreSQL Database]
        A2 --> H2[Application Authorization]
    end
    
    G2 -.->|"Same Data"| D1
    
    style A1 fill:#ffcccc
    style A2 fill:#ccffcc
    style G2 fill:#ffffcc
    style D1 fill:#ffffcc
```

## Implementation Flow

```mermaid
flowchart TD
    Start([Start Migration]) --> Remove[Remove Supabase Dependencies]
    Remove --> Install[Install New Dependencies]
    Install --> DB[Setup Database Connection Layer]
    DB --> Auth[Implement OIDC Authentication]
    Auth --> Session[Setup Session Management]
    Session --> Database[Replace Database Functions]
    Database --> API[Create New API Routes]
    API --> Middleware[Setup Authentication Middleware]
    Middleware --> Frontend[Update Frontend Components]
    Frontend --> Test[Testing & Validation]
    Test --> Deploy[Production Deployment]
    Deploy --> Complete([Migration Complete])
    
    Test --> Issues{Issues Found?}
    Issues -->|Yes| Fix[Fix Issues]
    Fix --> Test
    Issues -->|No| Deploy
    
    style Start fill:#e1f5fe
    style Complete fill:#c8e6c9
    style Issues fill:#fff3e0
    style Fix fill:#ffcdd2
```

## Database Migration Strategy

```mermaid
graph LR
    subgraph "Database Schema"
        A[Existing Tables] --> B[Add OIDC Columns]
        B --> C[Create Indexes]
        C --> D[Update Existing Users]
    end
    
    subgraph "Data Preservation"
        E[All Existing Data] --> F[Remains Intact]
        F --> G[Accessible via Direct SQL]
    end
    
    subgraph "Access Pattern"
        H[Supabase Client Calls] --> I[Direct SQL Queries]
        I --> J[Same Database Instance]
    end
    
    style A fill:#e3f2fd
    style E fill:#f3e5f5
    style H fill:#fff8e1
```

## Authentication Flow

```mermaid
sequenceDiagram
    participant U as User
    participant A as Next.js App
    participant O as OIDC Provider
    participant D as Database
    participant S as Session Manager
    
    U->>A: Click Login (Google/GitHub)
    A->>O: Redirect to OIDC Provider
    O->>U: Show Login Form
    U->>O: Enter Credentials
    O->>A: Callback with Auth Code
    A->>O: Exchange Code for Tokens
    O->>A: Return User Info
    A->>D: Find/Create User
    D->>A: Return User Data
    A->>S: Generate JWT Tokens
    S->>A: Set HTTP-Only Cookies
    A->>U: Redirect to Dashboard
```

## API Request Flow

```mermaid
sequenceDiagram
    participant C as Client
    participant M as Middleware
    participant A as API Route
    participant S as Session Manager
    participant D as Database
    
    C->>M: API Request with Cookies
    M->>S: Validate Session
    S->>M: Return Session Data
    M->>A: Forward Request + Session
    A->>D: Execute SQL Query
    D->>A: Return Results
    A->>C: JSON Response
    
    Note over M,S: JWT Token Validation
    Note over A,D: Direct PostgreSQL Connection